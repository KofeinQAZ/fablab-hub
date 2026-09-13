import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/image-upload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

type Lang = "ru" | "kz" | "en";

export type ClubRow = {
  id: string;
  title: string;
  title_kz: string | null;
  title_en: string | null;
  description: string;
  description_kz: string | null;
  description_en: string | null;
  image_url: string | null;
  tags: string[];
  meeting_schedule: string | null;
  is_recruiting: boolean;
} | null;

export function ClubFormDialog({
  open,
  onOpenChange,
  club,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  club?: ClubRow;
  userId: string;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Lang>("ru");
  const [title, setTitle] = useState({ ru: "", kz: "", en: "" });
  const [desc, setDesc] = useState({ ru: "", kz: "", en: "" });
  const [image, setImage] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const [schedule, setSchedule] = useState("");
  const [recruiting, setRecruiting] = useState(true);

  useEffect(() => {
    if (!open) return;
    setTab("ru");
    setTitle({ ru: club?.title ?? "", kz: club?.title_kz ?? "", en: club?.title_en ?? "" });
    setDesc({ ru: club?.description ?? "", kz: club?.description_kz ?? "", en: club?.description_en ?? "" });
    setImage(club?.image_url ?? null);
    setTags((club?.tags ?? []).join(", "));
    setSchedule(club?.meeting_schedule ?? "");
    setRecruiting(club?.is_recruiting ?? true);
  }, [open, club]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.ru.trim(),
        title_kz: title.kz.trim() || null,
        title_en: title.en.trim() || null,
        description: desc.ru.trim(),
        description_kz: desc.kz.trim() || null,
        description_en: desc.en.trim() || null,
        image_url: image,
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
        meeting_schedule: schedule.trim() || null,
        is_recruiting: recruiting,
      };
      if (club?.id) {
        const { error } = await supabase.from("clubs").update(payload).eq("id", club.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clubs").insert({ ...payload, author_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(club?.id ? t("clubs.form.updated", "Клуб обновлён") : t("clubs.form.sent", "Клуб отправлен на модерацию"));
      qc.invalidateQueries({ queryKey: ["clubs"] });
      qc.invalidateQueries({ queryKey: ["club"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const langBtn = (l: Lang) => (
    <button
      key={l}
      onClick={() => setTab(l)}
      className={`flex-1 py-2 border-2 border-slate-900 font-black uppercase tracking-widest text-[10px] transition-all ${
        tab === l ? "bg-slate-900 text-white" : "bg-white text-slate-900"
      }`}
    >
      {l}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg p-0 border-4 border-slate-900 bg-white rounded-none shadow-[12px_12px_0_#0f172a] max-h-[88vh] overflow-y-auto">
        <div className="bg-slate-900 p-5 flex justify-between items-start border-b-4 border-slate-900 text-white sticky top-0 z-10">
          <DialogTitle className="text-xl font-black uppercase tracking-tighter">
            {club?.id ? t("clubs.form.editTitle", "Редактировать клуб") : t("clubs.form.createTitle", "Создать клуб")}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 bg-white text-slate-900 border-2 border-slate-900 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0_#0f172a]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex gap-2">{(["ru", "kz", "en"] as Lang[]).map(langBtn)}</div>

          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("clubs.form.nameLabel", "Название клуба")} {tab === "ru" && "*"}
            </Label>
            <Input
              value={title[tab]}
              onChange={(e) => setTitle({ ...title, [tab]: e.target.value })}
              className="h-12 border-2 border-slate-900 rounded-none bg-white font-bold focus-visible:ring-0 focus-visible:border-blue-600"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("clubs.form.descLabel", "Описание клуба")}
            </Label>
            <Textarea
              value={desc[tab]}
              onChange={(e) => setDesc({ ...desc, [tab]: e.target.value })}
              className="h-28 border-2 border-slate-900 rounded-none bg-slate-50 font-medium focus-visible:ring-0 focus-visible:border-blue-600 resize-none"
            />
          </div>

          <ImageUpload
            label={t("clubs.form.coverLabel", "Обложка клуба")}
            bucket="club-covers"
            folder={userId}
            value={image}
            onChange={setImage}
          />

          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("clubs.form.tagsLabel", "Направления (через запятую)")}
            </Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t("clubs.form.tagsPlaceholder", "робототехника, дроны")}
              className="h-12 border-2 border-slate-900 rounded-none bg-white font-bold focus-visible:ring-0 focus-visible:border-blue-600"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("clubs.form.scheduleLabel", "Расписание встреч (необязательно)")}
            </Label>
            <Input
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder={t("clubs.form.schedulePlaceholder", "Каждый вторник, 18:00")}
              className="h-12 border-2 border-slate-900 rounded-none bg-white font-bold focus-visible:ring-0 focus-visible:border-blue-600"
            />
          </div>

          <label className="flex items-center gap-3 p-3 border-2 border-slate-900 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={recruiting}
              onChange={(e) => setRecruiting(e.target.checked)}
              className="h-5 w-5 accent-blue-600"
            />
            <span className="font-black uppercase tracking-widest text-[11px] text-slate-900">
              {t("clubs.form.recruiting", "Набираем участников")}
            </span>
          </label>

          <Button
            onClick={() => save.mutate()}
            disabled={!title.ru.trim() || save.isPending}
            className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-slate-900 border-2 border-slate-900 font-black text-sm uppercase tracking-widest rounded-none shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all disabled:bg-slate-300 disabled:text-slate-500 disabled:border-slate-400 disabled:shadow-none"
          >
            {save.isPending ? t("clubs.form.saving", "Сохраняем...") : t("clubs.form.saveBtn", "Сохранить")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
