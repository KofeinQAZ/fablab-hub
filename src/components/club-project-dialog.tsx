import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload, useUploadFolder } from "@/components/image-upload";

type Lang = "ru" | "kz" | "en";

export function ClubProjectDialog({ open, onOpenChange, clubId, userId, isAdmin }: {
  open: boolean; onOpenChange: (v: boolean) => void; clubId: string; userId: string; isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const folder = useUploadFolder();
  const [lang, setLang] = useState<Lang>("ru");
  const [title, setTitle] = useState({ ru: "", kz: "", en: "" });
  const [desc, setDesc] = useState({ ru: "", kz: "", en: "" });
  const [image, setImage] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [roles, setRoles] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (title.ru.trim().length < 2 || desc.ru.trim().length < 5) throw new Error("Заполните название и описание (RU)");
      const { data, error } = await supabase.from("projects").insert({
        club_id: clubId, author_id: userId,
        title: title.ru.trim(), title_kz: title.kz.trim() || null, title_en: title.en.trim() || null,
        description: desc.ru.trim(), description_kz: desc.kz.trim() || null, description_en: desc.en.trim() || null,
        image_url: image, is_looking_for_team: looking,
        looking_for_roles: looking ? roles.split(",").map((r) => r.trim()).filter(Boolean) : [],
      }).select("id").single();
      if (error) throw error;
      if (isAdmin && data) {
        const { error: aErr } = await supabase.from("projects").update({ is_approved: true, is_rejected: false }).eq("id", data.id);
        if (aErr) throw aErr;
      }
    },
    onSuccess: () => {
      toast.success(isAdmin ? "Проект опубликован в клубе" : "Проект отправлен на модерацию");
      qc.invalidateQueries({ queryKey: ["club"] });
      qc.invalidateQueries({ queryKey: ["admin-all-projects"] });
      setTitle({ ru: "", kz: "", en: "" }); setDesc({ ru: "", kz: "", en: "" }); setImage(null); setLooking(false); setRoles("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto rounded-none border-4 border-slate-900 p-0 shadow-[8px_8px_0_#0f172a]">
        <div className="border-b-4 border-slate-900 bg-blue-600 p-5 pr-14 text-white">
          <DialogTitle className="text-2xl font-black uppercase">Новый проект клуба</DialogTitle>
          <DialogDescription className="text-blue-100">{isAdmin ? "Публикуется сразу" : "После проверки администратором появится на странице клуба"}</DialogDescription>
        </div>
        <div className="space-y-5 p-5">
          <div className="flex gap-2">
            {(["ru", "kz", "en"] as Lang[]).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={`flex-1 border-2 border-slate-900 py-2 text-xs font-black uppercase ${lang === l ? "bg-slate-900 text-white" : "bg-white"}`}>{l}</button>
            ))}
          </div>
          <div className="space-y-2"><Label>Название ({lang.toUpperCase()})</Label><Input value={title[lang]} onChange={(e) => setTitle({ ...title, [lang]: e.target.value })} className="h-12 rounded-none border-2" /></div>
          <div className="space-y-2"><Label>Описание ({lang.toUpperCase()})</Label><Textarea value={desc[lang]} onChange={(e) => setDesc({ ...desc, [lang]: e.target.value })} className="min-h-28 rounded-none border-2" /></div>
          <ImageUpload label="Обложка" bucket="project-covers" folder={folder} value={image} onChange={setImage} />
          <label className="flex items-center justify-between border-2 border-slate-900 p-3 font-black uppercase text-sm">Ищем людей в команду<Switch checked={looking} onCheckedChange={setLooking} /></label>
          {looking && <Input placeholder="Роли через запятую: дизайнер, программист" value={roles} onChange={(e) => setRoles(e.target.value)} className="h-12 rounded-none border-2" />}
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending || !folder} className="h-12 w-full rounded-none border-2 border-slate-900 bg-blue-600 font-black uppercase hover:bg-blue-700">Создать проект</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
