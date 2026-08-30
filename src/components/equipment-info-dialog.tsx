import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EquipmentDetails } from "@/components/equipment-detail-dialog";

const getLocalized = (obj: any, field: string, lang: string) => {
  if (!obj) return "";
  if (lang === "ru") return obj[field] || "";
  return obj[`${field}_${lang}`] || obj[field] || "";
};

export function getYoutubeEmbedUrl(url?: string | null) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([\w-]{6,})/i,
    /youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)([\w-]{6,})/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

export function EquipmentInfoDialog({
  open,
  equipment,
  canBook,
  bookDisabledReason,
  onClose,
  onBook,
}: {
  open: boolean;
  equipment: EquipmentDetails | null;
  canBook: boolean;
  bookDisabledReason?: string;
  onClose: () => void;
  onBook: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [index, setIndex] = useState(0);

  const photos = useMemo(() => {
    const list = [
      ...(equipment?.image_url ? [equipment.image_url] : []),
      ...((equipment?.gallery_urls as string[] | null) ?? []),
    ].filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [equipment]);

  useEffect(() => {
    setIndex(0);
  }, [equipment?.id]);

  const embedUrl = getYoutubeEmbedUrl(equipment?.video_url);
  const name = getLocalized(equipment, "name", i18n.language);
  const description = getLocalized(equipment, "description", i18n.language);

  if (!equipment) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-3xl p-0 border-4 border-slate-900 bg-white rounded-none shadow-[12px_12px_0_#0f172a] flex flex-col max-h-[90vh] outline-none [&>button]:hidden">
        <div className="p-6 border-b-4 border-slate-900 bg-blue-600 text-white flex justify-between items-start gap-4">
          <div>
            <DialogTitle className="text-2xl sm:text-3xl font-black uppercase tracking-tighter leading-tight">{name}</DialogTitle>
            <p className="font-bold uppercase tracking-widest text-[10px] mt-2 text-blue-100">
              {equipment.status === "maintenance" ? t("booking.card.statusRepair") : t("booking.card.statusActive")}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 bg-white text-slate-900 border-2 border-slate-900 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0_#0f172a] shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 bg-slate-50">
          {photos.length > 0 && (
            <div className="space-y-3">
              <div className="relative border-4 border-slate-900 bg-slate-900 shadow-[6px_6px_0_#0f172a]">
                <img src={photos[index]} alt={name} className="w-full h-64 sm:h-80 object-cover" />
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white border-2 border-slate-900 shadow-[2px_2px_0_#0f172a]"
                      aria-label="prev"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setIndex((i) => (i + 1) % photos.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white border-2 border-slate-900 shadow-[2px_2px_0_#0f172a]"
                      aria-label="next"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {photos.map((p, i) => (
                    <button
                      key={p + i}
                      onClick={() => setIndex(i)}
                      className={`h-16 w-24 shrink-0 border-2 overflow-hidden ${i === index ? "border-blue-600 shadow-[2px_2px_0_#0f172a]" : "border-slate-300"}`}
                    >
                      <img src={p} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {embedUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-black uppercase tracking-widest text-xs text-slate-900 border-b-2 border-slate-200 pb-2">
                <PlayCircle className="h-4 w-4" /> Видео
              </div>
              <div className="border-4 border-slate-900 shadow-[6px_6px_0_#0f172a] bg-black aspect-video">
                <iframe
                  src={embedUrl}
                  title={name}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {description && (
            <div className="space-y-2">
              <div className="font-black uppercase tracking-widest text-xs text-slate-900 border-b-2 border-slate-200 pb-2">Описание</div>
              <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line">{description}</p>
            </div>
          )}

          {equipment.specs && (
            <div className="space-y-2">
              <div className="font-black uppercase tracking-widest text-xs text-slate-900 border-b-2 border-slate-200 pb-2">Характеристики</div>
              <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line">{equipment.specs}</p>
            </div>
          )}

          <div className="pt-2">
            <Button
              onClick={onBook}
              disabled={!canBook}
              className="w-full h-16 rounded-none text-sm font-black uppercase tracking-widest border-4 border-slate-900 bg-blue-600 hover:bg-blue-700 text-white shadow-[6px_6px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all disabled:bg-slate-300 disabled:border-slate-400 disabled:shadow-none disabled:text-slate-500"
            >
              {canBook ? t("booking.card.selectTime") : bookDisabledReason}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
