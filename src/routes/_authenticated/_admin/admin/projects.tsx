import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Rocket, Calendar, User, CheckCircle, XCircle, Mail, Archive, 
  FolderKanban, Undo2, Users, Activity, AlertCircle, CheckSquare, X 
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin/projects")({
  component: AdminProjectsPage,
});

function AdminProjectsPage() {
  const qc = useQueryClient();
  const [showArchive, setShowArchive] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["admin-all-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, profiles:author_id (name, contact_email, contact_telegram)") 
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // ВЫЧИСЛЕНИЕ МЕТРИК ДЛЯ ДАШБОРДА
  const stats = useMemo(() => {
    let pending = 0;
    let active = 0;
    let completed = 0;
    let lookingForTeam = 0;

    projects.forEach(p => {
      if (!p.is_approved && !p.is_rejected) pending++;
      if (p.is_approved && p.status !== 'completed') active++;
      if (p.is_approved && p.status === 'completed') completed++;
      if (p.is_looking_for_team && !p.is_rejected) lookingForTeam++;
    });

    return { total: projects.length, pending, active, completed, lookingForTeam };
  }, [projects]);

  // Фильтры для Канбан-доски
  const pendingProjects = projects.filter(p => !p.is_approved && !p.is_rejected);
  const activeProjects = projects.filter(p => p.is_approved && p.status !== 'completed');
  const completedProjects = projects.filter(p => p.is_approved && p.status === 'completed');
  const archivedProjects = projects.filter(p => p.is_rejected);

  // МУТАЦИИ С УВЕДОМЛЕНИЯМИ
  const approveProject = useMutation({
    mutationFn: async (project: any) => {
      const { error } = await supabase.from("projects").update({ is_approved: true, is_rejected: false }).eq("id", project.id);
      if (error) throw error;
      
      await supabase.from("notifications").insert({
        user_id: project.author_id,
        title: "🚀 Проект опубликован!",
        message: `Ваш проект "${project.title}" прошел модерацию и теперь доступен на главной витрине.`,
        type: "project"
      });
    },
    onSuccess: () => {
      toast.success("Проект одобрен!");
      setSelectedProject(null);
      qc.invalidateQueries({ queryKey: ["admin-all-projects"] });
    },
  });

  const rejectProject = useMutation({
    mutationFn: async (project: any) => {
      const { error } = await supabase.from("projects").update({ is_approved: false, is_rejected: true }).eq("id", project.id);
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: project.author_id,
        title: "📦 Проект в архиве",
        message: `Ваш проект "${project.title}" был отклонен администратором и перенесен в архив.`,
        type: "project"
      });
    },
    onSuccess: () => {
      toast.success("Проект перенесен в архив.");
      setSelectedProject(null);
      qc.invalidateQueries({ queryKey: ["admin-all-projects"] });
    },
  });

  // Брутальная карточка проекта
  const renderProjectCard = (project: any) => (
    <div 
      key={project.id} 
      onClick={() => setSelectedProject(project)}
      className="p-4 border-2 border-slate-900 bg-white shadow-[4px_4px_0_#0f172a] hover:border-blue-600 hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all cursor-pointer group flex flex-col gap-3"
    >
      <div className="flex gap-4 h-20">
        <div className="h-full w-20 border-2 border-slate-900 bg-slate-100 overflow-hidden shrink-0">
          {project.image_url ? (
            <img src={project.image_url} className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-400 font-black text-xs uppercase">IMG</div>
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <h3 className="font-black text-sm uppercase tracking-tight text-slate-900 line-clamp-2 leading-tight mb-2 group-hover:text-blue-600 transition-colors">{project.title}</h3>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex flex-col gap-1">
            <span className="flex items-center gap-2 truncate"><User className="h-3 w-3 text-blue-600" /> {project.profiles?.name || 'Студент'}</span>
            <span className="flex items-center gap-2 truncate"><Calendar className="h-3 w-3 text-amber-600" /> {new Date(project.created_at).toLocaleDateString("ru-RU")}</span>
          </div>
        </div>
      </div>
      {project.is_looking_for_team && (
        <div className="mt-1 pt-3 border-t-2 border-slate-100">
          <span className="bg-blue-100 text-blue-700 px-2 py-1 text-[10px] font-black uppercase tracking-widest border border-blue-200">
            Ищет команду
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 p-2 flex flex-col h-auto md:h-[calc(100vh-80px)]">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b-4 border-slate-900 pb-6 shrink-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Проекты</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Модерация стартапов и витрина</p>
        </div>
        <Button 
          onClick={() => setShowArchive(!showArchive)}
          className={`border-4 border-slate-900 px-6 py-6 font-black text-xs tracking-widest uppercase transition-all shadow-[4px_4px_0_#0f172a] hover:translate-y-1 hover:translate-x-1 hover:shadow-none ${showArchive ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 hover:bg-slate-50'}`}
        >
          {showArchive ? <><FolderKanban className="mr-2 h-4 w-4" /> Доска</> : <><Archive className="mr-2 h-4 w-4" /> Архив</>}
        </Button>
      </div>

      {/* DETAILED STATISTICS BLOCK */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 shrink-0">
        <div className="bg-white border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900">Ожидают модерации</h4>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-4xl font-black text-slate-900">{stats.pending}</div>
        </div>

        <div className="bg-blue-600 border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between text-white">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-blue-100">Активные проекты</h4>
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="text-4xl font-black text-white">{stats.active}</div>
        </div>

        <div className="bg-white border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900">Завершено / Успех</h4>
            <CheckSquare className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-4xl font-black text-slate-900">{stats.completed}</div>
        </div>

        <div className="bg-white border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900">Ищут в команду</h4>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-4xl font-black text-slate-900">{stats.lookingForTeam}</div>
        </div>
      </div>

      {/* CONTENT AREA */}
      {showArchive ? (
        // АРХИВ
        <div className="flex-1 overflow-y-auto bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a] p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {archivedProjects.length === 0 ? (
              <div className="col-span-full py-20 text-center font-bold uppercase tracking-widest text-xs text-slate-400">В архиве пусто.</div>
            ) : (
              archivedProjects.map(p => renderProjectCard(p))
            )}
          </div>
        </div>
      ) : (
        /* КАНБАН ДОСКА */
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 md:overflow-hidden min-h-[500px]">
          
          {/* КОЛОНКА 1: ОЖИДАЮТ */}
          <div className="flex flex-col bg-slate-50 border-4 border-slate-900 shadow-[6px_6px_0_#0f172a] overflow-hidden h-[450px] md:h-auto">
            <div className="p-4 border-b-4 border-slate-900 bg-slate-900 text-white shrink-0 flex items-center justify-between">
              <h2 className="font-black uppercase tracking-widest text-xs flex items-center gap-3">
                <span className="w-3 h-3 bg-amber-400 border border-slate-900"></span> На проверке
              </h2>
              <span className="font-black bg-white text-slate-900 px-2 py-0.5 text-[10px]">{pendingProjects.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? <div className="animate-pulse h-24 bg-slate-200 border-2 border-slate-300" /> : 
               pendingProjects.map(p => renderProjectCard(p))}
            </div>
          </div>

          {/* КОЛОНКА 2: В РАЗРАБОТКЕ */}
          <div className="flex flex-col bg-slate-50 border-4 border-slate-900 shadow-[6px_6px_0_#0f172a] overflow-hidden h-[450px] md:h-auto">
            <div className="p-4 border-b-4 border-slate-900 bg-slate-900 text-white shrink-0 flex items-center justify-between">
              <h2 className="font-black uppercase tracking-widest text-xs flex items-center gap-3">
                <span className="w-3 h-3 bg-blue-500 border border-slate-900"></span> В разработке
              </h2>
              <span className="font-black bg-white text-slate-900 px-2 py-0.5 text-[10px]">{activeProjects.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? <div className="animate-pulse h-24 bg-slate-200 border-2 border-slate-300" /> : 
               activeProjects.map(p => renderProjectCard(p))}
            </div>
          </div>

          {/* КОЛОНКА 3: ЗАВЕРШЕННЫЕ */}
          <div className="flex flex-col bg-slate-50 border-4 border-slate-900 shadow-[6px_6px_0_#0f172a] overflow-hidden h-[450px] md:h-auto">
            <div className="p-4 border-b-4 border-slate-900 bg-slate-900 text-white shrink-0 flex items-center justify-between">
              <h2 className="font-black uppercase tracking-widest text-xs flex items-center gap-3">
                <span className="w-3 h-3 bg-emerald-400 border border-slate-900"></span> Успех
              </h2>
              <span className="font-black bg-white text-slate-900 px-2 py-0.5 text-[10px]">{completedProjects.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? <div className="animate-pulse h-24 bg-slate-200 border-2 border-slate-300" /> : 
               completedProjects.map(p => renderProjectCard(p))}
            </div>
          </div>

        </div>
      )}

      {/* МОДАЛКА ПРОСМОТРА */}
      <Dialog open={!!selectedProject} onOpenChange={(v) => !v && setSelectedProject(null)}>
        <DialogContent className="w-full max-w-3xl border-4 border-slate-900 bg-white p-0 rounded-none shadow-[8px_8px_0_#0f172a] flex flex-col h-[90vh] md:h-[85vh]">
          
          <div className="bg-slate-900 p-4 md:p-6 flex justify-between items-start border-b-4 border-slate-900 shrink-0">
            <div>
              <DialogTitle className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white pr-8">{selectedProject?.title}</DialogTitle>
              <div className="flex items-center gap-4 mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span className="flex items-center gap-2"><User className="h-4 w-4 text-blue-400" /> {selectedProject?.profiles?.name}</span>
                <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-amber-400" /> {selectedProject && new Date(selectedProject.created_at).toLocaleDateString("ru-RU")}</span>
              </div>
            </div>
            <button 
              onClick={() => setSelectedProject(null)} 
              className="p-1.5 bg-white text-slate-900 border-2 border-slate-900 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0_#0f172a] shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50">
            {selectedProject?.image_url && (
              <div className="border-4 border-slate-900 bg-white p-2">
                <img src={selectedProject.image_url} alt="Cover" className="w-full h-48 md:h-64 object-cover" />
              </div>
            )}
            
            <div className="bg-white border-2 border-slate-900 p-4 md:p-6 shadow-[4px_4px_0_#0f172a]">
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" /> Описание стартапа
              </h4>
              <p className="text-slate-700 font-medium whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                {selectedProject?.description}
              </p>
            </div>

            {selectedProject?.is_looking_for_team && (
              <div className="bg-white border-2 border-slate-900 p-4 md:p-6 shadow-[4px_4px_0_#0f172a]">
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" /> Вакансии в команду
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.looking_for_roles?.map((role: string, i: number) => (
                    <span key={i} className="bg-blue-100 text-blue-800 border-2 border-slate-900 font-black text-[10px] uppercase tracking-widest px-3 py-1">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* КОНТАКТЫ АВТОРА */}
            {selectedProject?.profiles && (
              <div className="bg-white border-2 border-slate-900 p-4 md:p-6 shadow-[4px_4px_0_#0f172a]">
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" /> Контакты автора
                </h4>
                <div className="space-y-3">
                  {selectedProject.profiles.contact_email && (
                    <a 
                      href={`mailto:${selectedProject.profiles.contact_email}`}
                      className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all cursor-pointer group"
                    >
                      <Mail className="h-4 w-4 text-blue-600 group-hover:text-blue-700 shrink-0" />
                      <span className="font-semibold text-slate-900 group-hover:text-blue-700 break-all text-xs md:text-sm">
                        {selectedProject.profiles.contact_email}
                      </span>
                    </a>
                  )}
                  {selectedProject.profiles.contact_telegram && (
                    <a 
                      href={selectedProject.profiles.contact_telegram.startsWith('+') 
                        ? `tel:${selectedProject.profiles.contact_telegram}`
                        : `https://t.me/${selectedProject.profiles.contact_telegram.replace('@', '')}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all cursor-pointer group"
                    >
                      <span className="font-black text-sm text-blue-600 group-hover:text-blue-700 shrink-0">✈️</span>
                      <span className="font-semibold text-slate-900 group-hover:text-blue-700 break-all text-xs md:text-sm">
                        {selectedProject.profiles.contact_telegram}
                      </span>
                    </a>
                  )}
                  {!selectedProject.profiles.contact_email && !selectedProject.profiles.contact_telegram && (
                    <p className="text-xs text-slate-500 italic">Автор пока не добавил контакты</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ПАНЕЛЬ УПРАВЛЕНИЯ ВНИЗУ */}
          <div className="p-4 md:p-6 border-t-4 border-slate-900 bg-white flex flex-col sm:flex-row gap-3 shrink-0">
            {selectedProject?.is_rejected && (
              <Button onClick={() => approveProject.mutate(selectedProject)} className="w-full bg-blue-600 hover:bg-blue-700 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-[10px] shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all py-6">
                <Undo2 className="h-4 w-4 mr-2" /> Восстановить
              </Button>
            )}

            {!selectedProject?.is_approved && !selectedProject?.is_rejected && (
              <div className="flex gap-3 w-full">
                <Button onClick={() => approveProject.mutate(selectedProject)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-[10px] shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all py-6">
                  <CheckCircle className="h-4 w-4 mr-2" /> Одобрить
                </Button>
                <Button onClick={() => { if(confirm("Отклонить проект и убрать в архив?")) rejectProject.mutate(selectedProject); }} className="flex-1 bg-white hover:bg-red-50 text-red-600 border-2 border-slate-900 font-black uppercase tracking-widest text-[10px] shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all py-6">
                  <XCircle className="h-4 w-4 mr-2" /> Отклонить
                </Button>
              </div>
            )}

            {selectedProject?.is_approved && (
              <Button onClick={() => { if(confirm("Убрать проект в архив?")) rejectProject.mutate(selectedProject); }} className="w-full bg-white hover:bg-red-50 text-red-600 border-2 border-slate-900 font-black uppercase tracking-widest text-[10px] shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all py-6">
                <Archive className="h-4 w-4 mr-2" /> В архив
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}