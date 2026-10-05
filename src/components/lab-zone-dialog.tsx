import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ExternalLink, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LabZone } from "@/components/lab-map";

export function LabZoneDialog({ zone, userId, onClose }: { zone: LabZone | null; userId: string | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [photo, setPhoto] = useState(0);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("2");
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("");
  const [participants, setParticipants] = useState("10");

  useEffect(() => { setPhoto(0); }, [zone?.id]);
  const localized = (field: "name" | "description") => {
    if (!zone) return "";
    const key = i18n.language === "ru" ? field : `${field}_${i18n.language}` as keyof LabZone;
    return String(zone[key] || zone[field] || "");
  };
  const photos = useMemo(() => zone ? Array.from(new Set([zone.image_url, ...zone.gallery_urls].filter(Boolean))) as string[] : [], [zone]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!zone || !userId || !date || !time || topic.trim().length < 3) throw new Error(t("booking.map.form.required"));
      const start = new Date(`${date}T${time}`);
      const end = new Date(start.getTime() + Number(duration) * 60 * 60 * 1000);
      const { error } = await supabase.from("zone_bookings").insert({
        zone_id: zone.id, user_id: userId, start_time: start.toISOString(), end_time: end.toISOString(),
        topic: topic.trim(), event_format: format.trim() || null, participant_count: Number(participants),
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="zone-date">{t("booking.map.form.date")}</Label><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input id="zone-date" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-none border-2 pl-10" /></div></div>
                  <div className="space-y-2"><Label htmlFor="zone-time">{t("booking.map.form.time")}</Label><div className="relative"><Clock className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input id="zone-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 rounded-none border-2 pl-10" /></div></div>
                  <div className="space-y-2"><Label htmlFor="zone-duration">{t("booking.map.form.duration")}</Label><select id="zone-duration" value={duration} onChange={(e) => setDuration(e.target.value)} className="h-12 w-full rounded-none border-2 border-input bg-background px-3"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="6">6</option><option value="8">8</option></select></div>
                  <div className="space-y-2"><Label htmlFor="zone-participants">{t("booking.map.form.participants")}</Label><div className="relative"><Users className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input id="zone-participants" type="number" min="1" max="100" value={participants} onChange={(e) => setParticipants(e.target.value)} className="h-12 rounded-none border-2 pl-10" /></div></div>
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="zone-topic">{t("booking.map.form.topic")}</Label><Input id="zone-topic" value={topic} maxLength={160} onChange={(e) => setTopic(e.target.value)} className="h-12 rounded-none border-2" /></div>
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="zone-format">{t("booking.map.form.format")}</Label><Textarea id="zone-format" value={format} maxLength={500} onChange={(e) => setFormat(e.target.value)} className="min-h-24 rounded-none border-2" /></div>
                  <Button type="button" onClick={() => submit.mutate()} disabled={submit.isPending || !userId} className="h-14 rounded-none border-2 border-foreground font-black uppercase tracking-widest shadow-[4px_4px_0_var(--foreground)] sm:col-span-2">
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