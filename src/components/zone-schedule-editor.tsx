import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DAY_SHORT, WEEK_DAYS, clock5, eventsOn, isoDate, type DayHours, type ZoneEvent } from "@/lib/zone-schedule";

const days = DAY_SHORT.ru;
const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

export function WeeklyHoursEditor({ value, onChange }: { value: DayHours[]; onChange: (v: DayHours[]) => void }) {
  const set = (day: number, patch: Partial<DayHours> | null) => {
    const rest = value.filter((h) => h.day !== day);
    if (patch === null) return onChange(rest);
    const cur = value.find((h) => h.day === day) ?? { day, start: "09:00", end: "21:00" };
    onChange([...rest, { ...cur, ...patch }].sort((a, b) => a.day - b.day));
  };
  return (
    <div className="space-y-2">
      <Label className="font-black uppercase">Часы работы</Label>
      <div className="divide-y-2 divide-foreground/10 border-2 border-foreground">
        {WEEK_DAYS.map((d) => {
          const h = value.find((x) => x.day === d);
          return (
            <div key={d} className="flex flex-wrap items-center gap-3 p-2.5">
              <span className="w-8 font-black uppercase">{days[d]}</span>
              <Switch checked={!!h} onCheckedChange={(on) => set(d, on ? {} : null)} aria-label={`Открыто: ${days[d]}`} />
              {h ? (
                <div className="flex items-center gap-2">
                  <Input type="time" value={h.start} onChange={(e) => set(d, { start: e.target.value })} className="h-10 w-28 rounded-none border-2" />
                  <span>–</span>
                  <Input type="time" value={h.end} onChange={(e) => set(d, { end: e.target.value })} className="h-10 w-28 rounded-none border-2" />
                </div>
              ) : <span className="text-sm text-muted-foreground">Закрыто</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const emptyEvent = { title: "", kind: "event", is_recurring: false, event_date: "", day_of_week: 1, start_clock: "10:00", end_clock: "12:00", repeat_until: "" };

export function ZoneEventsCalendar({ zoneId }: { zoneId: string }) {
  const qc = useQueryClient();
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(isoDate(today));
  const [form, setForm] = useState({ ...emptyEvent, event_date: isoDate(today) });

  const { data: events = [] } = useQuery({
    queryKey: ["zone-events", zoneId],
    queryFn: async () => {
      const { data, error } = await supabase.from("zone_events").select("*").eq("zone_id", zoneId);
      if (error) throw error;
      return data as ZoneEvent[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["zone-events", zoneId] });

  const add = useMutation({
    mutationFn: async () => {
      if (form.title.trim().length < 2) throw new Error("Укажите название");
      const { error } = await supabase.from("zone_events").insert({
        zone_id: zoneId, title: form.title.trim(), kind: form.kind, is_recurring: form.is_recurring,
        event_date: form.event_date || null, day_of_week: form.is_recurring ? form.day_of_week : null,
        start_clock: form.start_clock, end_clock: form.end_clock,
        repeat_until: form.is_recurring && form.repeat_until ? form.repeat_until : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Добавлено в расписание"); setForm({ ...emptyEvent, event_date: selected }); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("zone_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Удалено"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cells = useMemo(() => {
    const offset = (month.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => isoDate(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  }, [month]);
  const dayList = eventsOn(events, selected);
  const pick = (d: string) => { setSelected(d); setForm((f) => ({ ...f, event_date: d, day_of_week: new Date(`${d}T00:00:00`).getDay() })); };

  return (
    <div className="space-y-4">
      <Label className="font-black uppercase">Календарь мероприятий и занятий</Label>
      <div className="border-2 border-foreground">
        <div className="flex items-center justify-between border-b-2 border-foreground bg-muted p-2">
          <Button type="button" size="icon" variant="ghost" aria-label="Предыдущий месяц" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft /></Button>
          <span className="font-black uppercase">{MONTHS[month.getMonth()]} {month.getFullYear()}</span>
          <Button type="button" size="icon" variant="ghost" aria-label="Следующий месяц" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight /></Button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-black uppercase">
          {WEEK_DAYS.map((d) => <div key={d} className="p-1.5 text-muted-foreground">{days[d]}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const n = eventsOn(events, d).length;
            return (
              <button key={d} type="button" onClick={() => pick(d)}
                className={`relative h-11 border-t border-foreground/10 text-sm font-bold ${d === selected ? "bg-primary text-primary-foreground" : d === isoDate(today) ? "bg-secondary" : "hover:bg-primary/10"}`}>
                {Number(d.slice(8))}
                {n > 0 && <span className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${d === selected ? "bg-primary-foreground" : "bg-primary"}`} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-black uppercase">{new Date(`${selected}T00:00:00`).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</p>
        {dayList.length === 0 ? <p className="text-sm text-muted-foreground">Нет мероприятий</p> : dayList.map((e) => (
          <div key={e.id} className="flex items-center gap-3 border-2 border-foreground p-2.5">
            <span className="font-black">{clock5(e.start_clock)}–{clock5(e.end_clock)}</span>
            <span className="min-w-0 flex-1 truncate">{e.title}</span>
            <span className="border border-foreground px-1.5 text-[10px] font-black uppercase">{e.kind === "lesson" ? "Урок" : "Событие"}</span>
            {e.is_recurring && <Repeat className="h-4 w-4 text-primary" aria-label="Еженедельно" />}
            <Button type="button" size="icon" variant="ghost" aria-label="Удалить" onClick={() => remove.mutate(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 border-2 border-dashed border-foreground p-3">
        <p className="text-sm font-black uppercase">Добавить</p>
        <Input placeholder="Название (например, Курс Arduino)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11 rounded-none border-2" />
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="h-11 rounded-none border-2 border-input bg-background px-3">
            <option value="event">Мероприятие</option><option value="lesson">Урок / курс</option>
          </select>
          <label className="flex h-11 items-center justify-between gap-3 border-2 border-input px-3 text-sm font-bold">Каждую неделю<Switch checked={form.is_recurring} onCheckedChange={(is_recurring) => setForm({ ...form, is_recurring })} /></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {form.is_recurring ? (
            <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })} className="h-11 rounded-none border-2 border-input bg-background px-3">
              {WEEK_DAYS.map((d) => <option key={d} value={d}>{["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"][d]}</option>)}
            </select>
          ) : (
            <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="h-11 rounded-none border-2" />
          )}
          <div className="flex items-center gap-2">
            <Input type="time" value={form.start_clock} onChange={(e) => setForm({ ...form, start_clock: e.target.value })} className="h-11 rounded-none border-2" />
            <span>–</span>
            <Input type="time" value={form.end_clock} onChange={(e) => setForm({ ...form, end_clock: e.target.value })} className="h-11 rounded-none border-2" />
          </div>
        </div>
        {form.is_recurring && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label className="text-xs">Начиная с</Label><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="h-11 rounded-none border-2" /></div>
            <div className="space-y-1"><Label className="text-xs">До (необязательно)</Label><Input type="date" value={form.repeat_until} onChange={(e) => setForm({ ...form, repeat_until: e.target.value })} className="h-11 rounded-none border-2" /></div>
          </div>
        )}
        <Button type="button" onClick={() => add.mutate()} disabled={add.isPending} className="h-11 w-full rounded-none border-2 border-foreground font-black uppercase"><Plus className="mr-2 h-4 w-4" />Добавить в расписание</Button>
      </div>
    </div>
  );
}
