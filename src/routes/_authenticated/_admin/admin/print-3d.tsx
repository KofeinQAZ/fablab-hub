import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload, useUploadFolder } from "@/components/image-upload";

export const Route = createFileRoute("/_authenticated/_admin/admin/print-3d")({
  component: AdminPrint3D,
});

const db = supabase as any;
const STATUSES: Record<string, string> = { pending: "На рассмотрении", approved: "Одобрена", printing: "Печатается", done: "Готово", rejected: "Отклонена", cancelled: "Отменена" };
const box = "border-4 border-foreground bg-background p-5 shadow-[4px_4px_0_var(--foreground)]";
const tabs = [["requests", "Заявки"], ["settings", "Страница и цены"], ["mentors", "Менторы"], ["filaments", "Филамент"]] as const;

function AdminPrint3D() {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("requests");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black uppercase">3D-печать</h1>
      <div className="flex flex-wrap gap-2">
        {tabs.map(([k, l]) => <Button key={k} variant={tab === k ? "default" : "outline"} onClick={() => setTab(k)} className="rounded-none border-2 border-foreground font-black uppercase">{l}</Button>)}
      </div>
      {tab === "requests" && <Requests />}
      {tab === "settings" && <Settings />}
      {tab === "mentors" && <Mentors />}
      {tab === "filaments" && <Filaments />}
    </div>
  );
}

function Requests() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("active");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-print-requests"],
    queryFn: async () => (await db.from("print_requests").select("*, profiles(name, contact_phone, contact_telegram), filaments(material, color), print_request_files(*)").order("created_at")).data ?? [],
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => { const { error } = await db.from("print_requests").update(patch).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Сохранено"); qc.invalidateQueries({ queryKey: ["admin-print-requests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const download = async (path: string) => {
    const { data: s, error } = await supabase.storage.from("stl-files").createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    window.open(s.signedUrl, "_blank");
  };
  const active = ["pending", "approved", "printing"];
  const rows = data.filter((r: any) => filter === "all" || (filter === "active" ? active.includes(r.status) : r.mode === filter && active.includes(r.status)));
  let queueNo = 0;
  const queuePos: Record<string, number> = {};
  data.forEach((r: any) => { if (r.mode === "queue" && active.includes(r.status)) queuePos[r.id] = ++queueNo; });

  if (isLoading) return <Loader2 className="animate-spin" />;
  return (
    <div className="space-y-4">
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-11 rounded-none border-2 border-foreground bg-background px-3 font-bold">
        <option value="active">Активные</option><option value="queue">Бесплатная очередь</option><option value="priority">Без очереди</option><option value="all">Все</option>
      </select>
      {rows.length === 0 && <p className="text-muted-foreground">Заявок нет</p>}
      {rows.map((r: any) => <RequestCard key={r.id} r={r} pos={queuePos[r.id]} onDownload={download} onSave={(patch) => update.mutate({ id: r.id, patch })} />)}
    </div>
  );
}

