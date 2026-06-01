import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, RefreshCcw, Trash2, Laptop, Printer, HardHat, Crown, QrCode, Printer as PrintIcon } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/_admin/admin/equipment")({
  component: AdminEquipmentPage,
});

type Equipment = {
  id: string;
  name: string;
  category: "stationary" | "portable";
  status: "active" | "maintenance";
  access_type: "basic" | "independent" | "mentor_required" | "resident_only";
  image_url: string | null;
  description?: string | null;
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
  specs: z
    .string()
    .max(500, "Параметры не должны превышать 500 символов")
    .refine((value) => !htmlTagPattern.test(value), "Параметры содержат недопустимые символы"),
});

const renderAccessBadge = (accessType: string) => {
  switch (accessType) {
    case 'basic': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none"><Laptop className="w-3 h-3 mr-1"/> Общий</Badge>;
    case 'independent': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none"><Printer className="w-3 h-3 mr-1"/> Нужен ТБ</Badge>;
    case 'mentor_required': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none"><HardHat className="w-3 h-3 mr-1"/> С ментором</Badge>;
    case 'resident_only': return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-none"><Crown className="w-3 h-3 mr-1"/> Резиденты</Badge>;
    default: return <Badge variant="outline">Неизвестно</Badge>;
  }
};

function AdminEquipmentPage() {
  const qc = useQueryClient();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [qrModalItem, setQrModalItem] = useState<Equipment | null>(null); // Модалка для QR
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "stationary" as Equipment["category"],
    status: "active" as Equipment["status"],
    access_type: "basic" as Equipment["access_type"],
    image_url: "",
    description: "",
    specs: "",
  });

  const { data: equipment } = useQuery({
    queryKey: ["admin-equipment"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("*").order("name");
      if (error) throw error;
      return (data as Equipment[]) ?? [];
    },
  });

  const saveEquipment = useMutation({
    mutationFn: async () => {
      const validated = equipmentFormSchema.parse(form);
      const payload = {
        name: validated.name,
        category: validated.category,
        status: validated.status,
        access_type: validated.access_type,
        image_url: validated.image_url || null,
        description: validated.description || null,
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
      setForm({
        name: "",
        category: "stationary",
        status: "active",
        access_type: "basic",
        image_url: "",
        description: "",
        specs: "",
      });
      qc.invalidateQueries({ queryKey: ["admin-equipment"] });
    },
    onError: (error: Error) => {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message ?? "Проверьте корректность полей");
        return;
      }
      toast.error(error.message);
    },
  });

  const deleteEquipment = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", id)
        .select();

      if (error) throw error;

      // SECURITY: Check for silent RLS denial (empty result with 200 OK)
      if (!data || data.length === 0) {
        throw new Error("Ошибка удаления: у вас нет прав для этого действия");
      }
    },
    onSuccess: () => {
      toast.success("Оборудование удалено");
      qc.invalidateQueries({ queryKey: ["admin-equipment"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleEquipmentStatus = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: Equipment["status"] }) => {
      const { data, error } = await supabase
        .from("equipment")
        .update({ status: nextStatus })
        .eq("id", id)
        .select();

      if (error) throw error;

      // SECURITY: Check for silent RLS denial (empty result with 200 OK)
      if (!data || data.length === 0) {
        throw new Error("Ошибка обновления: у вас нет прав для этого действия");
      }
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.nextStatus === "maintenance" ? "В ремонте" : "Активно");
      qc.invalidateQueries({ queryKey: ["admin-equipment"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openCreate = () => {
    setEditingEquipment(null);
    setForm({ name: "", category: "stationary", status: "active", access_type: "basic", image_url: "", description: "", specs: "" });
    setCatalogOpen(true);
  };

  const openEdit = (item: Equipment) => {
    setEditingEquipment(item);
    setForm({
      name: item.name,
      category: item.category,
      status: item.status,
      access_type: item.access_type || "basic",
      image_url: item.image_url || "",
      description: item.description || "",
      specs: item.specs || "",
    });
    setCatalogOpen(true);
  };

  // Функция триггера стандартной печати браузера
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl print:hidden">
        <CardHeader className="p-8 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-2xl font-black text-slate-900">Оборудование и QR-инвентаризация</CardTitle>
            <Button onClick={openCreate} className="h-11 rounded-2xl bg-[#005BAB] hover:bg-blue-800 font-bold">
              <Plus className="mr-2 h-4 w-4" /> Добавить оборудование
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-8 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Доступ</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(equipment ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-bold text-slate-800">{item.name}</TableCell>
                  <TableCell className="capitalize text-slate-500 text-xs font-semibold">{item.category}</TableCell>
                  <TableCell>{renderAccessBadge(item.access_type || 'basic')}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      className={item.status === "active" ? "border-green-200 bg-green-50 text-green-700 rounded-xl" : "border-amber-200 bg-amber-50 text-amber-700 rounded-xl"}
                      onClick={() => toggleEquipmentStatus.mutate({ id: item.id, nextStatus: item.status === "active" ? "maintenance" : "active" })}
                    >
                      <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                      {item.status}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 rounded-xl" onClick={() => setQrModalItem(item)}>
                        <QrCode className="mr-1 h-4 w-4" /> QR-код
                      </Button>
                      <Button size="sm" variant="outline" className="border-slate-200 rounded-xl" onClick={() => openEdit(item)}>Редактировать</Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl" onClick={() => { if (window.confirm(`Удалить "${item.name}"?`)) deleteEquipment.mutate(item.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ДИАЛОГ РЕДАКТИРОВАНИЯ / СОЗДАНИЯ */}
      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="rounded-3xl border border-slate-100 bg-white">
          <DialogHeader>
            <DialogTitle>{editingEquipment ? "Редактировать оборудование" : "Добавить оборудование"}</DialogTitle>
            <DialogDescription>Данные сохраняются в Supabase таблицу equipment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input className="h-11 rounded-2xl" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Категория</Label>
                <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value as any }))}>
                  <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="stationary">Stationary</SelectItem><SelectItem value="portable">Portable</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as any }))}>
                  <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 rounded-2xl bg-slate-50 p-3 border border-slate-100">
              <Label className="font-bold text-slate-800">Уровень доступа (Ограничения)</Label>
              <Select value={form.access_type} onValueChange={(value) => setForm((prev) => ({ ...prev, access_type: value as any }))}>
                <SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">🟢 Общий (ТБ не обязателен)</SelectItem>
                  <SelectItem value="independent">🟡 Самостоятельно (Строго после ТБ)</SelectItem>
                  <SelectItem value="mentor_required">🟠 Опасно (Бронь требует Ментора)</SelectItem>
                  <SelectItem value="resident_only">🔴 Элита (Только для Резидентов)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Фото URL</Label>
              <Input className="h-11 rounded-2xl" value={form.image_url} onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea className="rounded-2xl" rows={2} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Параметры</Label>
              <Textarea className="rounded-2xl" rows={3} value={form.specs} onChange={(e) => setForm((prev) => ({ ...prev, specs: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="h-11 rounded-2xl" onClick={() => setCatalogOpen(false)}>Отмена</Button>
            <Button className="h-11 rounded-2xl bg-[#005BAB] hover:bg-blue-800 font-bold" onClick={() => saveEquipment.mutate()} disabled={saveEquipment.isPending}>
              {saveEquipment.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* МОДАЛКА ПАСПОРТА ПРЕДМЕТА И ПЕЧАТИ QR КОДА */}
      <Dialog open={!!qrModalItem} onOpenChange={(v) => !v && setQrModalItem(null)}>
        <DialogContent className="rounded-[32px] border border-slate-100 bg-white p-6 max-w-sm mx-auto">
          <DialogHeader className="print:hidden">
            <DialogTitle className="font-black text-xl text-center">Инвентарный паспорт</DialogTitle>
          </DialogHeader>
          
          {/* СТИЛЬНЫЙ ПЕЧАТНЫЙ ПАСПОРТ (наклейка на вещь) */}
          <div id="printable-qr-card" className="flex flex-col items-center justify-center p-6 border-4 border-dashed border-slate-300 rounded-2xl bg-white text-center space-y-4 my-2">
            <div className="text-xs uppercase font-black tracking-widest text-[#005BAB]">FabLab Satbayev</div>
            
            {qrModalItem && (
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.origin + '/booking?equipmentId=' + qrModalItem.id)}`} 
                alt="Equipment QR Code"
                className="w-44 h-44 bg-slate-50 p-2 rounded-xl border border-slate-100 shadow-inner"
              />
            )}
            
            <div>
              <div className="font-black text-slate-900 text-sm max-w-[240px] truncate">{qrModalItem?.name}</div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 uppercase">ID: {qrModalItem?.id.slice(0, 8)}...</div>
            </div>
          </div>

          <DialogFooter className="print:hidden gap-2 flex-col sm:flex-row w-full mt-2">
            <Button variant="ghost" className="rounded-xl flex-1" onClick={() => setQrModalItem(null)}>Закрыть</Button>
            <Button className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex-1" onClick={handlePrint}>
              <PrintIcon className="w-4 h-4 mr-1.5" /> Печать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}