import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { toast } from "sonner";
import { Users, Check, X, Trophy, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin/admin/clubs")({
  component: AdminClubs,
});

function AdminClubs() {
  const qc = useQueryClient();

  const { data: clubs = [] } = useQuery({
    queryKey: ["admin-clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select(`
          *,
          profiles:public_profiles!clubs_author_id_fkey (name, photo_url),
          club_members (id, user_id, role, profiles:public_profiles!club_members_user_id_fkey (name, photo_url))
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["admin-club-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_applications")
        .select("*, clubs (id, title), profiles:public_profiles!club_applications_applicant_id_fkey (name, photo_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const moderate = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase
        .from("clubs")
        .update({ is_approved: approve, is_rejected: !approve })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Готово"); qc.invalidateQueries({ queryKey: ["admin-clubs"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const setRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: "captain" | "moderator" | "member" }) => {
      const { error } = await supabase.from("club_members").update({ role }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Роль обновлена"); qc.invalidateQueries({ queryKey: ["admin-clubs"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("club_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Участник удалён"); qc.invalidateQueries({ queryKey: ["admin-clubs"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const pending = clubs.filter((c) => !c.is_approved && !c.is_rejected);
  const block = "bg-white border-4 border-slate-900 p-6 shadow-[6px_6px_0_#0f172a]";

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Клубы</h1>

      <div className={block}>
        <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-amber-500" /> Модерация новых клубов ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="font-black uppercase tracking-widest text-xs text-slate-400">Нет клубов на модерации</p>
        ) : (
          <div className="space-y-4">
            {pending.map((c) => (
              <div key={c.id} className="border-2 border-slate-900 p-4 bg-slate-50 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="font-black uppercase tracking-tight text-lg">{c.title}</div>
                  <p className="text-sm text-slate-600 font-medium line-clamp-2">{c.description}</p>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Автор: {c.profiles?.name}</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => moderate.mutate({ id: c.id, approve: true })} className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 border-2 border-slate-900 rounded-none font-black uppercase tracking-widest text-[10px]">
                    <Check className="h-4 w-4 mr-1" /> Одобрить
                  </Button>
                  <Button onClick={() => moderate.mutate({ id: c.id, approve: false })} className="bg-white hover:bg-red-500 hover:text-white text-slate-900 border-2 border-slate-900 rounded-none font-black uppercase tracking-widest text-[10px]">
                    <X className="h-4 w-4 mr-1" /> Отклонить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={block}>
        <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600" /> Управление составом
        </h2>
        <div className="space-y-6">
          {clubs.filter((c) => c.is_approved).map((c) => (
            <div key={c.id} className="border-2 border-slate-900 p-4">
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <Link to="/clubs/$clubId" params={{ clubId: c.id }} className="font-black uppercase tracking-tight text-lg hover:text-blue-600">
                  {c.title}
                </Link>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {c.club_members?.length ?? 0} участников
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {c.club_members?.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 border-2 border-slate-200 p-2 bg-slate-50">
                    <UserAvatar name={m.profiles?.name} url={m.profiles?.photo_url} className="h-8 w-8" />
                    <div className="flex-1 min-w-0">
                      <div className="font-black uppercase tracking-tight text-xs truncate">{m.profiles?.name}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">{m.role}</div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {m.role !== "captain" && (
                        <button onClick={() => setRole.mutate({ memberId: m.id, role: "captain" })} className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:underline">Капитан</button>
                      )}
                      {m.role !== "moderator" && (
                        <button onClick={() => setRole.mutate({ memberId: m.id, role: "moderator" })} className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:underline">Модератор</button>
                      )}
                      {m.role !== "member" && (
                        <button onClick={() => setRole.mutate({ memberId: m.id, role: "member" })} className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:underline">Участник</button>
                      )}
                      <button onClick={() => removeMember.mutate(m.id)} className="text-[9px] font-black uppercase tracking-widest text-red-600 hover:underline">Убрать</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={block}>
        <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
          <Users className="h-5 w-5 text-blue-600" /> Заявки на вступление
        </h2>
        {applications.length === 0 ? (
          <p className="font-black uppercase tracking-widest text-xs text-slate-400">Заявок нет</p>
        ) : (
          <div className="space-y-3">
            {applications.map((a) => (
              <div key={a.id} className="border-2 border-slate-200 p-3 flex items-center gap-3 bg-slate-50">
                <UserAvatar name={a.profiles?.name} url={a.profiles?.photo_url} className="h-8 w-8" />
                <div className="flex-1 min-w-0">
                  <div className="font-black uppercase tracking-tight text-xs">{a.profiles?.name} → {a.clubs?.title}</div>
                  {a.cover_letter && <p className="text-xs text-slate-600 font-medium truncate">{a.cover_letter}</p>}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 border-2 border-slate-300 px-2 py-1">{a.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
