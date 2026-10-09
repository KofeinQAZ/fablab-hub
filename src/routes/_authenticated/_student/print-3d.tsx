import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FileBox, Loader2, Mail, Phone, Send, Trash2, UploadCloud, Zap, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { analyzeStl, StlViewer, type StlStats } from "@/components/stl-viewer";
import type { BufferGeometry } from "three";

type ModelItem = { id: string; file: File; geometry: BufferGeometry; stats: StlStats };

export const Route = createFileRoute("/_authenticated/_student/print-3d")({
  component: Print3DPage,
});

const db = supabase as any;
const MAX_STL = 50 * 1024 * 1024;

const T = {
  ru: {
    infill: "Заполнение", calc: "Автоподсчёт", volume: "Объём", weight: "Вес", time: "Время печати", size: "Габариты", approx: "Расчёт примерный — итог админ уточнит после нарезки.", h: "ч", m: "мин", badStl: "Не удалось прочитать STL",
    models: "Модели", addModel: "Добавить ещё STL", modelsCount: "моделей", remove: "Убрать",
    back: "К карте", zone: "Зона 3D-печати", title: "3D-печать в FabLab", mentors: "Менторы и сотрудники",
    queueTitle: "Бесплатно по очереди", queueText: "Принтер FabLab. Заявки печатаются по порядку.",
    prioTitle: "Без очереди", prioText: "Частные принтеры, фиксированная цена за заявку.", perRequest: "за заявку",
    filament: "Каталог филамента", perGram: "₸/г", outOfStock: "Нет в наличии",
    form: "Подать заявку на печать", name: "Название модели", file: "STL-файл (до 50 МБ)", chooseFile: "Выбрать STL",
    mode: "Режим печати", material: "Пластик", own: "Свой пластик", catalog: "Из каталога",
    ownLabel: "Подпись на катушке (имя или номер)", ownHint: "Принесите пластик, подписанный этой меткой.",
    pickFilament: "Филамент", grams: "Примерный вес, г", comment: "Комментарий (заполнение, цвет, сроки)",
    total: "Ориентировочно к оплате на месте", submit: "Отправить заявку", success: "Заявка отправлена",
    my: "Мои заявки", empty: "Заявок пока нет", position: "Место в очереди", fullTitle: "Полная проектировка",
    status: { pending: "На рассмотрении", approved: "Одобрена", printing: "Печатается", done: "Готово", rejected: "Отклонена", cancelled: "Отменена" },
    errFile: "Загрузите файл .stl до 50 МБ", errName: "Укажите название", errOwn: "Укажите подпись пластика", errFil: "Выберите филамент и вес",
    queueOff: "Очередь временно закрыта", free: "Бесплатно",
  },
  kz: {
    infill: "Толтыру", calc: "Автоесеп", volume: "Көлем", weight: "Салмақ", time: "Басып шығару уақыты", size: "Өлшемдер", approx: "Есеп шамамен — соңғы бағаны админ нақтылайды.", h: "сағ", m: "мин", badStl: "STL оқылмады",
    models: "Модельдер", addModel: "Тағы STL қосу", modelsCount: "модель", remove: "Алу",
    back: "Картаға", zone: "3D басып шығару аймағы", title: "FabLab-та 3D басып шығару", mentors: "Менторлар мен қызметкерлер",
    queueTitle: "Кезекпен тегін", queueText: "FabLab принтері. Өтінімдер ретімен басылады.",
    prioTitle: "Кезексіз", prioText: "Жеке принтерлер, өтінімге тұрақты баға.", perRequest: "өтінімге",
    filament: "Филамент каталогы", perGram: "₸/г", outOfStock: "Қоймада жоқ",
    form: "Басып шығаруға өтінім", name: "Модель атауы", file: "STL файлы (50 МБ дейін)", chooseFile: "STL таңдау",
    mode: "Режим", material: "Пластик", own: "Өз пластигім", catalog: "Каталогтан",
    ownLabel: "Катушкадағы белгі (аты немесе нөмір)", ownHint: "Осы белгімен қол қойылған пластикті әкеліңіз.",
    pickFilament: "Филамент", grams: "Шамамен салмағы, г", comment: "Пікір (толтыру, түс, мерзім)",
    total: "Орнында төленетін шамамен сома", submit: "Өтінім жіберу", success: "Өтінім жіберілді",
    my: "Менің өтінімдерім", empty: "Өтінімдер жоқ", position: "Кезектегі орын", fullTitle: "Толық жобалау",
    status: { pending: "Қаралуда", approved: "Мақұлданды", printing: "Басылуда", done: "Дайын", rejected: "Қабылданбады", cancelled: "Бас тартылды" },
    errFile: "50 МБ дейінгі .stl файлын жүктеңіз", errName: "Атауын көрсетіңіз", errOwn: "Пластик белгісін көрсетіңіз", errFil: "Филамент пен салмақты таңдаңыз",
    queueOff: "Кезек уақытша жабық", free: "Тегін",
  },
  en: {
    infill: "Infill", calc: "Auto estimate", volume: "Volume", weight: "Weight", time: "Print time", size: "Size", approx: "Approximate — admin confirms the final price after slicing.", h: "h", m: "min", badStl: "Could not read STL",
    models: "Models", addModel: "Add another STL", modelsCount: "models", remove: "Remove",
    back: "Back to map", zone: "3D printing zone", title: "3D printing at FabLab", mentors: "Mentors & staff",
    queueTitle: "Free, in queue", queueText: "FabLab printer. Requests are printed in order.",
    prioTitle: "Skip the queue", prioText: "Private printers, fixed price per request.", perRequest: "per request",
    filament: "Filament catalog", perGram: "₸/g", outOfStock: "Out of stock",
    form: "Submit a print request", name: "Model name", file: "STL file (up to 50 MB)", chooseFile: "Choose STL",
    mode: "Print mode", material: "Plastic", own: "My own plastic", catalog: "From catalog",
    ownLabel: "Label on the spool (name or number)", ownHint: "Bring your plastic marked with this label.",
    pickFilament: "Filament", grams: "Estimated weight, g", comment: "Comment (infill, color, deadline)",
    total: "Estimated, paid on site", submit: "Send request", success: "Request sent",
    my: "My requests", empty: "No requests yet", position: "Queue position", fullTitle: "Full design service",
    status: { pending: "Under review", approved: "Approved", printing: "Printing", done: "Done", rejected: "Rejected", cancelled: "Cancelled" },
    errFile: "Upload an .stl file up to 50 MB", errName: "Enter a name", errOwn: "Enter the plastic label", errFil: "Choose filament and weight",
    queueOff: "Queue is temporarily closed", free: "Free",
  },
};

