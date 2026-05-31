import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Rocket, Users, FolderKanban, CheckCircle2, UserPlus, X, User, Image as ImageIcon, Calendar, History, Megaphone, Lightbulb, Settings, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

// Красивый рендер статусов
const renderStatusBadge = (status: string, className: string = "") => {
  switch (status) {
    case 'completed': return <Badge className={`bg-emerald-500 text-white border-none shadow-md ${className}`}><CheckCircle2 className="h-3 w-3 mr-1" /> Завершен</Badge>;
    case 'idea': return <Badge className={`bg-purple-500 text-white border-none shadow-md ${className}`}><Lightbulb className="h-3 w-3 mr-1" /> Идея</Badge>;
    case 'in_progress': default: return <Badge className={`bg-amber-500 text-white border-none shadow-md ${className}`}><Settings className="h-3 w-3 mr-1 animate-spin-slow" /> В разработке</Badge>;
  }
};

function ProjectsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'team' | 'my'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Состояния для модалок
  const [selectedProject, setSelectedProject] = useState<any>(null); // Детальный просмотр
  const [applyingToProject, setApplyingToProject] = useState<any>(null); // Отклик
  const [coverLetter, setCoverLetter] = useState("");

  // 1. Профиль
  const { data: profile } = useQuery({
    queryKey: ["header-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
  });

  // 2. Загрузка проектов и их обновлений
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["public-projects"],
    queryFn: async () => {
      // Подтягиваем ТОЛЬКО ОДОБРЕННЫЕ проекты + автора + мини-новости (updates)
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *, 
          profiles:author_id (name),
          project_updates (id, content, created_at)
        `)
        .eq("is_approved", true) // <--- ВОТ ТОТ САМЫЙ ФИЛЬТР
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Сортируем апдейты каждого проекта от новых к старым
      return data.map(p => ({
        ...p,
        project_updates: p.project_updates?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || []
      }));
    },
  });

  // Фильтрация
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === 'team') return p.is_looking_for_team;
    if (filter === 'my') return p.author_id === profile?.id;
    return true; 
  });

  // 3. Отправка заявки в проект
  // Отправка заявки в проект + Уведомление автору
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !applyingToProject) throw new Error("Ошибка профиля");
      
      const { error } = await supabase.from("project_applications").insert({
        project_id: applyingToProject.id,
        applicant_id: profile.id,
        cover_letter: coverLetter
      });
      if (error) throw error;

      // Отправляем пуш автору проекта
      await supabase.from("notifications").insert({
        user_id: applyingToProject.author_id,
        title: "Новая заявка в команду 👥",
        message: `Пользователь ${profile.name} хочет присоединиться к вашему проекту "${applyingToProject.title}". Зайдите в Личный кабинет, чтобы проверить заявку!`,
        type: "project"
      });
    },
    onSuccess: () => {
      toast.success("Заявка успешно отправлена!");
      setApplyingToProject(null);
      setCoverLetter("");
    },
    onError: (err: any) => toast.error("Ошибка: " + err.message)
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader profile={profile} />

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-10">
        
        {/* ШАПКА РАЗДЕЛА */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-200">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight flex items-center gap-4">
              <Rocket className="h-10 w-10 text-blue-600" /> Витрина проектов
            </h1>
            <p className="text-slate-500 font-medium">Создавайте крутые вещи, находите команду и развивайтесь вместе.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Поиск идей..." 
                className="pl-9 h-12 rounded-2xl bg-white border-slate-200 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center p-1 bg-slate-200/50 rounded-2xl shrink-0 h-12">
              <button onClick={() => setFilter('all')} className={`flex-1 sm:flex-none px-4 h-full flex items-center gap-2 justify-center rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                <FolderKanban className="h-4 w-4" /> Все
              </button>
              <button onClick={() => setFilter('team')} className={`flex-1 sm:flex-none px-4 h-full flex items-center gap-2 justify-center rounded-xl text-sm font-bold transition-all ${filter === 'team' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                <Users className="h-4 w-4" /> Ищут команду
              </button>
              <button onClick={() => setFilter('my')} className={`flex-1 sm:flex-none px-4 h-full flex items-center gap-2 justify-center rounded-xl text-sm font-bold transition-all ${filter === 'my' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                Мои проекты
              </button>
            </div>
          </div>
        </div>

        {/* НАМЕК НА ТО, ЧТО СОЗДАНИЕ В ПРОФИЛЕ */}
        <div className="flex justify-end">
          <Link to="/profile" className="w-full sm:w-auto block">
            <div className="bg-blue-50/60 hover:bg-blue-50 border border-blue-100/80 rounded-2xl p-4 text-sm text-slate-600 font-medium flex items-center justify-between gap-4 shadow-sm hover:shadow transition-all group">
              <span className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                Хотите опубликовать или настроить свой проект?
              </span>
              <span className="text-[#005BAB] font-bold flex items-center gap-1 shrink-0">
                В профиль <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </div>

        {/* СПИСОК ПРОЕКТОВ */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 font-bold animate-pulse">Загрузка проектов...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-500">
            Ничего не найдено.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                onClick={() => setSelectedProject(project)}
                className="cursor-pointer rounded-[32px] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden flex flex-col hover:-translate-y-1 transition-transform group relative"
              >
                {/* Бейдж с количеством новостей (если есть) */}
                {project.project_updates?.length > 0 && (
                  <Badge className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur text-slate-900 hover:bg-white border-none shadow-sm font-bold px-3 py-1">
                    <Megaphone className="h-3 w-3 mr-1 text-blue-600" /> {project.project_updates.length} {project.project_updates.length === 1 ? 'обновление' : 'обновлений'}
                  </Badge>
                )}

                <div className="absolute top-4 right-4 z-10">
                  {renderStatusBadge(project.status)}
                </div>

                <div className="h-48 bg-slate-100 relative">
                  {project.image_url ? (
                    <img src={project.image_url} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-2xl">
                      <ImageIcon className="h-10 w-10 opacity-50" />
                    </div>
                  )}
                </div>
                
                <CardContent className="p-6 flex flex-col flex-1">
                  <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-[#005BAB] transition-colors">{project.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-3 mb-4 flex-1">{project.description}</p>
                  
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
                    <User className="h-4 w-4" /> {project.profiles?.name || 'Студент'}
                  </div>

                  {project.is_looking_for_team && project.status !== 'completed' && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 mt-auto">
                      <div className="flex items-center gap-2 text-blue-800 font-bold text-sm mb-2">
                        <Users className="h-4 w-4" /> Нужны в команду:
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.looking_for_roles?.map((role: string, i: number) => (
                          <Badge key={i} variant="outline" className="border-blue-200 text-blue-700 bg-white">{role}</Badge>
                        ))}
                      </div>
                      {project.author_id !== profile?.id && (
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation(); 
                            setApplyingToProject(project);
                          }} 
                          className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl font-bold shadow-md"
                        >
                          <UserPlus className="mr-2 h-4 w-4" /> Подать заявку
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------------------- */}
      {/* МОДАЛКА: ПРОСМОТР ПРОЕКТА */}
      <Dialog open={!!selectedProject} onOpenChange={(v) => !v && setSelectedProject(null)}>
        <DialogContent className="max-w-4xl rounded-[40px] p-0 bg-slate-50 border-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="relative h-64 md:h-80 bg-slate-100 shrink-0">
            {selectedProject?.image_url ? (
              <img src={selectedProject.image_url} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-200"><ImageIcon className="h-16 w-16 text-slate-300" /></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button onClick={() => setSelectedProject(null)} className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition">
              <X className="h-6 w-6" />
            </button>
            <div className="absolute bottom-6 left-6 md:left-10">
              {selectedProject && renderStatusBadge(selectedProject.status, "mb-3")}
              <DialogTitle className="text-3xl md:text-5xl font-black text-white leading-tight pr-10">
                {selectedProject?.title}
              </DialogTitle>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-200 text-sm font-bold text-slate-400">
              <span className="flex items-center gap-2"><User className="h-4 w-4" /> {selectedProject?.profiles?.name || 'Студент'}</span>
              <span>•</span>
              <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {selectedProject && new Date(selectedProject.created_at).toLocaleDateString("ru-RU", { day: 'numeric', month: 'long' })}</span>
            </div>

            <div className="py-6 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mt-6">
              <h3 className="text-lg font-black text-slate-900 mb-4">О проекте</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-lg">
                {selectedProject?.description}
              </p>
            </div>

            {/* НОВАЯ СЕКЦИЯ: ИСТОРИЯ РАЗРАБОТКИ (ДЕВЛОГ) */}
            {selectedProject?.project_updates?.length > 0 && (
              <div className="mt-8 space-y-6">
                <h3 className="font-black text-slate-900 text-2xl flex items-center gap-3">
                  <History className="h-6 w-6 text-blue-600" /> Девлог (История обновлений)
                </h3>
                
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {selectedProject.project_updates.map((update: any, i: number) => (
                    <div key={update.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <Megaphone className="h-4 w-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-2xl border border-slate-100 shadow-sm group-hover:border-blue-200 transition-colors">
                        <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                          {new Date(update.created_at).toLocaleDateString("ru-RU", { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{update.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* БЛОК ПОИСКА КОМАНДЫ */}
            {selectedProject?.is_looking_for_team && selectedProject.status !== 'completed' && (
              <div className="mt-10 bg-blue-50 border border-blue-100 rounded-[32px] p-8 shadow-sm">
                <h3 className="font-black text-blue-900 text-2xl flex items-center gap-3 mb-4">
                  <Users className="h-7 w-7 text-blue-600" /> Кого мы ищем
                </h3>
                <div className="flex flex-wrap gap-2 mb-8">
                  {selectedProject.looking_for_roles?.map((role: string, i: number) => (
                    <Badge key={i} className="bg-white border-blue-200 text-blue-700 text-sm px-4 py-2 rounded-xl shadow-sm hover:bg-white">{role}</Badge>
                  ))}
                </div>
                
                {selectedProject.author_id !== profile?.id && (
                  <Button 
                    onClick={() => {
                      const proj = selectedProject;
                      setSelectedProject(null);
                      setTimeout(() => setApplyingToProject(proj), 150); 
                    }} 
                    className="w-full h-16 bg-[#005BAB] hover:bg-blue-800 rounded-[24px] font-black text-xl shadow-xl shadow-blue-200"
                  >
                    <UserPlus className="mr-3 h-6 w-6" /> ХОЧУ В КОМАНДУ
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------------- */}
      {/* МОДАЛКА: ПОДАТЬ ЗАЯВКУ */}
      <Dialog open={!!applyingToProject} onOpenChange={(v) => !v && setApplyingToProject(null)}>
        <DialogContent className="max-w-md rounded-[32px] p-6 bg-white border-none shadow-2xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <DialogTitle className="text-2xl font-black text-slate-900">Подача заявки</DialogTitle>
              <p className="text-sm text-slate-500 mt-1">Проект: {applyingToProject?.title}</p>
            </div>
            <button onClick={() => setApplyingToProject(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition"><X className="h-5 w-5 text-slate-500" /></button>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ваш профиль (отправится автору)</p>
              <div className="font-medium text-slate-900">{profile?.name}</div>
              <div className="text-sm text-slate-500">{profile?.email}</div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Сопроводительное письмо</Label>
              <Textarea 
                placeholder="Напишите, почему вы хотите в проект, что умеете и чем можете помочь..."
                className="h-32 rounded-2xl bg-white border-slate-200 resize-none focus:ring-blue-100"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>

            <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending || !coverLetter.trim()} className="w-full h-14 bg-[#005BAB] hover:bg-blue-800 rounded-2xl text-lg font-black shadow-xl shadow-blue-100 mt-2">
              {applyMutation.isPending ? "Отправка..." : "ОТПРАВИТЬ ЗАЯВКУ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}