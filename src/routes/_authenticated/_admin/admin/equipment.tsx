import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, RefreshCcw, Trash2, Laptop, Printer, HardHat, Crown, QrCode, Printer as PrintIcon, Wrench, Settings, ShieldAlert, Zap } from "lucide-react";
import { z } from "zod";


export const Route = createFileRoute("/_authenticated/_admin/admin/equipment")({
  component: AdminEquipmentPage,
});

type Equipment = {
  id: string;
  name: string;
  name_kz: string | null;
  name_en: string | null;
  category: "stationary" | "portable";
  status: "active" | "maintenance";
  access_type: "basic" | "independent" | "mentor_required" | "resident_only";
  image_url: string | null;
  description?: string | null;
  description_kz?: string | null;
  description_en?: string | null;
  specs?: string | null;
};

const htmlTagPattern = /<[^>]*>/;

const equipmentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Название слишком короткое")
    .max(120, "Название слишком длинное")
    .refine((value) => !htmlTagPattern.test(value), "Название содержит недопустимые символы"),
  name_kz: z
    .string()
    .trim()
    .max(120, "Название слишком длинное")
    .refine((value) => !htmlTagPattern.test(value), "Название содержит недопустимые символы")
    .optional()
    .or(z.literal("")),
  name_en: z
    .string()
    .trim()
    .max(120, "Название слишком длинное")
    .refine((value) => !htmlTagPattern.test(value), "Название содержит недопустимые символы")
    .optional()
    .or(z.literal("")),
  category: z.enum(["stationary", "portable"]),
  status: z.enum(["active", "maintenance"]),
  access_type: z.enum(["basic", "independent", "mentor_required", "resident_only"]),
  image_url: z
    .string()
    .trim()
    .max(500, "Ссылка на изображение слишком длинная")
    .refine((value) => value === "" || /^https?:\/\/.+/i.test(value), "Введите корректный URL изображения"),
  description: z
    .string()
    .max(500, "Описание не должно превышать 500 символов")
    .refine((value) => !htmlTagPattern.test(value), "Описание содержит недопустимые символы"),
  description_kz: z
    .string()
    .max(500, "Описание не должно превышать 500 символов")
    .refine((value) => !htmlTagPattern.test(value), "Описание содержит недопустимые символы")
    .optional()
    .or(z.literal("")),
  description_en: z
    .string()
    .max(500, "Описание не должно превышать 500 символов")
    .refine((value) => !htmlTagPattern.test(value), "Описание содержит недопустимые символы")
    .optional()
    .or(z.literal("")),
  specs: z
    .string()
    .max(500, "Параметры не должны превышать 500 символов")
    .refine((value) => !htmlTagPattern.test(value), "Параметры содержат недопустимые символы"),
});

const renderAccessBadge = (accessType: string) => {
  const baseClasses = "font-black uppercase tracking-widest text-[10px] border-2 border-slate-900 shadow-[2px_2px_0_#0f172a]";
  switch (accessType) {
    case 'basic': return <Badge className={`bg-emerald-400 text-slate-900 ${baseClasses}`}><Laptop className="w-3 h-3 mr-1"/> Общий</Badge>;
    case 'independent': return <Badge className={`bg-blue-400 text-white ${baseClasses}`}><Printer className="w-3 h-3 mr-1"/> ТБ</Badge>;
    case 'mentor_required': return <Badge className={`bg-amber-400 text-slate-900 ${baseClasses}`}><HardHat className="w-3 h-3 mr-1"/> С ментором</Badge>;
    case 'resident_only': return <Badge className={`bg-purple-500 text-white ${baseClasses}`}><Crown className="w-3 h-3 mr-1"/> Резиденты</Badge>;
    default: return <Badge variant="outline" className={baseClasses}>Неизвестно</Badge>;
  }
};

