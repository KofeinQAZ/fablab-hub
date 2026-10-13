import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload, useUploadFolder } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/_admin/admin/gallery")({ component: AdminGalleryPage });

type Photo = { id: string; image_url: string; caption: string | null; caption_kz: string | null; caption_en: string | null; sort_order: number; is_visible: boolean };

function AdminGalleryPage() {
  const qc = useQueryClient();
  const folder = useUploadFolder();
  const [image, setImage] = useState<string | null>(null);
  const [cap, setCap] = useState({ ru: "", kz: "", en: "" });

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["admin-gallery"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gallery_photos").select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return data as Photo[];
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-gallery"] }); qc.invalidateQueries({ queryKey: ["gallery-photos"] }); };

  const add = useMutation({
    mutationFn: async () => {
      if (!image) throw new Error("Загрузите фото");
      const { error } = await supabase.from("gallery_photos").insert({
        image_url: image, caption: cap.ru.trim() || null, caption_kz: cap.kz.trim() || null, caption_en: cap.en.trim() || null,
        sort_order: (photos.at(-1)?.sort_order ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Фото добавлено"); setImage(null); setCap({ ru: "", kz: "", en: "" }); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Photo> }) => {
      const { error } = await supabase.from("gallery_photos").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Удалено"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const move = async (i: number, dir: -1 | 1) => {
    const a = photos[i], b = photos[i + dir];
    if (!a || !b) return;
    await Promise.all([
      supabase.from("gallery_photos").update({ sort_order: i + dir }).eq("id", a.id),
      supabase.from("gallery_photos").update({ sort_order: i }).eq("id", b.id),
    ]);
    refresh();
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="border-b-4 border-foreground pb-6">
        <h1 className="text-4xl font-black uppercase tracking-normal">Галерея на главной</h1>
        <p className="mt-2 text-sm text-muted-foreground">Пока здесь нет ни одного фото, на главной показываются стандартные снимки.</p>
      </div>

      <div className="grid gap-5 border-4 border-foreground bg-card p-5 shadow-[5px_5px_0_var(--foreground)] md:grid-cols-[280px_1fr]">
        <ImageUpload label="Фото" bucket="equipment-images" folder={folder} value={image} onChange={setImage} />
        <div className="space-y-3">
          <Input placeholder="Подпись (RU)" value={cap.ru} onChange={(e) => setCap({ ...cap, ru: e.target.value })} className="h-11 rounded-none border-2" />
          <Input placeholder="Подпись (KZ)" value={cap.kz} onChange={(e) => setCap({ ...cap, kz: e.target.value })} className="h-11 rounded-none border-2" />
          <Input placeholder="Подпись (EN)" value={cap.en} onChange={(e) => setCap({ ...cap, en: e.target.value })} className="h-11 rounded-none border-2" />
          <Button onClick={() => add.mutate()} disabled={add.isPending || !image} className="h-11 w-full rounded-none border-2 border-foreground font-black uppercase"><Plus className="mr-2 h-4 w-4" />Добавить в галерею</Button>
        </div>
      </div>

      {isLoading ? <div className="h-40 animate-pulse border-4 border-foreground bg-muted" /> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p, i) => (
            <article key={p.id} className={`border-4 border-foreground bg-card ${p.is_visible ? "" : "opacity-50"}`}>
              <img src={p.image_url} alt={p.caption ?? ""} className="aspect-video w-full border-b-4 border-foreground object-cover" />
              <div className="space-y-2 p-3">
                <Input defaultValue={p.caption ?? ""} placeholder="Подпись (RU)" onBlur={(e) => e.target.value !== (p.caption ?? "") && patch.mutate({ id: p.id, values: { caption: e.target.value || null } })} className="h-10 rounded-none border-2" />
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-sm font-bold">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="outline" aria-label="Выше" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-none border-2"><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" aria-label="Ниже" disabled={i === photos.length - 1} onClick={() => move(i, 1)} className="rounded-none border-2"><ArrowDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" aria-label={p.is_visible ? "Скрыть" : "Показать"} onClick={() => patch.mutate({ id: p.id, values: { is_visible: !p.is_visible } })} className="rounded-none border-2">{p.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
                    <Button size="icon" variant="outline" aria-label="Удалить" onClick={() => confirm("Удалить фото?") && remove.mutate(p.id)} className="rounded-none border-2 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
