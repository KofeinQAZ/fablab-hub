import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Package, Plus, QrCode, Trash2, Pencil, Undo2, X, Printer } from "lucide-react";
import type { InventoryItem } from "@/components/inventory-item-dialog";

export const Route = createFileRoute("/_authenticated/_admin/admin/inventory")({
  component: AdminInventoryPage,
});

type FormState = {
  id?: string;
  name: string;
  name_kz: string;
  name_en: string;
  description: string;
  description_kz: string;
  description_en: string;
  inventory_number: string;
  image_url: string;
  status: "available" | "checked_out" | "maintenance";
};

const emptyForm: FormState = {
  name: "",
  name_kz: "",
  name_en: "",
  description: "",
  description_kz: "",
  description_en: "",
  inventory_number: "",
  image_url: "",
  status: "available",
};

const qrUrlFor = (id: string, size = 180) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    window.location.origin + "/booking?inventoryId=" + id,
  )}`;

function AdminInventoryPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [qrItem, setQrItem] = useState<InventoryItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inventory_items")
        .select("*, holder:profiles!inventory_items_holder_id_fkey(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (InventoryItem & { holder?: { name: string } | null })[];
    },
  });

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        name: f.name.trim(),
        name_kz: f.name_kz.trim() || null,
        name_en: f.name_en.trim() || null,
        description: f.description.trim() || null,
        description_kz: f.description_kz.trim() || null,
        description_en: f.description_en.trim() || null,
        inventory_number: f.inventory_number.trim() || `ITEM-${Math.floor(Math.random() * 10000)}`,
        image_url: f.image_url.trim() || null,
        status: f.status,
      };
      if (f.id) {
        const { error } = await (supabase as any).from("inventory_items").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("inventory_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Сохранено");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["admin-inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Предмет удалён");
      qc.invalidateQueries({ queryKey: ["admin-inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const forceReturn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("return_inventory_item", { _item_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Предмет возвращён на склад");
      qc.invalidateQueries({ queryKey: ["admin-inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const printQr = () => {
    if (!qrItem) return;
    const w = window.open("", "_blank", "width=600,height=700");
    if (!w) return;
    w.document.write(`
      <html><head><title>QR — ${qrItem.name}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
        .card{border:4px solid #0f172a;padding:24px;text-align:center;width:320px}
        img{width:220px;height:220px}
        h1{font-size:20px;text-transform:uppercase;margin:16px 0 4px}
        p{font-size:12px;letter-spacing:2px;color:#64748b;margin:0}
      </style></head>
      <body><div class="card">
        <img src="${qrUrlFor(qrItem.id, 300)}" alt="QR" />
        <h1>${qrItem.name}</h1>
        <p>#${qrItem.inventory_number}</p>
      </div>
      <script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter">Инвентарь</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">
            Портативные инструменты, QR-коды и выдача на руки
          </p>
        </div>
        <Button
          onClick={() => setForm({ ...emptyForm })}
          className="h-12 rounded-none border-2 border-slate-900 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all"
        >
          <Plus className="h-4 w-4 mr-2" /> Добавить предмет
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 border-4 border-slate-900 bg-slate-200 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border-4 border-dashed border-slate-300 p-12 text-center font-black uppercase tracking-widest text-slate-400 text-xs">
          Инвентарь пуст — добавьте первый предмет
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="border-4 border-slate-900 bg-white shadow-[6px_6px_0_#0f172a] p-5 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 shrink-0 border-2 border-slate-900 bg-slate-100 flex items-center justify-center overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-lg uppercase tracking-tight text-slate-900 leading-tight truncate">{item.name}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">#{item.inventory_number}</p>
                  <span
                    className={`inline-block mt-2 font-black uppercase tracking-widest text-[9px] border-2 border-slate-900 px-2 py-1 ${
                      item.status === "available"
                        ? "bg-emerald-400 text-slate-900"
                        : item.status === "checked_out"
                          ? "bg-amber-400 text-slate-900"
                          : "bg-rose-500 text-white"
                    }`}
                  >
                    {item.status === "available" ? "На складе" : item.status === "checked_out" ? "На руках" : "Обслуживание"}
                  </span>
                  {item.status === "checked_out" && (
                    <p className="text-[11px] font-bold text-slate-600 mt-2 truncate">
                      У: {(item as any).holder?.name ?? "—"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-3 border-t-2 border-slate-100">
                <Button
                  onClick={() => setQrItem(item)}
                  variant="outline"
                  className="h-10 rounded-none border-2 border-slate-900 font-black uppercase tracking-widest text-[10px]"
                >
                  <QrCode className="h-4 w-4 mr-1" /> QR
                </Button>
                <Button
                  onClick={() =>
                    setForm({
                      id: item.id,
                      name: item.name ?? "",
                      name_kz: item.name_kz ?? "",
                      name_en: item.name_en ?? "",
                      description: item.description ?? "",
                      description_kz: item.description_kz ?? "",
                      description_en: item.description_en ?? "",
                      inventory_number: item.inventory_number ?? "",
                      image_url: item.image_url ?? "",
                      status: item.status,
                    })
                  }
                  variant="outline"
                  className="h-10 rounded-none border-2 border-slate-900 font-black uppercase tracking-widest text-[10px]"
                >
                  <Pencil className="h-4 w-4 mr-1" /> Изменить
                </Button>
                {item.status === "checked_out" && (
                  <Button
                    onClick={() => forceReturn.mutate(item.id)}
                    className="h-10 rounded-none border-2 border-slate-900 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px]"
                  >
                    <Undo2 className="h-4 w-4 mr-1" /> Вернуть
                  </Button>
                )}
                <Button
                  onClick={() => {
                    if (confirm(`Удалить «${item.name}»?`)) remove.mutate(item.id);
                  }}
                  className="h-10 rounded-none border-2 border-slate-900 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest text-[10px]"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ФОРМА */}
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-w-xl border-4 border-slate-900 rounded-none bg-white p-0 shadow-[12px_12px_0_#0f172a] max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div className="p-5 border-b-4 border-slate-900 bg-blue-600 text-white flex justify-between items-center">
            <DialogTitle className="font-black text-xl uppercase tracking-tighter">
              {form?.id ? "Редактировать предмет" : "Новый предмет"}
            </DialogTitle>
            <button onClick={() => setForm(null)} className="p-1.5 bg-white text-slate-900 border-2 border-slate-900">
              <X className="h-4 w-4" />
            </button>
          </div>
          {form && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(form);
              }}
              className="p-6 space-y-4"
            >
              <div className="space-y-1.5">
                <Label className="font-black uppercase tracking-widest text-[10px]">Название (RU)</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-none border-2 border-slate-900" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-black uppercase tracking-widest text-[10px]">Название (KZ)</Label>
                  <Input value={form.name_kz} onChange={(e) => setForm({ ...form, name_kz: e.target.value })} className="rounded-none border-2 border-slate-900" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-black uppercase tracking-widest text-[10px]">Название (EN)</Label>
                  <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="rounded-none border-2 border-slate-900" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-black uppercase tracking-widest text-[10px]">Инв. номер</Label>
                  <Input placeholder="CAM-01" value={form.inventory_number} onChange={(e) => setForm({ ...form, inventory_number: e.target.value })} className="rounded-none border-2 border-slate-900" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-black uppercase tracking-widest text-[10px]">Статус</Label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })}
                    className="w-full h-10 px-3 rounded-none border-2 border-slate-900 bg-white font-bold text-sm"
                  >
                    <option value="available">На складе</option>
                    <option value="maintenance">Обслуживание</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="font-black uppercase tracking-widest text-[10px]">Ссылка на фото</Label>
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="rounded-none border-2 border-slate-900" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-black uppercase tracking-widest text-[10px]">Описание (RU)</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-none border-2 border-slate-900 min-h-24" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-black uppercase tracking-widest text-[10px]">Описание (KZ)</Label>
                  <Textarea value={form.description_kz} onChange={(e) => setForm({ ...form, description_kz: e.target.value })} className="rounded-none border-2 border-slate-900 min-h-20" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-black uppercase tracking-widest text-[10px]">Описание (EN)</Label>
                  <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} className="rounded-none border-2 border-slate-900 min-h-20" />
                </div>
              </div>
              <Button
                type="submit"
                disabled={save.isPending}
                className="w-full h-14 rounded-none border-4 border-slate-900 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs shadow-[6px_6px_0_#0f172a]"
              >
                {save.isPending ? "Сохраняем..." : "Сохранить и создать QR"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* QR */}
      <Dialog open={!!qrItem} onOpenChange={(v) => !v && setQrItem(null)}>
        <DialogContent className="max-w-sm border-4 border-slate-900 rounded-none bg-white shadow-[12px_12px_0_#0f172a]">
          <DialogTitle className="font-black text-xl uppercase tracking-tighter text-center">QR предмета</DialogTitle>
          <div className="flex flex-col items-center gap-3 p-4 border-4 border-slate-900">
            {qrItem && <img src={qrUrlFor(qrItem.id)} alt="QR" className="h-44 w-44" />}
            <div className="text-center">
              <div className="font-black uppercase tracking-tight text-slate-900">{qrItem?.name}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">#{qrItem?.inventory_number}</div>
            </div>
          </div>
          <Button
            onClick={printQr}
            className="w-full h-12 rounded-none border-2 border-slate-900 bg-slate-900 text-white font-black uppercase tracking-widest text-xs"
          >
            <Printer className="h-4 w-4 mr-2" /> Печать наклейки
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