function AdminEquipmentPage() {
  const qc = useQueryClient();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [qrModalItem, setQrModalItem] = useState<Equipment | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [form, setForm] = useState({
    name: "", name_kz: "", name_en: "", category: "stationary" as Equipment["category"], status: "active" as Equipment["status"],
    access_type: "basic" as Equipment["access_type"], image_url: "", description: "", description_kz: "", description_en: "", specs: "",
  });

  const { data: equipment } = useQuery({
    queryKey: ["admin-equipment"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("*").order("name");
      if (error) throw error;
      return (data as Equipment[]) ?? [];
    },
  });

  const stats = useMemo(() => {
    const all = equipment ?? [];
    const total = all.length;
    const active = all.filter(e => e.status === 'active').length;
    const maintenance = all.filter(e => e.status === 'maintenance').length;
    const strictAccess = all.filter(e => ['mentor_required', 'resident_only'].includes(e.access_type)).length;

    return { total, active, maintenance, strictAccess };
  }, [equipment]);

  const saveEquipment = useMutation({
    mutationFn: async () => {
      const validated = equipmentFormSchema.parse(form);
      const payload = {
        name: validated.name,
        name_kz: validated.name_kz || null,
        name_en: validated.name_en || null,
        category: validated.category,
        status: validated.status,
        access_type: validated.access_type,
        image_url: validated.image_url || null,
        description: validated.description || null,
        description_kz: validated.description_kz || null,
        description_en: validated.description_en || null,
        specs: validated.specs || null,
      };

      const table = supabase.from("equipment");
      const response = editingEquipment
        ? await table.update(payload as never).eq("id", editingEquipment.id)
        : await table.insert(payload as never);

      if (response.error) throw response.error;
    },
    onSuccess: () => {
      toast.success(editingEquipment ? "Оборудование обновлено" : "Оборудование добавлено");
      setCatalogOpen(false);
      setEditingEquipment(null);
      setForm({ name: "", name_kz: "", name_en: "", category: "stationary", status: "active", access_type: "basic", image_url: "", description: "", description_kz: "", description_en: "", specs: "" });
      qc.invalidateQueries({ queryKey: ["admin-equipment"] });
    },
    onError: (error: Error) => {
      if (error instanceof z.ZodError) { toast.error(error.issues[0]?.message ?? "Проверьте корректность полей"); return; }
      toast.error(error.message);
    },
  });

  const deleteEquipment = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("equipment").delete().eq("id", id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Ошибка удаления: у вас нет прав для этого действия");
    },
    onSuccess: () => {
      toast.success("Оборудование удалено");
      qc.invalidateQueries({ queryKey: ["admin-equipment"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleEquipmentStatus = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: Equipment["status"] }) => {
      const { data, error } = await supabase.from("equipment").update({ status: nextStatus }).eq("id", id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Ошибка обновления: у вас нет прав для этого действия");
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.nextStatus === "maintenance" ? "В ремонте" : "Активно");
      qc.invalidateQueries({ queryKey: ["admin-equipment"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openCreate = () => {
    setEditingEquipment(null);
    setForm({ name: "", name_kz: "", name_en: "", category: "stationary", status: "active", access_type: "basic", image_url: "", description: "", description_kz: "", description_en: "", specs: "" });
    setCatalogOpen(true);
  };

  const openEdit = (item: Equipment) => {
    setEditingEquipment(item);
    setForm({
      name: item.name, name_kz: item.name_kz || "", name_en: item.name_en || "", category: item.category, status: item.status,
      access_type: item.access_type || "basic", image_url: item.image_url || "",
      description: item.description || "", description_kz: item.description_kz || "", description_en: item.description_en || "", specs: item.specs || "",
    });
    setCatalogOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 p-2">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b-4 border-slate-900 pb-6 print:hidden">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Оборудование</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Управление станками и генерация QR-кодов</p>
        </div>
        <Button 
          onClick={openCreate} 
          className="bg-blue-600 hover:bg-blue-700 text-white border-4 border-slate-900 px-6 py-6 font-black text-xs tracking-widest uppercase transition-all shadow-[4px_4px_0_#0f172a] hover:translate-y-1 hover:translate-x-1 hover:shadow-none"
        >
          <Plus className="mr-2 h-4 w-4" /> Добавить станок
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 print:hidden">
        <div className="bg-white border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900">Всего позиций</h4>
            <Wrench className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-4xl font-black text-slate-900">{stats.total}</div>
        </div>

        <div className="bg-emerald-400 border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between text-slate-900">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900">В строю</h4>
            <Zap className="w-5 h-5 text-slate-900" />
          </div>
          <div className="text-4xl font-black text-slate-900">{stats.active}</div>
        </div>

        <div className="bg-rose-500 border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between text-white">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-rose-100">На ремонте</h4>
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div className="text-4xl font-black text-white">{stats.maintenance}</div>
        </div>

        <div className="bg-white border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900">Сложный доступ</h4>
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-4xl font-black text-slate-900">{stats.strictAccess}</div>
        </div>
      </div>

      <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a] print:hidden overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-900 border-b-4 border-slate-900">
              <TableRow className="hover:bg-slate-900">
                <TableHead className="text-white font-black uppercase tracking-widest text-xs py-4">Название</TableHead>
                <TableHead className="text-white font-black uppercase tracking-widest text-xs py-4">Категория</TableHead>
                <TableHead className="text-white font-black uppercase tracking-widest text-xs py-4">Доступ</TableHead>
                <TableHead className="text-white font-black uppercase tracking-widest text-xs py-4">Статус</TableHead>
                <TableHead className="text-right text-white font-black uppercase tracking-widest text-xs py-4">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(equipment ?? []).map((item) => (
                <TableRow key={item.id} className="border-b-2 border-slate-200 hover:bg-slate-50 transition-colors">
                  <TableCell className="font-black text-slate-900 uppercase tracking-tight py-4">{item.name}</TableCell>
                  <TableCell className="text-slate-500 text-xs font-bold uppercase tracking-widest py-4">
                    {item.category === 'stationary' ? 'Стационарный' : 'Портативный'}
                  </TableCell>
                  <TableCell className="py-4">{renderAccessBadge(item.access_type || 'basic')}</TableCell>
                  <TableCell className="py-4">
                    <Button
                      size="sm"
                      className={`font-black uppercase tracking-widest text-[10px] border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all ${
                        item.status === "active" ? "bg-emerald-400 hover:bg-emerald-500 text-slate-900" : "bg-rose-500 hover:bg-rose-600 text-white"
                      }`}
                      onClick={() => toggleEquipmentStatus.mutate({ id: item.id, nextStatus: item.status === "active" ? "maintenance" : "active" })}
                    >
                      <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                      {item.status === "active" ? "В СТРОЮ" : "В РЕМОНТЕ"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" className="bg-white text-slate-900 hover:bg-blue-50 border-2 border-slate-900 font-black uppercase tracking-widest text-[10px] shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all" onClick={() => setQrModalItem(item)}>
                        <QrCode className="mr-1 h-3.5 w-3.5" /> QR
                      </Button>
                      <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100 border-2 border-slate-900 font-black uppercase tracking-widest text-[10px] shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all" onClick={() => openEdit(item)}>
                        Изменить
                      </Button>
                      <Button size="sm" className="bg-white text-red-600 hover:bg-red-50 hover:text-red-700 border-2 border-slate-900 font-black shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all px-3" onClick={() => { if (window.confirm(`Удалить "${item.name}"?`)) deleteEquipment.mutate(item.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(equipment ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-xs">
                    Станков пока нет
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="border-4 border-slate-900 bg-white p-0 rounded-none shadow-[8px_8px_0_#0f172a] overflow-hidden max-w-2xl">
          <div className="bg-slate-900 p-6">
            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-white">
              {editingEquipment ? "Редактирование станка" : "Новый станок"}
            </DialogTitle>
          </div>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            
            {/* БРУТАЛЬНЫЕ ВКЛАДКИ ДЛЯ МУЛЬТИЯЗЫЧНОСТИ */}
            <Tabs defaultValue="ru" className="w-full border-2 border-slate-900 p-2 bg-slate-50 shadow-[2px_2px_0_#0f172a]">
              <TabsList className="grid grid-cols-3 h-10 w-full bg-slate-200 p-1 rounded-none border-b-2 border-slate-900 gap-1">
                <TabsTrigger value="ru" className="rounded-none font-black text-xs uppercase data-[state=active]:bg-slate-900 data-[state=active]:text-white">RU</TabsTrigger>
                <TabsTrigger value="kz" className="rounded-none font-black text-xs uppercase data-[state=active]:bg-slate-900 data-[state=active]:text-white">KZ</TabsTrigger>
                <TabsTrigger value="en" className="rounded-none font-black text-xs uppercase data-[state=active]:bg-slate-900 data-[state=active]:text-white">EN</TabsTrigger>
              </TabsList>
              
              <TabsContent value="ru" className="space-y-4 pt-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Название (RU) *</Label>
                  <Input className="h-12 border-2 border-slate-900 rounded-none focus-visible:ring-0 focus-visible:border-blue-600 font-bold" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Описание (RU) *</Label>
                  <Textarea className="border-2 border-slate-900 rounded-none focus-visible:ring-0 focus-visible:border-blue-600 font-medium resize-none h-24" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
                </div>
              </TabsContent>

              <TabsContent value="kz" className="space-y-4 pt-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Атауы (KZ)</Label>
                  <Input className="h-12 border-2 border-slate-900 rounded-none focus-visible:ring-0 focus-visible:border-blue-600 font-bold" value={form.name_kz} onChange={(e) => setForm((prev) => ({ ...prev, name_kz: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Сипаттамасы (KZ)</Label>
                  <Textarea className="border-2 border-slate-900 rounded-none focus-visible:ring-0 focus-visible:border-blue-600 font-medium resize-none h-24" value={form.description_kz} onChange={(e) => setForm((prev) => ({ ...prev, description_kz: e.target.value }))} />
                </div>
              </TabsContent>

              <TabsContent value="en" className="space-y-4 pt-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Name (EN)</Label>
                  <Input className="h-12 border-2 border-slate-900 rounded-none focus-visible:ring-0 focus-visible:border-blue-600 font-bold" value={form.name_en} onChange={(e) => setForm((prev) => ({ ...prev, name_en: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description (EN)</Label>
                  <Textarea className="border-2 border-slate-900 rounded-none focus-visible:ring-0 focus-visible:border-blue-600 font-medium resize-none h-24" value={form.description_en} onChange={(e) => setForm((prev) => ({ ...prev, description_en: e.target.value }))} />
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Категория</Label>
                <select className="w-full h-12 px-3 border-2 border-slate-900 rounded-none bg-white font-bold text-sm outline-none focus:border-blue-600" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as any }))}>
                  <option value="stationary">Стационарный</option>
                  <option value="portable">Портативный</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Статус</Label>
                <select className="w-full h-12 px-3 border-2 border-slate-900 rounded-none bg-white font-bold text-sm outline-none focus:border-blue-600" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as any }))}>
                  <option value="active">В строю</option>
                  <option value="maintenance">В ремонте</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2 bg-blue-50 border-2 border-blue-200 p-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-blue-900">Уровень доступа</Label>
              <select className="w-full h-12 px-3 border-2 border-blue-300 rounded-none bg-white font-bold text-sm outline-none focus:border-blue-600" value={form.access_type} onChange={(e) => setForm((prev) => ({ ...prev, access_type: e.target.value as any }))}>
                <option value="basic">🟢 Общий (ТБ не обязателен)</option>
                <option value="independent">🟡 Самостоятельно (Строго после ТБ)</option>
                <option value="mentor_required">🟠 Опасно (Только с ментором)</option>
                <option value="resident_only">🔴 Элита (Только для Резидентов)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Фото URL</Label>
                <Input className="h-12 border-2 border-slate-900 rounded-none focus-visible:ring-0 focus-visible:border-blue-600 font-medium" value={form.image_url} onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Параметры / Спецификации</Label>
                <Input className="h-12 border-2 border-slate-900 rounded-none focus-visible:ring-0 focus-visible:border-blue-600 font-medium" value={form.specs} onChange={(e) => setForm((prev) => ({ ...prev, specs: e.target.value }))} />
              </div>
            </div>
          </div>
          
          <div className="p-6 pt-0 flex justify-end gap-3 bg-slate-50 border-t-2 border-slate-200 mt-4">
            <Button variant="outline" className="border-2 border-slate-900 font-black uppercase tracking-widest text-xs rounded-none shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all mt-4" onClick={() => setCatalogOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-xs rounded-none shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all mt-4" onClick={() => saveEquipment.mutate()} disabled={saveEquipment.isPending}>
              {saveEquipment.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrModalItem} onOpenChange={(v) => !v && setQrModalItem(null)}>
        <DialogContent className="border-4 border-slate-900 bg-white p-6 rounded-none shadow-[8px_8px_0_#0f172a] max-w-sm mx-auto">
          <DialogHeader className="print:hidden">
            <DialogTitle className="font-black text-2xl uppercase tracking-tighter text-center">QR Паспорт</DialogTitle>
          </DialogHeader>
          
          <div id="printable-qr-card" className="flex flex-col items-center justify-center p-6 border-4 border-slate-900 bg-white text-center space-y-4 my-2">
            <div className="text-sm uppercase font-black tracking-widest text-slate-900">FABLAB SATBAYEV</div>
            
            {qrModalItem && (
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.origin + '/booking?equipmentId=' + qrModalItem.id)}`} 
                alt="Equipment QR Code"
                className="w-48 h-48 bg-white p-2 border-4 border-slate-900"
              />
            )}
            
            <div>
              <div className="font-black text-slate-900 text-lg uppercase tracking-tight max-w-[240px] truncate">{qrModalItem?.name}</div>
              <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">ID: {qrModalItem?.id.split('-')[0]}</div>
            </div>
          </div>

          <DialogFooter className="print:hidden gap-3 flex-col sm:flex-row w-full mt-4">
            <Button variant="outline" className="border-2 border-slate-900 font-black uppercase tracking-widest text-xs rounded-none flex-1 shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all" onClick={() => setQrModalItem(null)}>Закрыть</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-xs rounded-none flex-1 shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all" onClick={handlePrint}>
              <PrintIcon className="w-4 h-4 mr-2" /> Печать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}