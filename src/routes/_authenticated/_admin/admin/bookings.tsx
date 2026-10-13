import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AlertCircle, Calendar, CheckSquare, Clock, Phone } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/_admin/admin/bookings")({
  component: AdminBookingsPage,
});

type Profile = { name: string; contact_phone?: string; photo_url?: string | null };
type ZoneBooking = {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: "pending" | "active" | "cancelled" | "completed";
  topic: string;
  event_format: string | null;
  participant_count: number;
  lab_zones: { name: string } | null;
  profiles: Profile | Profile[] | null;
};

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const range = (s: string, e: string) => `${format(new Date(s), "d MMMM", { locale: ru })}, ${format(new Date(s), "HH:mm")} — ${format(new Date(e), "HH:mm")}`;

function AdminBookingsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<"open" | "history">("open");

  const { data: zoneBookings = [], isLoading } = useQuery({
    queryKey: ["admin-zone-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zone_bookings")
        .select("*, lab_zones(name), profiles!zone_bookings_user_id_fkey(name, contact_phone, photo_url)")
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as unknown as ZoneBooking[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ booking, status }: { booking: ZoneBooking; status: ZoneBooking["status"] }) => {
      const { error } = await supabase.from("zone_bookings").update({ status }).eq("id", booking.id);
      if (error) throw error;
      const zoneName = booking.lab_zones?.name || "зона воркшопов";
      const messages = {
        active: ["✅ Заявка подтверждена", `Ваша заявка на «${zoneName}» одобрена.`],
        cancelled: ["❌ Заявка отклонена", `Заявка на «${zoneName}» была отклонена или отменена.`],
        completed: ["👍 Мероприятие завершено", `Заявка на «${zoneName}» отмечена завершённой.`],
        pending: ["Заявка ожидает", `Заявка на «${zoneName}» ожидает решения.`],
      } as const;
      const [title, message] = messages[status];
      await supabase.from("notifications").insert({ user_id: booking.user_id, title, message, type: "zone_booking" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-zone-bookings"] }); toast.success("Статус заявки обновлён"); },
    onError: (error: Error) => toast.error(error.message),
  });

  const now = new Date();
  const stats = useMemo(() => ({
    pending: zoneBookings.filter((b) => b.status === "pending").length,
    today: zoneBookings.filter((b) => b.status === "active" && sameDay(new Date(b.start_time), now)).length,
    upcoming: zoneBookings.filter((b) => b.status === "active" && new Date(b.start_time) > now).length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [zoneBookings]);

  const list = view === "open"
    ? zoneBookings.filter((b) => b.status === "pending" || b.status === "active").sort((a, b) => (a.status === b.status ? 0 : a.status === "pending" ? -1 : 1))
    : [...zoneBookings].filter((b) => b.status === "cancelled" || b.status === "completed").reverse();

  const statCard = (label: string, value: number, Icon: typeof Clock, accent = false) => (
    <div className={`flex flex-col justify-between border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] ${accent ? "bg-blue-600 text-white" : "bg-white"}`}>
      <div className="mb-2 flex items-start justify-between"><h4 className="text-[10px] font-black uppercase tracking-widest md:text-xs">{label}</h4><Icon className="h-5 w-5" /></div>
      <div className="text-4xl font-black">{value}</div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="border-b-4 border-slate-900 pb-6">
        <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Бронирования</h1>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">Заявки на воркшоп-зону. Расписание и часы работы — во вкладке «Карта лаборатории».</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        {statCard("Ждут решения", stats.pending, AlertCircle)}
        {statCard("Сегодня", stats.today, Calendar, true)}
        {statCard("Предстоящие", stats.upcoming, CheckSquare)}
      </div>

      <div className="border-4 border-slate-900 bg-white shadow-[6px_6px_0_#0f172a]">
        <div className="flex flex-col gap-3 border-b-4 border-slate-900 bg-amber-400 p-4 sm:flex-row sm:items-center sm:justify-between md:p-6">
          <h2 className="text-xl font-black uppercase tracking-tight">Воркшопы и курсы</h2>
          <div className="flex gap-2">
            {(["open", "history"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} className={`border-2 border-slate-900 px-3 py-1.5 text-xs font-black uppercase ${view === v ? "bg-slate-900 text-white" : "bg-white"}`}>{v === "open" ? "Актуальные" : "История"}</button>
            ))}
          </div>
        </div>
        <div className="space-y-4 p-4 md:p-6">
          {isLoading ? <Skeleton className="h-24 w-full bg-slate-200" /> : list.length === 0 ? (
            <p className="py-6 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Нет заявок</p>
          ) : list.map((booking) => {
            const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
            const badge = { pending: ["ОЖИДАЕТ", "bg-amber-400"], active: ["ОДОБРЕНО", "bg-emerald-500"], completed: ["ЗАВЕРШЕНО", "bg-slate-200"], cancelled: ["ОТКЛОНЕНО", "bg-red-200"] }[booking.status];
            return (
              <div key={booking.id} className="flex flex-col justify-between gap-4 border-2 border-slate-900 bg-slate-50 p-4 lg:flex-row lg:items-center">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-lg font-black uppercase tracking-tight">{booking.topic}</span><Badge className={`border-2 border-slate-900 text-slate-900 ${badge[1]}`}>{badge[0]}</Badge></div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-600">
                    <span>{booking.lab_zones?.name}</span>
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{range(booking.start_time, booking.end_time)}</span>
                    <span className="flex items-center gap-1"><UserAvatar name={profile?.name} url={profile?.photo_url} className="h-6 w-6" />{profile?.name}</span>
                    {profile?.contact_phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{profile.contact_phone}</span>}
                    <span>{booking.participant_count} участников</span>
                  </div>
                  {booking.event_format && <p className="max-w-2xl text-sm text-slate-600">{booking.event_format}</p>}
                </div>
                {view === "open" && (
                  <div className="flex flex-wrap gap-2">
                    {booking.status === "pending" && <Button onClick={() => update.mutate({ booking, status: "active" })} className="border-2 border-slate-900 bg-emerald-500 font-black uppercase text-slate-900 hover:bg-emerald-600">Одобрить</Button>}
                    <Button variant="outline" onClick={() => update.mutate({ booking, status: booking.status === "active" ? "completed" : "cancelled" })} className="border-2 border-slate-900 font-black uppercase">{booking.status === "active" ? "Завершить" : "Отклонить"}</Button>
                    {booking.status === "active" && <Button variant="ghost" onClick={() => update.mutate({ booking, status: "cancelled" })} className="font-black uppercase text-red-600">Отменить</Button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
