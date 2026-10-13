import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { toast } from "sonner";
import { BarChart3, FolderKanban, Pencil, Trash2, Mail, Phone, Send, Search, ExternalLink } from "lucide-react";

const STATUS: Record<string, string> = { in_progress: "В работе", completed: "Завершён", paused: "На паузе" };
const block = "bg-white border-4 border-slate-900 p-6 shadow-[6px_6px_0_#0f172a]";

export function AdminProjectsOverview({ clubs }: { clubs: any[] }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "completed">("all");
  const [editing, setEditing] = useState<any | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["admin-projects-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`*, clubs(id, title),
          author:profiles!projects_author_id_fkey (name, photo_url, contact_email, contact_phone, contact_telegram),
          project_updates (id, created_at), project_members (id)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const monthAgo = Date.now() - 30 * 864e5;
  const scored = useMemo(() => projects.map((p) => {
    const updates = p.project_updates ?? [];
    const recent = updates.filter((u: any) => new Date(u.created_at).getTime() > monthAgo).length;
    const last = updates.reduce((m: number, u: any) => Math.max(m, new Date(u.created_at).getTime()), new Date(p.updated_at).getTime());
    return { ...p, updatesCount: updates.length, recent, members: (p.project_members?.length ?? 0) + 1, last };
  }), [projects]);

  const topProjects = [...scored].filter((p) => p.is_approved).sort((a, b) => b.recent - a.recent || b.updatesCount - a.updatesCount).slice(0, 5);
  const topClubs = clubs.filter((c) => c.is_approved).map((c) => {
    const ps = scored.filter((p) => p.club_id === c.id);
    return { ...c, pc: ps.length, members: c.club_members?.length ?? 0, recent: ps.reduce((s, p) => s + p.recent, 0) };
  }).sort((a, b) => b.recent - a.recent || b.members - a.members).slice(0, 5);

  const stats = [
    { label: "Всего проектов", value: scored.length },
    { label: "В работе", value: scored.filter((p) => p.is_approved && p.status === "in_progress").length },
    { label: "Ждут проверки", value: scored.filter((p) => !p.is_approved && !p.is_rejected).length },
    { label: "Завершено", value: scored.filter((p) => p.status === "completed").length },
    { label: "Клубов", value: clubs.filter((c) => c.is_approved).length },
    { label: "Девлогов за 30 дн.", value: scored.reduce((s, p) => s + p.recent, 0) },
  ];

  const list = scored.filter((p) => {
    if (filter === "active" && !(p.is_approved && p.status === "in_progress")) return false;
    if (filter === "pending" && (p.is_approved || p.is_rejected)) return false;
    if (filter === "completed" && p.status !== "completed") return false;
    const s = q.trim().toLowerCase();
    return !s || [p.title, p.author?.name, p.clubs?.title].some((v) => v?.toLowerCase().includes(s));
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-projects-overview"] });
    qc.invalidateQueries({ queryKey: ["admin-all-projects"] });
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("project_updates").delete().eq("project_id", id);
      await supabase.from("project_members").delete().eq("project_id", id);
      await supabase.from("project_applications").delete().eq("project_id", id);
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Проект удалён"); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async (p: any) => {
      const { error } = await supabase.from("projects").update({
        title: p.title, description: p.description, status: p.status,
        club_id: p.club_id || null, is_looking_for_team: p.is_looking_for_team,
      }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Сохранено"); setEditing(null); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  const badge = (p: any) => !p.is_approved && !p.is_rejected ? ["Проверка", "bg-amber-300"] : p.is_rejected ? ["Отклонён", "bg-red-200"] : [STATUS[p.status] ?? p.status, p.status === "in_progress" ? "bg-emerald-300" : "bg-slate-200"];

  return (
    <>
      <div className={block}>
        <h2 className="mb-6 flex items-center gap-3 text-xl font-black uppercase tracking-tight"><BarChart3 className="h-5 w-5 text-blue-600" /> Статистика</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="border-2 border-slate-900 bg-slate-50 p-3">
              <div className="text-3xl font-black text-slate-900">{s.value}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-black uppercase tracking-widest">Самые активные проекты</h3>
            {topProjects.length === 0 ? <p className="text-xs font-bold uppercase text-slate-400">Пока нет данных</p> : topProjects.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 border-b-2 border-slate-100 py-2 text-sm">
                <span className="w-5 font-black text-blue-600">{i + 1}</span>
                <span className="flex-1 truncate font-bold">{p.title}</span>
                <span className="text-xs font-bold text-slate-500">{p.recent} за 30 дн. · {p.updatesCount} всего</span>
              </div>
            ))}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-black uppercase tracking-widest">Самые активные клубы</h3>
            {topClubs.length === 0 ? <p className="text-xs font-bold uppercase text-slate-400">Клубов пока нет</p> : topClubs.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 border-b-2 border-slate-100 py-2 text-sm">
                <span className="w-5 font-black text-blue-600">{i + 1}</span>
                <span className="flex-1 truncate font-bold">{c.title}</span>
                <span className="text-xs font-bold text-slate-500">{c.members} уч. · {c.pc} проектов · {c.recent} девлогов</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={block}>
        <h2 className="mb-4 flex items-center gap-3 text-xl font-black uppercase tracking-tight"><FolderKanban className="h-5 w-5 text-blue-600" /> Все проекты ({scored.length})</h2>
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию, автору, клубу" className="rounded-none border-2 border-slate-900 pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            {([["all", "Все"], ["active", "Активные"], ["pending", "Проверка"], ["completed", "Завершённые"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`border-2 border-slate-900 px-3 py-2 text-[11px] font-black uppercase tracking-widest ${filter === k ? "bg-slate-900 text-white" : "bg-white"}`}>{l}</button>
            ))}
          </div>
        </div>
        {list.length === 0 ? <p className="text-xs font-black uppercase tracking-widest text-slate-400">Проектов не найдено</p> : (
          <div className="space-y-3">
            {list.map((p) => {
              const [bl, bc] = badge(p);
              const a = p.author ?? {};
              return (
                <div key={p.id} className="flex flex-col gap-4 border-2 border-slate-900 bg-slate-50 p-4 lg:flex-row lg:items-center">
                  {p.image_url ? <img src={p.image_url} alt="" className="h-16 w-16 shrink-0 border-2 border-slate-900 object-cover" /> : <div className="h-16 w-16 shrink-0 border-2 border-slate-900 bg-slate-200" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-black uppercase tracking-tight">{p.title}</span>
                      <span className={`border-2 border-slate-900 px-2 py-0.5 text-[10px] font-black uppercase ${bc}`}>{bl}</span>
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      Клуб: {p.clubs?.title ?? "без клуба"} · {p.members} уч. · {p.updatesCount} девлогов · активность {new Date(p.last).toLocaleDateString("ru-RU")}
                    </div>
                  </div>
                  <div className="flex min-w-[220px] items-center gap-3">
                    <UserAvatar name={a.name} url={a.photo_url} className="h-9 w-9" />
                    <div className="min-w-0 text-xs">
                      <div className="truncate font-black uppercase">{a.name ?? "—"}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-600">
                        {a.contact_phone && <a href={`tel:${a.contact_phone}`} className="flex items-center gap-1 hover:text-blue-600"><Phone className="h-3 w-3" />{a.contact_phone}</a>}
                        {a.contact_telegram && <a href={`https://t.me/${a.contact_telegram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600"><Send className="h-3 w-3" />{a.contact_telegram}</a>}
                        {a.contact_email && <a href={`mailto:${a.contact_email}`} className="flex items-center gap-1 hover:text-blue-600"><Mail className="h-3 w-3" />{a.contact_email}</a>}
                        {!a.contact_phone && !a.contact_telegram && !a.contact_email && <span>контакты не указаны</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {p.club_id && <Button asChild variant="outline" size="icon" className="rounded-none border-2 border-slate-900"><Link to="/clubs/$clubId" params={{ clubId: p.club_id }} aria-label="Открыть клуб"><ExternalLink className="h-4 w-4" /></Link></Button>}
                    <Button variant="outline" size="icon" aria-label="Изменить" onClick={() => setEditing({ ...p })} className="rounded-none border-2 border-slate-900"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" aria-label="Удалить" onClick={() => { if (confirm(`Удалить проект «${p.title}» вместе с девлогами?`)) remove.mutate(p.id); }} className="rounded-none border-2 border-slate-900 hover:bg-red-500 hover:text-white"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-none border-4 border-slate-900">
          <DialogHeader><DialogTitle className="font-black uppercase">Изменить проект</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="rounded-none border-2 border-slate-900" />
              <Textarea rows={5} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="rounded-none border-2 border-slate-900" />
              <div className="grid grid-cols-2 gap-3">
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="h-10 border-2 border-slate-900 bg-white px-2 text-sm font-bold">
                  {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <select value={editing.club_id ?? ""} onChange={(e) => setEditing({ ...editing, club_id: e.target.value })} className="h-10 border-2 border-slate-900 bg-white px-2 text-sm font-bold">
                  <option value="">Без клуба</option>
                  {clubs.filter((c) => c.is_approved).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={editing.is_looking_for_team} onChange={(e) => setEditing({ ...editing, is_looking_for_team: e.target.checked })} /> Ищем людей в команду
              </label>
              <Button disabled={save.isPending || !editing.title?.trim()} onClick={() => save.mutate(editing)} className="w-full rounded-none border-2 border-slate-900 bg-blue-600 font-black uppercase text-white hover:bg-blue-700">Сохранить</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
