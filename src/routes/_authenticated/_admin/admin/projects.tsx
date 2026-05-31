import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Rocket, Calendar, User, CheckCircle, XCircle, Mail, Archive, FolderKanban, Undo2 } from "lucide-react";

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
        .select("*, profiles:author_id (name)") 
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Фильтруем для Канбан-доски
  const pendingProjects = projects.filter(p => !p.is_approved && !p.is_rejected);
  const activeProjects = projects.filter(p => p.is_approved && p.status !== 'completed');
  const completedProjects = projects.filter(p => p.is_approved && p.status === 'completed');
  
  // Фильтруем для Архива
  const archivedProjects = projects.filter(p => p.is_rejected);

  // МУТАЦИИ
  // МУТАЦИИ С УВЕДОМЛЕНИЯМИ
  const approveProject = useMutation({
    mutationFn: async (project: any) => {
      const { error } = await supabase.from("projects").update({ is_approved: true, is_rejected: false }).eq("id", project.id);
      if (error) throw error;
      
      // Отправляем пуш автору проекта
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

      // Отправляем пуш автору проекта
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

  // Функция для отрисовки карточки проекта (без кнопок внутри!)
  const renderProjectCard = (project: any) => (
    <Card 
      key={project.id} 
      onClick={() => setSelectedProject(project)}
      className="p-4 rounded-2xl shadow-sm border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group flex flex-col gap-3"
    >
      <div className="flex gap-3 h-20">
        <div className="h-full w-20 bg-slate-100 rounded-xl overflow-hidden shrink-0">
          {project.image_url ? (
            <img src={project.image_url} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-300 font-black text-xs">IMG</div>
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-tight mb-1 group-hover:text-blue-700">{project.title}</h3>
          <div className="text-[11px] text-slate-500 flex flex-col gap-0.5">
            <span className="flex items-center gap-1 truncate"><User className="h-3 w-3" /> {project.profiles?.name || 'Студент'}</span>
            <span className="flex items-center gap-1 truncate"><Calendar className="h-3 w-3" /> {new Date(project.created_at).toLocaleDateString("ru-RU")}</span>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 p-4 md:p-8 h-[calc(100vh-80px)] flex flex-col">
      
      {/* ШАПКА */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Rocket className="h-8 w-8 text-blue-600" /> Модерация проектов
          </h1>
          <p className="text-slate-500 mt-1">Канбан-доска для управления стартапами платформы.</p>
        </div>
        <Button 
          variant={showArchive ? "default" : "outline"}
          onClick={() => setShowArchive(!showArchive)}
          className={`h-12 rounded-xl font-bold px-6 ${showArchive ? 'bg-slate-900' : 'bg-white'}`}
        >
          {showArchive ? <><FolderKanban className="mr-2 h-5 w-5" /> Вернуться к доске</> : <><Archive className="mr-2 h-5 w-5" /> Архив отклоненных</>}
        </Button>
      </div>

      {/* АРХИВ */}
      {showArchive ? (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {archivedProjects.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">В архиве пусто.</div>
            ) : (
              archivedProjects.map(p => renderProjectCard(p))
            )}
          </div>
        </div>
      ) : (
        /* КАНБАН ДОСКА */
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
          
          {/* КОЛОНКА 1: ОЖИДАЮТ */}
          <div className="flex flex-col bg-slate-100/50 rounded-[32px] border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-white/50 backdrop-blur shrink-0 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Ожидают проверки
              </h2>
              <Badge variant="secondary" className="bg-slate-200">{pendingProjects.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? <div className="animate-pulse h-24 bg-slate-200 rounded-2xl" /> : 
               pendingProjects.map(p => renderProjectCard(p))}
            </div>
          </div>

          {/* КОЛОНКА 2: В РАЗРАБОТКЕ */}
          <div className="flex flex-col bg-slate-100/50 rounded-[32px] border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-white/50 backdrop-blur shrink-0 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> В разработке
              </h2>
              <Badge variant="secondary" className="bg-slate-200">{activeProjects.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? <div className="animate-pulse h-24 bg-slate-200 rounded-2xl" /> : 
               activeProjects.map(p => renderProjectCard(p))}
            </div>
          </div>

          {/* КОЛОНКА 3: ЗАВЕРШЕННЫЕ */}
          <div className="flex flex-col bg-slate-100/50 rounded-[32px] border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-white/50 backdrop-blur shrink-0 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Завершенные
              </h2>
              <Badge variant="secondary" className="bg-slate-200">{completedProjects.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? <div className="animate-pulse h-24 bg-slate-200 rounded-2xl" /> : 
               completedProjects.map(p => renderProjectCard(p))}
            </div>
          </div>

        </div>
      )}

      {/* МОДАЛКА ПРОСМОТРА */}
      <Dialog open={!!selectedProject} onOpenChange={(v) => !v && setSelectedProject(null)}>
        <DialogContent className="max-w-3xl rounded-[32px] p-0 bg-white border-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="flex justify-between items-start p-6 border-b border-slate-100 bg-slate-50/50">
            <div>
              <DialogTitle className="text-2xl font-black text-slate-900">{selectedProject?.title}</DialogTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1"><User className="h-4 w-4" /> {selectedProject?.profiles?.name}</span>
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {selectedProject && new Date(selectedProject.created_at).toLocaleDateString("ru-RU")}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {selectedProject?.image_url && (
              <img src={selectedProject.image_url} alt="Cover" className="w-full h-64 object-cover rounded-2xl bg-slate-100" />
            )}
            
            <div>
              <h4 className="font-bold text-slate-900 mb-2">Описание проекта:</h4>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {selectedProject?.description}
              </p>
            </div>

            {selectedProject?.is_looking_for_team && (
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Ищет в команду:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.looking_for_roles?.map((role: string, i: number) => (
                    <Badge key={i} variant="outline" className="border-blue-200 text-blue-700">{role}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ПАНЕЛЬ УПРАВЛЕНИЯ ВНИЗУ МОДАЛКИ (Только здесь принимаются решения) */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-3">
            <Button 
              variant="outline"
              onClick={() => toast.info("Функция связи будет работать после добавления email в профили!")}
              className="flex-1 min-w-[140px] h-12 rounded-xl text-blue-800 hover:bg-blue-50 border-blue-200 font-bold"
            >
              <Mail className="h-5 w-5 mr-2" /> Связаться
            </Button>
            
            {/* Если проект в архиве (Отклонен) -> Показываем кнопку Восстановить */}
            {selectedProject?.is_rejected && (
              <Button onClick={() => approveProject.mutate(selectedProject)} className="flex-1 min-w-[140px] h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold">
                <Undo2 className="h-5 w-5 mr-2" /> Восстановить (Одобрить)
              </Button>
            )}

            {/* Если проект Ожидает проверки -> Показываем Одобрить и Отклонить */}
            {!selectedProject?.is_approved && !selectedProject?.is_rejected && (
              <>
                <Button onClick={() => approveProject.mutate(selectedProject)} className="flex-1 min-w-[140px] h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  <CheckCircle className="h-5 w-5 mr-2" /> Одобрить
                </Button>
                <Button onClick={() => { if(confirm("Отклонить проект и убрать в архив?")) rejectProject.mutate(selectedProject); }} className="flex-1 min-w-[140px] h-12 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold border-none">
                  <XCircle className="h-5 w-5 mr-2" /> Отклонить
                </Button>
              </>
            )}

            {/* Если проект уже Одобрен -> Показываем только В архив */}
            {selectedProject?.is_approved && (
              <Button onClick={() => { if(confirm("Убрать проект в архив?")) rejectProject.mutate(selectedProject); }} className="flex-1 min-w-[140px] h-12 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold border-none">
                <Archive className="h-5 w-5 mr-2" /> В архив
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}