function RequestCard({ r, pos, onDownload, onSave }: { r: any; pos?: number; onDownload: (p: string) => void; onSave: (p: Record<string, unknown>) => void }) {
  const [comment, setComment] = useState(r.admin_comment ?? "");
  return (
    <div className={box}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black">{pos ? `#${pos} · ` : ""}{r.title}</p>
          <p className="text-sm text-muted-foreground">{r.profiles?.name} · {r.profiles?.contact_phone || r.profiles?.contact_telegram || ""} · {new Date(r.created_at).toLocaleString("ru-RU")}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-black uppercase ${r.mode === "priority" ? "bg-accent" : "bg-primary text-primary-foreground"}`}>{r.mode === "priority" ? "Без очереди" : "Очередь"}</span>
      </div>
      <div className="mt-3 grid gap-1 text-sm">
        <p><b>Пластик:</b> {r.material_source === "own" ? `свой, подпись «${r.own_plastic_label}»` : `${r.filaments?.material ?? ""} ${r.filaments?.color ?? ""}, ${r.grams} г`}</p>
        {r.est_grams && <p><b>Автоподсчёт:</b> {r.volume_cm3} см³ · заполнение {r.infill}% · ≈ {r.est_grams} г · ≈ {Math.floor((r.est_minutes ?? 0) / 60)} ч {(r.est_minutes ?? 0) % 60} мин</p>}
        <p><b>К оплате на месте:</b> {Number(r.estimated_price).toLocaleString()} ₸ {r.is_paid ? "· оплачено" : ""}</p>
        {r.comment && <p><b>Комментарий:</b> {r.comment}</p>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(r.print_request_files?.length ? r.print_request_files : [{ stl_path: r.stl_path, file_name: r.file_name }]).map((f: any, i: number) => (
          <Button key={i} variant="outline" size="sm" onClick={() => onDownload(f.stl_path)} className="rounded-none border-2"><Download className="mr-1 h-4 w-4" />{f.file_name}</Button>
        ))}
        <select value={r.status} onChange={(e) => onSave({ status: e.target.value })} className="h-9 rounded-none border-2 border-foreground bg-background px-2 text-sm font-bold">
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={r.is_paid} onChange={(e) => onSave({ is_paid: e.target.checked })} />Оплачено</label>
      </div>
      <div className="mt-3 flex gap-2"><Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий для пользователя" className="rounded-none border-2" /><Button size="sm" onClick={() => onSave({ admin_comment: comment || null })} className="rounded-none"><Save className="h-4 w-4" /></Button></div>
    </div>
  );
}

function Settings() {
  const qc = useQueryClient();
  const folder = useUploadFolder();
  const { data } = useQuery({ queryKey: ["print-settings"], queryFn: async () => (await db.from("print_zone_settings").select("*").eq("id", 1).maybeSingle()).data });
  const [f, setF] = useState<any>(null);
  useEffect(() => { if (data) setF(data); }, [data]);
  const save = useMutation({
    mutationFn: async () => { const { id: _id, updated_at: _u, ...rest } = f; const { error } = await db.from("print_zone_settings").upsert({ id: 1, ...rest, priority_price: Number(rest.priority_price) || 0, price_per_hour: Number(rest.price_per_hour) || 0, print_speed_gph: Number(rest.print_speed_gph) || 12, weight_factor: Number(rest.weight_factor) || 1, shell_ratio: Math.min(1, Math.max(0, Number(rest.shell_ratio) || 0)), default_density: Number(rest.default_density) || 1.24 }); if (error) throw error; },
    onSuccess: () => { toast.success("Сохранено"); qc.invalidateQueries({ queryKey: ["print-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!f) return <Loader2 className="animate-spin" />;
  const field = (k: string, label: string, area = false) => (
    <div className="space-y-1"><Label>{label}</Label>{area ? <Textarea value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="min-h-24 rounded-none border-2" /> : <Input value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="rounded-none border-2" />}</div>
  );
  return (
    <div className={`${box} space-y-4`}>
      <div className="space-y-1"><Label>Обложка</Label><ImageUpload value={f.cover_url} onChange={(url) => setF({ ...f, cover_url: url })} bucket="equipment-images" folder={folder} /></div>
      {field("description", "Описание (RU)", true)}{field("description_kz", "Описание (KZ)", true)}{field("description_en", "Описание (EN)", true)}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1"><Label>Цена без очереди, ₸</Label><Input type="number" min="0" value={f.priority_price} onChange={(e) => setF({ ...f, priority_price: e.target.value })} className="rounded-none border-2" /></div>
        <div className="space-y-1"><Label>Час работы принтера, ₸</Label><Input type="number" min="0" value={f.price_per_hour ?? 0} onChange={(e) => setF({ ...f, price_per_hour: e.target.value })} className="rounded-none border-2" /></div>
        <label className="flex items-center gap-2 pt-6 font-bold"><input type="checkbox" checked={f.queue_enabled} onChange={(e) => setF({ ...f, queue_enabled: e.target.checked })} />Бесплатная очередь открыта</label>
        <label className="flex items-center gap-2 pt-6 font-bold"><input type="checkbox" checked={f.priority_enabled} onChange={(e) => setF({ ...f, priority_enabled: e.target.checked })} />Печать без очереди доступна</label>
      </div>
      <h3 className="pt-2 text-lg font-black uppercase">Автоподсчёт</h3>
      <p className="text-sm text-muted-foreground">Вес = объём × плотность × (стенки + (1 − стенки) × заполнение) × коэффициент. Время = вес ÷ скорость. Сверь пару моделей со слайсером и подкрути.</p>
      <div className="grid gap-4 sm:grid-cols-4">
        {([["print_speed_gph", "Скорость принтера, г/час"], ["weight_factor", "Коэффициент веса"], ["shell_ratio", "Доля стенок (0–1)"], ["default_density", "Плотность своего пластика, г/см³"]] as const).map(([k, l]) => (
          <div key={k} className="space-y-1"><Label>{l}</Label><Input type="number" step="0.01" min="0" value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="rounded-none border-2" /></div>
        ))}
      </div>
      <h3 className="pt-2 text-lg font-black uppercase">Полная проектировка — контакты</h3>
      {field("contact_text", "Текст (RU)", true)}{field("contact_text_kz", "Текст (KZ)", true)}{field("contact_text_en", "Текст (EN)", true)}
      <div className="grid gap-4 sm:grid-cols-3">{field("contact_phone", "Телефон")}{field("contact_telegram", "Telegram (@username)")}{field("contact_email", "Email")}</div>
      <Button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-none border-2 border-foreground font-black uppercase"><Save className="mr-2 h-4 w-4" />Сохранить</Button>
    </div>
  );
}

function Mentors() {
  const qc = useQueryClient();
  const folder = useUploadFolder();
  const { data = [] } = useQuery({ queryKey: ["print-mentors"], queryFn: async () => (await db.from("print_mentors").select("*").order("sort_order")).data ?? [] });
  const refresh = () => qc.invalidateQueries({ queryKey: ["print-mentors"] });
  const add = async () => { const { error } = await db.from("print_mentors").insert({ name: "Новый ментор", sort_order: data.length }); if (error) toast.error(error.message); refresh(); };
  return (
    <div className="space-y-4">
      <Button onClick={add} className="rounded-none border-2 border-foreground font-black uppercase"><Plus className="mr-2 h-4 w-4" />Добавить ментора</Button>
      <div className="grid gap-4 md:grid-cols-2">{data.map((m: any) => <MentorEditor key={m.id} m={m} folder={folder} onDone={refresh} />)}</div>
    </div>
  );
}

function MentorEditor({ m, folder, onDone }: { m: any; folder: string; onDone: () => void }) {
  const [f, setF] = useState(m);
  const save = async () => { const { id, created_at: _c, ...rest } = f; const { error } = await db.from("print_mentors").update({ ...rest, sort_order: Number(rest.sort_order) || 0 }).eq("id", id); error ? toast.error(error.message) : toast.success("Сохранено"); onDone(); };
  const remove = async () => { if (!confirm("Удалить ментора?")) return; await db.from("print_mentors").delete().eq("id", m.id); onDone(); };
  const inp = (k: string, label: string) => <div className="space-y-1"><Label>{label}</Label><Input value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="rounded-none border-2" /></div>;
  return (
    <div className={`${box} space-y-3`}>
      <ImageUpload value={f.photo_url} onChange={(url) => setF({ ...f, photo_url: url })} bucket="equipment-images" folder={folder} square />
      {inp("name", "Имя")}{inp("role_title", "Должность (RU)")}{inp("role_title_kz", "Должность (KZ)")}{inp("role_title_en", "Должность (EN)")}{inp("contact", "Контакт (телефон / Telegram)")}{inp("sort_order", "Порядок")}
      <div className="flex gap-2"><Button onClick={save} className="rounded-none"><Save className="mr-2 h-4 w-4" />Сохранить</Button><Button variant="destructive" onClick={remove} className="rounded-none"><Trash2 className="h-4 w-4" /></Button></div>
    </div>
  );
}

function Filaments() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["filaments"], queryFn: async () => (await db.from("filaments").select("*").order("sort_order")).data ?? [] });
  const refresh = () => qc.invalidateQueries({ queryKey: ["filaments"] });
  const add = async () => { const { error } = await db.from("filaments").insert({ material: "PLA", color: "Новый", price_per_gram: 30, sort_order: data.length }); if (error) toast.error(error.message); refresh(); };
  return (
    <div className="space-y-3">
      <Button onClick={add} className="rounded-none border-2 border-foreground font-black uppercase"><Plus className="mr-2 h-4 w-4" />Добавить филамент</Button>
      {data.map((x: any) => <FilamentRow key={x.id} x={x} onDone={refresh} />)}
    </div>
  );
}

function FilamentRow({ x, onDone }: { x: any; onDone: () => void }) {
  const [f, setF] = useState(x);
  const save = async () => { const { error } = await db.from("filaments").update({ material: f.material, color: f.color, color_hex: f.color_hex, price_per_gram: Number(f.price_per_gram) || 0, density: Number(f.density) || 1.24, in_stock: f.in_stock }).eq("id", x.id); error ? toast.error(error.message) : toast.success("Сохранено"); onDone(); };
  const remove = async () => { if (!confirm("Удалить?")) return; await db.from("filaments").delete().eq("id", x.id); onDone(); };
  return (
    <div className={`${box} grid items-end gap-3 sm:grid-cols-[1fr_1fr_70px_110px_110px_auto_auto]`}>
      <div className="space-y-1"><Label>Материал</Label><Input value={f.material} onChange={(e) => setF({ ...f, material: e.target.value })} className="rounded-none border-2" /></div>
      <div className="space-y-1"><Label>Цвет</Label><Input value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} className="rounded-none border-2" /></div>
      <div className="space-y-1"><Label>Образец</Label><input type="color" value={f.color_hex ?? "#ffffff"} onChange={(e) => setF({ ...f, color_hex: e.target.value })} className="h-10 w-full border-2 border-foreground" /></div>
      <div className="space-y-1"><Label>₸ за грамм</Label><Input type="number" min="0" step="0.1" value={f.price_per_gram} onChange={(e) => setF({ ...f, price_per_gram: e.target.value })} className="rounded-none border-2" /></div>
      <div className="space-y-1"><Label>г/см³</Label><Input type="number" min="0" step="0.01" value={f.density} onChange={(e) => setF({ ...f, density: e.target.value })} className="rounded-none border-2" /></div>
      <label className="flex h-10 items-center gap-2 font-bold"><input type="checkbox" checked={f.in_stock} onChange={(e) => setF({ ...f, in_stock: e.target.checked })} />В наличии</label>
      <div className="flex gap-2"><Button onClick={save} className="rounded-none"><Save className="h-4 w-4" /></Button><Button variant="destructive" onClick={remove} className="rounded-none"><Trash2 className="h-4 w-4" /></Button></div>
    </div>
  );
}