type Filament = { id: string; material: string; color: string; color_hex: string | null; price_per_gram: number; in_stock: boolean; density: number };

function Print3DPage() {
  const { i18n } = useTranslation();
  const lang = (i18n.language.split("-")[0] as keyof typeof T) in T ? (i18n.language.split("-")[0] as keyof typeof T) : "ru";
  const t = T[lang];
  const loc = (row: any, field: string) => (lang === "ru" ? row?.[field] : row?.[`${field}_${lang}`] || row?.[field]) || "";
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [models, setModels] = useState<ModelItem[]>([]);
  const [mode, setMode] = useState<"queue" | "priority">("queue");
  const [source, setSource] = useState<"own" | "catalog">("own");
  const [ownLabel, setOwnLabel] = useState("");
  const [filamentId, setFilamentId] = useState("");
  const [infill, setInfill] = useState(20);
  const [comment, setComment] = useState("");

  const { data: settings } = useQuery({ queryKey: ["print-settings"], queryFn: async () => (await db.from("print_zone_settings").select("*").eq("id", 1).maybeSingle()).data });
  const { data: mentors = [] } = useQuery({ queryKey: ["print-mentors"], queryFn: async () => (await db.from("print_mentors").select("*").order("sort_order")).data ?? [] });
  const { data: filaments = [] } = useQuery<Filament[]>({ queryKey: ["filaments"], queryFn: async () => (await db.from("filaments").select("*").order("sort_order")).data ?? [] });
  const { data: user } = useQuery({ queryKey: ["auth-user-id"], queryFn: async () => (await supabase.auth.getUser()).data.user });
  const { data: myRequests = [] } = useQuery({
    queryKey: ["my-print-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const rows = (await db.from("print_requests").select("*, filaments(material, color), print_request_files(*)").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [];
      return Promise.all(rows.map(async (r: any) => ({ ...r, position: r.mode === "queue" ? (await db.rpc("print_queue_position", { _request_id: r.id })).data : null })));
    },
  });

  const priorityPrice = Number(settings?.priority_price ?? 0);
  const queueEnabled = settings?.queue_enabled ?? true;
  const priorityEnabled = settings?.priority_enabled ?? true;
  const filament = filaments.find((f) => f.id === filamentId);
  const est = useMemo(() => {
    if (models.length === 0) return null;
    const density = source === "catalog" && filament ? Number(filament.density) : Number(settings?.default_density ?? 1.24);
    const shell = Number(settings?.shell_ratio ?? 0.25);
    const factor = density * (shell + (1 - shell) * infill / 100) * Number(settings?.weight_factor ?? 1);
    const grams = models.reduce((sum, m) => sum + m.stats.volumeCm3 * factor, 0);
    const minutes = Math.round(grams / Number(settings?.print_speed_gph || 12) * 60);
    const volume = models.reduce((sum, m) => sum + m.stats.volumeCm3, 0);
    return { grams: Math.max(1, Math.round(grams)), minutes, volume };
  }, [models, source, filament, settings, infill]);
  const total = useMemo(() => Math.round((mode === "priority" ? priorityPrice : 0) + (source === "catalog" && filament && est ? Number(filament.price_per_gram) * est.grams : 0)), [mode, priorityPrice, source, filament, est]);
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      if (!f.name.toLowerCase().endsWith(".stl") || f.size > MAX_STL) { toast.error(t.errFile); continue; }
      try {
        const parsed = analyzeStl(await f.arrayBuffer());
        setModels((prev) => [...prev, { id: crypto.randomUUID(), file: f, ...parsed }]);
      } catch { toast.error(t.badStl); }
    }
  };
  const removeModel = (id: string) => setModels((prev) => prev.filter((m) => m.id !== id));

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Unauthorized");
      if (models.length === 0) throw new Error(t.errFile);
      const parsed = z.object({ title: z.string().trim().min(2, t.errName).max(120), comment: z.string().trim().max(1000) }).safeParse({ title, comment });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      if (source === "own" && ownLabel.trim().length < 1) throw new Error(t.errOwn);
      if (source === "catalog" && !filament) throw new Error(t.errFil);
      if (mode === "queue" && !queueEnabled) throw new Error(t.queueOff);
      const uploaded: { path: string; m: ModelItem }[] = [];
      for (const m of models) {
        const path = `${user.id}/${crypto.randomUUID()}.stl`;
        const up = await supabase.storage.from("stl-files").upload(path, m.file, { contentType: "model/stl", upsert: false });
        if (up.error) throw up.error;
        uploaded.push({ path, m });
      }
      const first = uploaded[0];
      const { data: req, error } = await db.from("print_requests").insert({
        user_id: user.id, title: parsed.data.title, comment: parsed.data.comment || null, stl_path: first.path, file_name: first.m.file.name.slice(0, 200),
        mode, material_source: source, own_plastic_label: source === "own" ? ownLabel.trim().slice(0, 80) : null,
        filament_id: source === "catalog" ? filamentId : null, grams: est?.grams ?? null, estimated_price: total, infill,
        volume_cm3: est ? Number(est.volume.toFixed(2)) : null, est_grams: est?.grams ?? null, est_minutes: est?.minutes ?? null,
      }).select("id").single();
      if (error) throw error;
      if (uploaded.length > 1) {
        const { error: fErr } = await db.from("print_request_files").insert(
          uploaded.map(({ path, m }) => ({ request_id: req.id, stl_path: path, file_name: m.file.name.slice(0, 200), volume_cm3: Number(m.stats.volumeCm3.toFixed(2)), est_grams: null, est_minutes: null }))
        );
        if (fErr) throw fErr;
      }
    },
    onSuccess: () => {
      toast.success(t.success);
      setTitle(""); setModels([]); setComment(""); setOwnLabel("");
      qc.invalidateQueries({ queryKey: ["my-print-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const box = "border-4 border-foreground bg-background";
  const choice = (active: boolean) => `flex-1 border-2 p-4 text-left transition-colors ${active ? "border-foreground bg-primary text-primary-foreground shadow-[4px_4px_0_var(--foreground)]" : "border-foreground/30 hover:border-foreground"}`;

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6 sm:py-10">
      <Link to="/booking" className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest hover:text-primary"><ArrowLeft className="h-4 w-4" />{t.back}</Link>

      <section className={`${box} grid shadow-[8px_8px_0_var(--primary)] md:grid-cols-[1.3fr_1fr]`}>
        <div className="space-y-4 p-6 sm:p-10">
          <span className="inline-block bg-primary px-3 py-1 text-xs font-black uppercase tracking-widest text-primary-foreground">{t.zone}</span>
          <h1 className="text-3xl font-black uppercase leading-none sm:text-5xl">{t.title}</h1>
          <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">{loc(settings, "description")}</p>
        </div>
        <div className="grid border-t-4 border-foreground md:border-l-4 md:border-t-0">
          {settings?.cover_url && <img src={settings.cover_url} alt="" className="h-48 w-full border-b-4 border-foreground object-cover" />}
          <div className="flex items-start gap-3 border-b-2 border-foreground p-5"><Clock className="mt-1 h-5 w-5 shrink-0" /><div><p className="font-black uppercase">{t.queueTitle} · {t.free}</p><p className="text-sm text-muted-foreground">{t.queueText}</p></div></div>
          <div className="flex items-start gap-3 bg-accent p-5"><Zap className="mt-1 h-5 w-5 shrink-0" /><div><p className="font-black uppercase">{t.prioTitle} · {priorityPrice.toLocaleString()} ₸ {t.perRequest}</p><p className="text-sm text-muted-foreground">{t.prioText}</p></div></div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section className={`${box} p-5 sm:p-8`}>
          <h2 className="mb-6 text-2xl font-black uppercase">{t.form}</h2>
          <div className="space-y-5">
            <div className="space-y-2"><Label htmlFor="p-title">{t.name}</Label><Input id="p-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className="h-12 rounded-none border-2" /></div>
            <div className="space-y-2">
              <Label>{t.file}</Label>
              <input ref={fileRef} type="file" accept=".stl" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
              <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-3 border-2 border-dashed border-foreground p-5 text-left hover:bg-muted">
                <UploadCloud className="h-6 w-6" />
                <span className="truncate font-bold">{models.length > 0 ? t.addModel : t.chooseFile}</span>
              </button>
            </div>
            {models.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t.models}: {models.length}</p>
                {models.map((m) => (
                  <div key={m.id} className="border-2 border-foreground">
                    <div className="flex items-center gap-2 border-b-2 border-foreground bg-muted px-3 py-2">
                      <FileBox className="h-4 w-4 shrink-0 text-primary" />
                      <span className="flex-1 truncate text-sm font-bold">{m.file.name} · {(m.file.size / 1048576).toFixed(1)} МБ · {m.stats.volumeCm3.toFixed(1)} см³</span>
                      <button type="button" onClick={() => removeModel(m.id)} aria-label={t.remove} className="shrink-0 p-1 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <StlViewer geometry={m.geometry} />
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2"><Label>{t.infill}</Label><div className="grid grid-cols-4 gap-2">
              {[10, 20, 50, 100].map((v) => <button key={v} type="button" onClick={() => setInfill(v)} className={`border-2 py-3 font-black ${infill === v ? "border-foreground bg-foreground text-background" : "border-foreground/30 hover:border-foreground"}`}>{v}%</button>)}
            </div></div>
            {models.length > 0 && est && (
              <div className="border-2 border-foreground">
                <p className="border-b-2 border-foreground bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-primary-foreground">{t.calc}{models.length > 1 ? ` · ${models.length} ${t.modelsCount}` : ""}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3">
                  {[[t.volume, `${est.volume.toFixed(1)} см³`], [t.weight, `≈ ${est.grams} г`], [t.time, `≈ ${Math.floor(est.minutes / 60)} ${t.h} ${est.minutes % 60} ${t.m}`]].map(([k, v]) => (
                    <div key={k} className="border-foreground/20 p-3 [&:not(:last-child)]:border-r-2"><p className="text-xs font-bold uppercase text-muted-foreground">{k}</p><p className="text-lg font-black">{v}</p></div>
                  ))}
                </div>
                <p className="border-t-2 border-foreground/20 px-4 py-2 text-xs text-muted-foreground">{t.approx}</p>
              </div>
            )}
            <div className="space-y-2"><Label>{t.mode}</Label><div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" disabled={!queueEnabled} onClick={() => setMode("queue")} className={`${choice(mode === "queue")} disabled:opacity-40`}><p className="font-black uppercase">{t.queueTitle}</p><p className="text-sm opacity-80">{queueEnabled ? t.free : t.queueOff}</p></button>
              {priorityEnabled && <button type="button" onClick={() => setMode("priority")} className={choice(mode === "priority")}><p className="font-black uppercase">{t.prioTitle}</p><p className="text-sm opacity-80">{priorityPrice.toLocaleString()} ₸</p></button>}
            </div></div>
            <div className="space-y-2"><Label>{t.material}</Label><div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setSource("own")} className={choice(source === "own")}><p className="font-black uppercase">{t.own}</p></button>
              <button type="button" onClick={() => setSource("catalog")} className={choice(source === "catalog")}><p className="font-black uppercase">{t.catalog}</p></button>
            </div></div>
            {source === "own" ? (
              <div className="space-y-2"><Label htmlFor="p-own">{t.ownLabel}</Label><Input id="p-own" value={ownLabel} maxLength={80} onChange={(e) => setOwnLabel(e.target.value)} className="h-12 rounded-none border-2" /><p className="text-sm text-muted-foreground">{t.ownHint}</p></div>
            ) : (
              <div className="grid gap-4 ">
                <div className="space-y-2"><Label htmlFor="p-fil">{t.pickFilament}</Label><select id="p-fil" value={filamentId} onChange={(e) => setFilamentId(e.target.value)} className="h-12 w-full rounded-none border-2 border-input bg-background px-3">
                  <option value="">—</option>{filaments.filter((f) => f.in_stock).map((f) => <option key={f.id} value={f.id}>{f.material} · {f.color} · {f.price_per_gram} {t.perGram}</option>)}
                </select></div>
              </div>
            )}
            <div className="space-y-2"><Label htmlFor="p-c">{t.comment}</Label><Textarea id="p-c" value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} className="min-h-24 rounded-none border-2" /></div>
            <div className="flex items-center justify-between border-2 border-foreground bg-muted p-4"><span className="text-sm font-bold uppercase">{t.total}</span><span className="text-2xl font-black">{total.toLocaleString()} ₸</span></div>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="h-14 w-full rounded-none border-2 border-foreground font-black uppercase tracking-widest shadow-[4px_4px_0_var(--foreground)]">
              {submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{t.submit}
            </Button>
          </div>
        </section>

        <div className="space-y-8">
          <section className={`${box} p-5`}>
            <h2 className="mb-4 text-xl font-black uppercase">{t.my}</h2>
            {myRequests.length === 0 ? <p className="text-muted-foreground">{t.empty}</p> : <ul className="space-y-3">
              {myRequests.map((r: any) => (
                <li key={r.id} className="border-2 border-foreground p-3">
                  <div className="flex items-start justify-between gap-2"><p className="font-black">{r.title}</p><span className="shrink-0 bg-primary px-2 py-0.5 text-xs font-black uppercase text-primary-foreground">{(t.status as any)[r.status]}</span></div>
                  <p className="text-sm text-muted-foreground">{r.mode === "queue" ? t.queueTitle : t.prioTitle} · {Number(r.estimated_price).toLocaleString()} ₸{r.print_request_files?.length > 1 ? ` · ${r.print_request_files.length} ${t.modelsCount}` : ""}</p>
                  {r.position && <p className="mt-1 text-sm font-black text-primary">{t.position}: #{r.position}</p>}
                  {r.admin_comment && <p className="mt-1 text-sm italic">{r.admin_comment}</p>}
                </li>
              ))}
            </ul>}
          </section>

          <section className={`${box} p-5`}>
            <h2 className="mb-4 text-xl font-black uppercase">{t.filament}</h2>
            <ul className="divide-y-2 divide-foreground/10">
              {filaments.map((f) => (
                <li key={f.id} className={`flex items-center gap-3 py-2 ${f.in_stock ? "" : "opacity-50"}`}>
                  <span className="h-5 w-5 shrink-0 border-2 border-foreground" style={{ background: f.color_hex ?? undefined }} />
                  <span className="flex-1 font-bold">{f.material} · {f.color}</span>
                  <span className="font-black">{f.in_stock ? `${f.price_per_gram} ${t.perGram}` : t.outOfStock}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${box} bg-foreground p-5 text-background`}>
            <h2 className="mb-2 text-xl font-black uppercase">{t.fullTitle}</h2>
            <p className="mb-4 whitespace-pre-line text-sm opacity-80">{loc(settings, "contact_text")}</p>
            <div className="space-y-2 text-sm font-bold">
              {settings?.contact_phone && <a href={`tel:${settings.contact_phone}`} className="flex items-center gap-2 hover:underline"><Phone className="h-4 w-4" />{settings.contact_phone}</a>}
              {settings?.contact_telegram && <a href={`https://t.me/${String(settings.contact_telegram).replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline"><Send className="h-4 w-4" />{settings.contact_telegram}</a>}
              {settings?.contact_email && <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2 hover:underline"><Mail className="h-4 w-4" />{settings.contact_email}</a>}
            </div>
          </section>
        </div>
      </div>

      {mentors.length > 0 && (
        <section>
          <h2 className="mb-5 flex items-center gap-3 text-2xl font-black uppercase"><Users className="h-6 w-6" />{t.mentors}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {mentors.map((m: any) => (
              <div key={m.id} className={`${box} shadow-[4px_4px_0_var(--foreground)]`}>
                <div className="aspect-square border-b-4 border-foreground bg-muted">{m.photo_url ? <img src={m.photo_url} alt={m.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-5xl font-black">{m.name[0]}</div>}</div>
                <div className="p-3"><p className="font-black uppercase leading-tight">{m.name}</p><p className="text-sm text-muted-foreground">{loc(m, "role_title")}</p>{m.contact && <p className="mt-1 break-all text-sm font-bold">{m.contact}</p>}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
