import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Briefcase } from "lucide-react";

export const Route = createFileRoute("/_public/team")({
  component: TeamPage,
});

type TeamMember = {
  id: string;
  name: string;
  job_title: string | null;
  photo_url: string | null;
};

function TeamPage() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_team_members");
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

  const initials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 pb-24 space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-6">
        <div className="h-14 w-14 border-4 border-slate-900 bg-amber-400 flex items-center justify-center shadow-[4px_4px_0_#0f172a]">
          <Users className="h-7 w-7 text-slate-900" />
        </div>
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase">Команда</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm mt-1">
            Сотрудники лаборатории FabLab Satbayev
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-20 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
          Загрузка команды...
        </div>
      ) : members.length === 0 ? (
        <div className="p-20 text-center border-4 border-dashed border-slate-200">
          <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Сотрудники пока не добавлены
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {members.map((m) => (
            <article
              key={m.id}
              className="border-4 border-slate-900 bg-white shadow-[6px_6px_0_#0f172a] flex flex-col"
            >
              <div className="aspect-square w-full border-b-4 border-slate-900 bg-slate-100 overflow-hidden flex items-center justify-center">
                {m.photo_url ? (
                  <img
                    src={m.photo_url}
                    alt={`${m.name} — ${m.job_title ?? "сотрудник FabLab Satbayev"}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-5xl font-black text-slate-300 tracking-tighter">
                    {initials(m.name) || "FL"}
                  </span>
                )}
              </div>
              <div className="p-5 space-y-2">
                <h2 className="font-black text-lg text-slate-900 uppercase tracking-tight leading-tight">
                  {m.name}
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                  {m.job_title || "Сотрудник лаборатории"}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
