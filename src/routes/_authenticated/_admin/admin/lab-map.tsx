import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, ExternalLink, Eye, EyeOff, Map, Presentation } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload, ImageUploadMultiple, useUploadFolder } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { LabZone } from "@/components/lab-map";

export const Route = createFileRoute("/_authenticated/_admin/admin/lab-map")({ component: AdminLabMapPage });

const emptyForm = {
  name: "", name_kz: "", name_en: "", description: "", description_kz: "", description_en: "",
  action_type: "info" as LabZone["action_type"], external_url: "", image_url: "", gallery_urls: [] as string[],
  booking_enabled: false, is_active: true,
};

function AdminLabMapPage() {
  const qc = useQueryClient();
  const uploadFolder = useUploadFolder();
  const [editing, setEditing] = useState<LabZone | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["admin-lab-zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_zones").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const openEditor = (zone: LabZone) => {
    setEditing(zone);
    setForm({
      name: zone.name, name_kz: zone.name_kz || "", name_en: zone.name_en || "",
      description: zone.description || "", description_kz: zone.description_kz || "", description_en: zone.description_en || "",
      action_type: zone.action_type, external_url: zone.external_url || "", image_url: zone.image_url || "",
      gallery_urls: zone.gallery_urls, booking_enabled: zone.booking_enabled, is_active: zone.is_active,
    });
  };
  const save = useMutation({
    mutationFn: async () => {
      if (!editing || form.name.trim().length < 2) throw new Error("Укажите название зоны");
      const { error } = await supabase.from("lab_zones").update({
        name: form.name.trim(), name_kz: form.name_kz.trim() || null, name_en: form.name_en.trim() || null,
        description: form.description.trim() || null, description_kz: form.description_kz.trim() || null,
        description_en: form.description_en.trim() || null, action_type: form.action_type,
        external_url: form.action_type === "external" ? form.external_url.trim() || null : null,
        image_url: form.image_url || null, gallery_urls: form.gallery_urls,
        booking_enabled: form.action_type === "bookable" && form.booking_enabled, is_active: form.is_active,
      }).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Зона обновлена"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-lab-zones"] }); qc.invalidateQueries({ queryKey: ["lab-zones"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-8 pb-12">
      <div className="border-b-4 border-foreground pb-6"><p className="text-xs font-black uppercase tracking-widest text-primary">Пространство FabLab</p><h1 className="mt-1 text-4xl font-black uppercase tracking-normal">Карта лаборатории</h1><p className="mt-2 text-sm text-muted-foreground">Редактируйте названия, описания, фото и действия зон. Расположение зон на плане остаётся фиксированным.</p></div>
      {isLoading ? <div className="h-80 animate-pulse border-4 border-foreground bg-muted" /> : (
        <div className="grid gap-5 lg:grid-cols-2">
          {zones.map((zone) => <article key={zone.id} className="flex flex-col gap-4 border-4 border-foreground bg-card p-5 shadow-[5px_5px_0_var(--foreground)] sm:flex-row">
            <div className="h-24 w-full shrink-0 overflow-hidden border-2 border-foreground bg-muted sm:w-32">{zone.image_url ? <img src={zone.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Map className="h-8 w-8 text-muted-foreground" /></div>}</div>
            <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-black uppercase leading-tight tracking-normal">{zone.name}</h2>{zone.is_active ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-destructive" />}</div><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{zone.description || "Описание не заполнено"}</p><div className="mt-3 flex flex-wrap items-center gap-2"><span className="border-2 border-foreground bg-muted px-2 py-1 text-[10px] font-black uppercase">{zone.action_type}</span>{zone.booking_enabled && <span className="flex items-center gap-1 border-2 border-foreground bg-primary px-2 py-1 text-[10px] font-black uppercase text-primary-foreground"><Presentation className="h-3 w-3" /> Заявки включены</span>}{zone.external_url && <ExternalLink className="h-4 w-4 text-muted-foreground" />}</div><Button type="button" variant="outline" onClick={() => openEditor(zone)} className="mt-4 h-10 rounded-none border-2 font-black uppercase tracking-widest"><Edit3 className="mr-2 h-4 w-4" /> Изменить</Button></div>
          </article>)}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-none border-4 border-foreground p-0 shadow-[8px_8px_0_var(--foreground)]">
          <div className="border-b-4 border-foreground bg-primary p-6 pr-14 text-primary-foreground"><DialogTitle className="text-2xl font-black uppercase tracking-normal">Редактирование зоны</DialogTitle><DialogDescription className="mt-1 text-primary-foreground/80">{editing?.slug}</DialogDescription></div>
          <div className="space-y-6 p-5 sm:p-7">
            <Tabs defaultValue="ru"><TabsList className="grid h-12 grid-cols-3 rounded-none border-2"><TabsTrigger value="ru" className="rounded-none font-black">RU</TabsTrigger><TabsTrigger value="kz" className="rounded-none font-black">KZ</TabsTrigger><TabsTrigger value="en" className="rounded-none font-black">EN</TabsTrigger></TabsList>
              {(["ru", "kz", "en"] as const).map((language) => {
                const nameKey = language === "ru" ? "name" : `name_${language}` as "name_kz" | "name_en";
                const descKey = language === "ru" ? "description" : `description_${language}` as "description_kz" | "description_en";
                return <TabsContent key={language} value={language} className="space-y-4 pt-3"><div className="space-y-2"><Label>Название ({language.toUpperCase()})</Label><Input value={form[nameKey]} onChange={(e) => setForm({ ...form, [nameKey]: e.target.value })} className="h-12 rounded-none border-2" /></div><div className="space-y-2"><Label>Описание ({language.toUpperCase()})</Label><Textarea value={form[descKey]} onChange={(e) => setForm({ ...form, [descKey]: e.target.value })} className="min-h-28 rounded-none border-2" /></div></TabsContent>;
              })}
            </Tabs>
            <div className="grid gap-5 sm:grid-cols-2"><ImageUpload label="Обложка" bucket="equipment-images" folder={uploadFolder} value={form.image_url || null} onChange={(url) => setForm({ ...form, image_url: url || "" })} /><ImageUploadMultiple label="Галерея (до 6)" bucket="equipment-images" folder={uploadFolder} values={form.gallery_urls} onChange={(gallery_urls) => setForm({ ...form, gallery_urls })} max={6} /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Действие по нажатию</Label><select value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value as LabZone["action_type"] })} className="h-12 w-full rounded-none border-2 border-input bg-background px-3"><option value="info">Информация</option><option value="bookable">Заявка на бронирование</option><option value="external">Внешний сайт</option></select></div>{form.action_type === "external" && <div className="space-y-2"><Label>Внешняя ссылка</Label><Input type="url" value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} className="h-12 rounded-none border-2" /></div>}</div>
            <div className="grid gap-3 sm:grid-cols-2"><label className="flex min-h-14 items-center justify-between gap-4 border-2 border-foreground p-3 font-black uppercase"><span>Показывать зону</span><Switch checked={form.is_active} onCheckedChange={(is_active) => setForm({ ...form, is_active })} /></label>{form.action_type === "bookable" && <label className="flex min-h-14 items-center justify-between gap-4 border-2 border-foreground p-3 font-black uppercase"><span>Принимать заявки</span><Switch checked={form.booking_enabled} onCheckedChange={(booking_enabled) => setForm({ ...form, booking_enabled })} /></label>}</div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setEditing(null)} className="h-12 rounded-none border-2 font-black uppercase">Отмена</Button><Button onClick={() => save.mutate()} disabled={save.isPending || !uploadFolder} className="h-12 rounded-none border-2 border-foreground font-black uppercase shadow-[3px_3px_0_var(--foreground)]">Сохранить</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}