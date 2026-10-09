import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ExternalLink, Loader2, Minus, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LabZone } from "@/components/lab-map";

const START_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const DURATIONS = [1, 2, 3, 4, 6, 8];
const MINUTE = 60_000;

const toIsoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const fmtHour = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function LabZoneDialog({ zone, userId, onClose }: { zone: LabZone | null; userId: string | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [photo, setPhoto] = useState(0);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(2);
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("");
  const [participants, setParticipants] = useState("10");
  const [busy, setBusy] = useState<{ start: number; end: number }[]>([]);
  const [busyLoading, setBusyLoading] = useState(false);

  useEffect(() => { setPhoto(0); }, [zone?.id]);
  const localized = (field: "name" | "description") => {
    if (!zone) return "";
    const language = i18n.language.split("-")[0];
    const key = language === "ru" ? field : `${field}_${language}` as keyof LabZone;
    return String(zone[key] || zone[field] || "");
  };
  const photos = useMemo(() => zone ? Array.from(new Set([zone.image_url, ...zone.gallery_urls].filter(Boolean))) as string[] : [], [zone]);

  // Busy intervals for the selected day, as local minutes-of-day clipped to that day
  useEffect(() => {
    setBusy([]);
    if (!zone || !date) return;
    let cancelled = false;
    setBusyLoading(true);
    supabase.rpc("get_zone_busy_slots", { p_zone_id: zone.id, p_day: date }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setBusy([]);
      } else {
        const dayStart = new Date(`${date}T00:00:00`).getTime();
        const dayEnd = dayStart + 24 * 60 * MINUTE;
        const ivs = (data ?? []).map((b: { start_time: string; end_time: string }) => {
          const cs = Math.max(new Date(b.start_time).getTime(), dayStart);
          const ce = Math.min(new Date(b.end_time).getTime(), dayEnd);
          return { start: (cs - dayStart) / MINUTE, end: (ce - dayStart) / MINUTE };
        }).filter((iv) => iv.end > iv.start);
        setBusy(ivs);
      }
      setBusyLoading(false);
    });
    return () => { cancelled = true; };
  }, [zone?.id, date]);

  const now = new Date();
  const todayIso = toIsoDate(now);
  const tomorrowIso = toIsoDate(new Date(now.getTime() + 24 * 60 * MINUTE));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const hasConflict = (startMin: number, endMin: number) =>
    busy.some((b) => startMin < b.end && endMin > b.start);

  const slotDisabled = (h: number) => {
    if (date === todayIso && h * 60 <= nowMinutes) return true;
    return hasConflict(h * 60, h * 60 + duration * 60);
  };
  const durationDisabled = (d: number) => {
    if (!time) return false;
    const start = Number(time) * 60;
    return hasConflict(start, start + d * 60) || start + d * 60 > 24 * 60;
  };

  // Drop a selected time that became invalid (busy slot appeared or duration grew)
  useEffect(() => {
    if (!time) return;
    const start = Number(time) * 60;
    if (date === todayIso && start <= nowMinutes) { setTime(""); return; }
    if (hasConflict(start, start + duration * 60) || start + duration * 60 > 24 * 60) setTime("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, busy, date]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!zone || !userId || !date || !time || topic.trim().length < 3) throw new Error(t("booking.map.form.required"));
      const start = new Date(`${date}T${time.padStart(2, "0")}:00`);
      const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
      const { error } = await supabase.from("zone_bookings").insert({
        zone_id: zone.id, user_id: userId, start_time: start.toISOString(), end_time: end.toISOString(),
        topic: topic.trim(), event_format: format.trim() || null, participant_count: Number(participants) || 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("booking.map.form.success"));
      qc.invalidateQueries({ queryKey: ["my-zone-bookings"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!zone) return null;
  const isBookable = zone.action_type === "bookable";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-none border-4 border-foreground bg-background p-0 shadow-[8px_8px_0_var(--foreground)]">
        <div className="border-b-4 border-foreground bg-primary p-5 pr-14 text-primary-foreground sm:p-7 sm:pr-16">
          <p className="mb-2 text-xs font-black uppercase tracking-widest">{isBookable ? t("booking.map.bookable") : t("booking.map.zone")}</p>
          <DialogTitle className="text-2xl font-black uppercase leading-tight tracking-normal sm:text-4xl">{localized("name")}</DialogTitle>
          <DialogDescription className="sr-only">{localized("description")}</DialogDescription>
        </div>
        <div className="space-y-6 p-4 sm:p-7">
          {photos.length > 0 && (
            <div className="relative aspect-video overflow-hidden border-4 border-foreground bg-muted">
              <img src={photos[photo]} alt={localized("name")} className="h-full w-full object-cover" />
              {photos.length > 1 && <>
                <Button type="button" variant="outline" size="icon" aria-label={t("booking.map.previousPhoto")} onClick={() => setPhoto((photo - 1 + photos.length) % photos.length)} className="absolute left-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-none border-2"><ChevronLeft /></Button>
                <Button type="button" variant="outline" size="icon" aria-label={t("booking.map.nextPhoto")} onClick={() => setPhoto((photo + 1) % photos.length)} className="absolute right-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-none border-2"><ChevronRight /></Button>
              </>}
            </div>
          )}
          <p className="whitespace-pre-line text-base font-medium leading-relaxed text-muted-foreground">{localized("description")}</p>

          {zone.action_type === "external" && zone.external_url && (
            <Button asChild className="h-12 w-full rounded-none border-2 border-foreground font-black uppercase tracking-widest shadow-[4px_4px_0_var(--foreground)]">
              <a href={zone.external_url} target="_blank" rel="noreferrer">{t("booking.map.openSite")} <ExternalLink className="ml-2 h-4 w-4" /></a>
            </Button>
          )}

          {isBookable && (
            <div className="space-y-5 border-t-4 border-foreground pt-6">
              <div>
                <h3 className="text-xl font-black uppercase tracking-normal">{t("booking.map.form.title")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t("booking.map.form.subtitle")}</p>
              </div>
              {!zone.booking_enabled ? (
                <div className="border-2 border-destructive bg-destructive/10 p-4 font-bold">{t("booking.map.form.disabled")}</div>
              ) : (
                <div className="space-y-5">
                  {/* Date: quick chips + native picker */}
                  <div className="space-y-2">
                    <Label htmlFor="zone-date" className="text-sm font-black uppercase tracking-wide">{t("booking.map.form.date")}</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" onClick={() => { setDate(todayIso); setTime(""); }} variant={date === todayIso ? "default" : "outline"} className="h-11 rounded-none border-2 border-foreground px-4 font-bold">{t("booking.map.form.today")}</Button>
                      <Button type="button" onClick={() => { setDate(tomorrowIso); setTime(""); }} variant={date === tomorrowIso ? "default" : "outline"} className="h-11 rounded-none border-2 border-foreground px-4 font-bold">{t("booking.map.form.tomorrow")}</Button>
                      <div className="relative flex-1 sm:flex-none">
                        <CalendarDays className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input id="zone-date" type="date" min={todayIso} value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} className="h-11 w-full rounded-none border-2 pl-9 sm:w-44" />
                      </div>
                    </div>
                  </div>

                  {/* Busy hours for the selected day */}
                  {date && (
                    <div className="border-2 border-foreground/15 bg-muted/50 p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide">
                        <Clock className="h-4 w-4" />{t("booking.map.form.busyTitle")}
                      </div>
                      {busyLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />…</div>
                      ) : busy.length === 0 ? (
                        <p className="text-sm font-bold text-primary">{t("booking.map.form.busyFree")}</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {busy.map((iv, i) => (
                            <span key={i} className="rounded-none border-2 border-destructive bg-destructive/10 px-2.5 py-1 text-sm font-bold text-destructive line-through">
                              {fmtHour(iv.start)} – {fmtHour(iv.end)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Start time slots */}
                  {date && (
                    <div className="space-y-2">
                      <Label className="text-sm font-black uppercase tracking-wide">{t("booking.map.form.slotsLabel")}</Label>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                        {START_HOURS.map((h) => {
                          const disabled = slotDisabled(h);
                          const value = String(h).padStart(2, "0");
                          return (
                            <button key={h} type="button" disabled={disabled} onClick={() => setTime(value)}
                              className={`h-11 rounded-none border-2 border-foreground text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:border-foreground/20 disabled:bg-muted disabled:text-muted-foreground disabled:line-through ${time === value ? "bg-primary text-primary-foreground" : "bg-background hover:bg-primary/10"}`}>
                              {value}:00
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Duration chips */}
                  <div className="space-y-2">
                    <Label className="text-sm font-black uppercase tracking-wide">{t("booking.map.form.duration")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {DURATIONS.map((d) => (
                        <button key={d} type="button" disabled={durationDisabled(d)} onClick={() => setDuration(d)}
                          className={`h-11 rounded-none border-2 border-foreground px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:border-foreground/20 disabled:bg-muted disabled:text-muted-foreground disabled:line-through ${duration === d ? "bg-primary text-primary-foreground" : "bg-background hover:bg-primary/10"}`}>
                          {d} ч
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected interval summary */}
                  {date && time && (
                    <div className="flex items-center gap-2 border-2 border-primary bg-primary/10 p-3 text-base font-black uppercase tracking-wide text-primary">
                      <Clock className="h-5 w-5 shrink-0" />
                      <span>{fmtHour(Number(time) * 60)} – {fmtHour(Number(time) * 60 + duration * 60)}</span>
                    </div>
                  )}

                  {/* Participants stepper */}
                  <div className="space-y-2">
                    <Label htmlFor="zone-participants" className="text-sm font-black uppercase tracking-wide">{t("booking.map.form.participants")}</Label>
                    <div className="flex items-stretch gap-2">
                      <Button type="button" variant="outline" size="icon" aria-label="-" onClick={() => setParticipants((p) => String(Math.max(1, Number(p) - 1)))} className="h-12 shrink-0 rounded-none border-2"><Minus className="h-4 w-4" /></Button>
                      <div className="relative flex-1">
                        <Users className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                        <Input id="zone-participants" type="number" min="1" max="100" value={participants} onChange={(e) => setParticipants(e.target.value)} className="h-12 rounded-none border-2 pl-10 text-center" />
                      </div>
                      <Button type="button" variant="outline" size="icon" aria-label="+" onClick={() => setParticipants((p) => String(Math.min(100, Number(p) + 1)))} className="h-12 shrink-0 rounded-none border-2"><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  {/* Topic & format */}
                  <div className="space-y-2">
                    <Label htmlFor="zone-topic" className="text-sm font-black uppercase tracking-wide">{t("booking.map.form.topic")}</Label>
                    <Input id="zone-topic" value={topic} maxLength={160} onChange={(e) => setTopic(e.target.value)} className="h-12 rounded-none border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zone-format" className="text-sm font-black uppercase tracking-wide">{t("booking.map.form.format")}</Label>
                    <Textarea id="zone-format" value={format} maxLength={500} onChange={(e) => setFormat(e.target.value)} className="min-h-24 rounded-none border-2" />
                  </div>

                  <Button type="button" onClick={() => submit.mutate()} disabled={submit.isPending || !userId} className="h-14 w-full rounded-none border-2 border-foreground font-black uppercase tracking-widest shadow-[4px_4px_0_var(--foreground)]">
                    {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("booking.map.form.submit")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
