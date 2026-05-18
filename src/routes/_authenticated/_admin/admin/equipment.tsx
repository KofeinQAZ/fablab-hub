import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, RefreshCcw, Trash2 } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/_admin/admin/equipment")({
  component: AdminEquipmentPage,
});

type Equipment = {
  id: string;
  name: string;
  category: "stationary" | "portable";
  status: "active" | "maintenance";
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

function AdminEquipmentPage() {
  const qc = useQueryClient();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "stationary" as Equipment["category"],
    status: "active" as Equipment["status"],
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
        image_url: "",
        description: "",
        specs: "",
      });
      qc.invalidateQueries({ queryKey: ["admin-equipment"] });
      qc.invalidateQueries({ queryKey: ["equipment", "stationary"] });
      qc.invalidateQueries({ queryKey: ["equipment", "portable"] });
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
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Оборудование удалено");
      qc.invalidateQueries({ queryKey: ["admin-equipment"] });
      qc.invalidateQueries({ queryKey: ["equipment", "stationary"] });
      qc.invalidateQueries({ queryKey: ["equipment", "portable"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleEquipmentStatus = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: Equipment["status"] }) => {
      const { error } = await supabase
        .from("equipment")
        .update({ status: nextStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.nextStatus === "maintenance"
          ? "Оборудование переведено в ремонт"
          : "Оборудование снова активно",
      );
      qc.invalidateQueries({ queryKey: ["admin-equipment"] });
      qc.invalidateQueries({ queryKey: ["equipment", "stationary"] });
      qc.invalidateQueries({ queryKey: ["equipment", "portable"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openCreate = () => {
    setEditingEquipment(null);
    setForm({
      name: "",
      category: "stationary",
      status: "active",
      image_url: "",
      description: "",
      specs: "",
    });
    setCatalogOpen(true);
  };

  const openEdit = (item: Equipment) => {
    setEditingEquipment(item);
    setForm({
      name: item.name,
      category: item.category,
      status: item.status,
      image_url: item.image_url || "",
      description: item.description || "",
      specs: item.specs || "",
    });
    setCatalogOpen(true);
  };

  return (
    <div className="space-y-8">
      <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl">
        <CardHeader className="p-8 pb-6">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-2xl font-black text-slate-900">Оборудование (Полный CRUD)</CardTitle>
            <Button onClick={openCreate} className="h-11 rounded-2xl bg-[#005BAB] hover:bg-blue-800">
              <Plus className="mr-2 h-4 w-4" />
              Добавить оборудование
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-8 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(equipment ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="capitalize">{item.category}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      className={
                        item.status === "active"
                          ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                          : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      }
                      onClick={() =>
                        toggleEquipmentStatus.mutate({
                          id: item.id,
                          nextStatus: item.status === "active" ? "maintenance" : "active",
                        })
                      }
                      disabled={toggleEquipmentStatus.isPending}
                    >
                      <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                      {item.status === "active" ? "active" : "maintenance"}
                    </Button>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">{item.description || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" className="border-slate-200" onClick={() => openEdit(item)}>Редактировать</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (window.confirm(`Удалить "${item.name}"?`)) {
                            deleteEquipment.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Удалить
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value as Equipment["category"] }))}>
                  <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stationary">Stationary</SelectItem>
                    <SelectItem value="portable">Portable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as Equipment["status"] }))}>
                  <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Фото URL</Label>
              <Input className="h-11 rounded-2xl" value={form.image_url} onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea className="rounded-2xl" rows={3} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Параметры</Label>
              <Textarea className="rounded-2xl" rows={4} value={form.specs} onChange={(e) => setForm((prev) => ({ ...prev, specs: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" className="h-11 rounded-2xl" onClick={() => setCatalogOpen(false)}>
              Отмена
            </Button>
            <Button
              className="h-11 rounded-2xl bg-[#005BAB] hover:bg-blue-800"
              onClick={() => saveEquipment.mutate()}
              disabled={saveEquipment.isPending}
            >
              {saveEquipment.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
