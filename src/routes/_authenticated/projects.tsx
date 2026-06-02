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
import { 
  Search, Rocket, Users, FolderKanban, CheckCircle2, UserPlus, 
  X, User, Image as ImageIcon, Calendar, History, Megaphone, 
  Lightbulb, Settings, ArrowRight, Mail, Phone 
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

// Брутальный рендер статусов
const renderStatusBadge = (status: string, className: string = "") => {
  const baseClasses = `font-black uppercase tracking-widest text-[10px] border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] px-3 py-1 flex items-center w-fit ${className}`;
  switch (status) {
    case 'completed': return <span className={`bg-emerald-400 text-slate-900 ${baseClasses}`}><CheckCircle2 className="h-3 w-3 mr-2" /> Завершен</span>;
    case 'idea': return <span className={`bg-purple-400 text-slate-900 ${baseClasses}`}><Lightbulb className="h-3 w-3 mr-2" /> Идея</span>;
    case 'in_progress': default: return <span className={`bg-blue-400 text-white ${baseClasses}`}><Settings className="h-3 w-3 mr-2 animate-spin-slow" /> В разработке</span>;
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
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *, 
          profiles:author_id (name, contact_email, contact_telegram),
          project_updates (id, content, created_at)
        `)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return data.map(p => ({
        ...p,
        project_updates: p.project_updates?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || []
      }));
    },
  });

  // Фильтрация
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (filter === 'team') return p.is_looking_for_team;
    if (filter === 'my') return p.author_id === profile?.id;
    return true; 
  });

  // 3. Отправка заявки в проект
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !applyingToProject) throw new Error("Ошибка профиля");
      
      const { error } = await supabase.from("project_applications").insert({
        project_id: applyingToProject.id,
        applicant_id: profile.id,
        cover_letter: coverLetter
      });
      if (error) throw error;

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
    <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-blue-600 selection:text-white">
      <AppHeader profile={profile} />

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-10 animate-in fade-in duration-500 pb-24">
        
        {/* ШАПКА РАЗДЕЛА */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b-4 border-slate-900">
          <div className="space-y-2">
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
              Витрина
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm">Создавайте вещи, находите команду и развивайтесь.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input 
                placeholder="ПОИСК ИДЕЙ..." 
                className="pl-12 h-14 border-4 border-slate-900 rounded-none font-bold uppercase focus-visible:ring-0 focus-visible:border-blue-600 shadow-[4px_4px_0_#0f172a]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-2 shrink-0 h-auto sm:h-14">
              <button 
                onClick={() => setFilter('all')} 
                className={`flex-1 sm:flex-none px-6 py-3 sm:py-0 border-4 border-slate-900 font-black uppercase tracking-widest text-xs transition-all shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}
              >
                Все
              </button>
              <button 
                onClick={() => setFilter('team')} 
                className={`flex-1 sm:flex-none px-6 py-3 sm:py-0 border-4 border-slate-900 font-black uppercase tracking-widest text-xs transition-all shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none flex items-center justify-center gap-2 ${filter === 'team' ? 'bg-blue-600 text-white' : 'bg-white text-slate-900'}`}
              >
                <Users className="h-4 w-4" /> Ищут команду
              </button>
              <button 
                onClick={() => setFilter('my')} 
                className={`flex-1 sm:flex-none px-6 py-3 sm:py-0 border-4 border-slate-900 font-black uppercase tracking-widest text-xs transition-all shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none ${filter === 'my' ? 'bg-amber-400 text-slate-900' : 'bg-white text-slate-900'}`}
              >
                Мои
              </button>
            </div>
          </div>
        </div>

        {/* НАМЕК НА ТО, ЧТО СОЗДАНИЕ В ПРОФИЛЕ */}
        <Link to="/profile" className="block w-full">
          <div className="bg-blue-600 text-white border-4 border-slate-900 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[6px_6px_0_#0f172a] hover:translate-y-1 hover:translate-x-1 hover:shadow-[2px_2px_0_#0f172a] transition-all group">
            <span className="flex items-center gap-4 font-black uppercase tracking-widest text-sm md:text-base">
              <Rocket className="h-6 w-6 text-blue-200" />
              Хотите опубликовать свой стартап?
            </span>
            <span className="bg-white text-blue-900 border-2 border-slate-900 font-black uppercase tracking-widest text-xs px-6 py-3 flex items-center gap-2 shadow-[2px_2px_0_#0f172a]">
              В ПРОФИЛЬ <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>

        {/* СПИСОК ПРОЕКТОВ */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[1,2,3].map(i => <div key={i} className="h-96 bg-slate-200 border-4 border-slate-300 animate-pulse" />)}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20 bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a]">
            <p className="font-black uppercase tracking-widest text-slate-400">Проекты не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                onClick={() => setSelectedProject(project)}
                className="cursor-pointer border-4 border-slate-900 rounded-none shadow-[6px_6px_0_#0f172a] bg-white overflow-hidden flex flex-col hover:-translate-y-2 hover:-translate-x-2 hover:shadow-[12px_12px_0_#2563eb] transition-all duration-300 group relative"
              >
                {/* Бейдж с обновлениями */}
                {project.project_updates?.length > 0 && (
                  <div className="absolute top-4 left-4 z-10 bg-white border-2 border-slate-900 text-slate-900 font-black uppercase tracking-widest text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#0f172a] flex items-center">
                    <Megaphone className="h-3 w-3 mr-2 text-blue-600" /> {project.project_updates.length} обн.
                  </div>
                )}

                <div className="absolute top-4 right-4 z-10">
                  {renderStatusBadge(project.status)}
                </div>

                <div className="h-56 bg-slate-900 relative overflow-hidden border-b-4 border-slate-900">
                  {project.image_url ? (
                    <img src={project.image_url} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-100 font-black text-2xl uppercase tracking-widest">
                      <ImageIcon className="h-10 w-10 opacity-30" />
                    </div>
                  )}
                </div>
                
                <CardContent className="p-6 flex flex-col flex-1">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">{project.title}</h3>
                  <p className="text-slate-600 font-medium text-sm line-clamp-3 mb-6 flex-1 leading-relaxed">{project.description}</p>
                  
                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 bg-slate-50 p-2 border-2 border-slate-100 w-fit">
                    <User className="h-4 w-4 text-slate-400" /> {project.profiles?.name || 'Студент'}
                  </div>

                  {project.is_looking_for_team && project.status !== 'completed' && (
                    <div className="bg-blue-50 border-2 border-blue-200 p-4 mt-auto">
                      <div className="flex items-center gap-2 text-blue-800 font-black text-[10px] uppercase tracking-widest mb-3">
                        <Users className="h-4 w-4" /> Кого ищут:
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.looking_for_roles?.map((role: string, i: number) => (
                          <span key={i} className="border-2 border-blue-200 bg-white text-blue-700 font-bold text-[10px] uppercase tracking-widest px-2 py-1 shadow-[2px_2px_0_#bfdbfe]">{role}</span>
                        ))}
                      </div>
                      {project.author_id !== profile?.id && (
                        <Button 
                          onClick={(e) => { e.stopPropagation(); setApplyingToProject(project); }} 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white border-2 border-slate-900 rounded-none font-black uppercase tracking-widest text-[10px] shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all"
                        >
                          <UserPlus className="mr-2 h-4 w-4" /> В команду
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
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl p-0 bg-slate-50 border-4 border-slate-900 rounded-none shadow-[12px_12px_0_#0f172a] flex flex-col h-[85vh] max-h-[85vh] outline-none z-50">
          
          <DialogTitle className="sr-only">Просмотр проекта</DialogTitle>

          {/* CLOSE BUTTON - абсолютно позиционировано, всегда видно */}
          <button onClick={() => setSelectedProject(null)} className="absolute top-4 right-4 p-2 bg-white border-4 border-slate-900 shadow-[4px_4px_0_#0f172a] text-slate-900 hover:bg-red-500 hover:text-white transition-colors z-[60]">
            <X className="h-6 w-6" />
          </button>

          {/* ВЕСЬ КОНТЕНТ СКРОЛЛИТСЯ ВМЕСТЕ */}
          <div className="flex-1 overflow-y-auto w-full">
            
            {/* КАРТИНКА И ЗАГОЛОВОК */}
            <div className="relative h-64 md:h-[400px] bg-slate-900 shrink-0 border-b-4 border-slate-900">
              {selectedProject?.image_url ? (
                <img src={selectedProject.image_url} alt="Cover" className="w-full h-full object-cover opacity-70" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-200"><ImageIcon className="h-20 w-20 text-slate-400" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
              <div className="absolute bottom-6 left-6 md:left-10 md:bottom-10 pr-16">
                {selectedProject && renderStatusBadge(selectedProject.status, "mb-4 bg-white text-slate-900 border-2 border-slate-900")}
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white leading-tight">
                  {selectedProject?.title}
                </h2>
              </div>
            </div>

            {/* ОСТАЛЬНОЙ КОНТЕНТ */}
            <div className="p-6 md:p-10 space-y-8">
              
              {/* Мета */}
              <div className="flex items-center gap-4 pb-6 border-b-4 border-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span className="flex items-center gap-2 bg-slate-200 px-3 py-1 border-2 border-slate-300"><User className="h-4 w-4" /> {selectedProject?.profiles?.name || 'Студент'}</span>
                <span className="flex items-center gap-2 bg-slate-200 px-3 py-1 border-2 border-slate-300"><Calendar className="h-4 w-4" /> {selectedProject && new Date(selectedProject.created_at).toLocaleDateString("ru-RU", { day: 'numeric', month: 'long' })}</span>
              </div>

              {/* О проекте */}
              <div className="bg-white border-4 border-slate-900 p-6 md:p-8 shadow-[6px_6px_0_#0f172a]">
                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-6 flex items-center gap-3">
                  <span className="w-4 h-4 bg-blue-600 border-2 border-slate-900"></span> О проекте
                </h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap font-medium text-lg">
                  {selectedProject?.description}
                </p>
              </div>

              {/* КОНТАКТЫ АВТОРА */}
              {selectedProject?.profiles && (
                <div className="bg-amber-100 border-4 border-slate-900 p-6 md:p-8 shadow-[6px_6px_0_#0f172a]">
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-4 h-4 bg-amber-500 border-2 border-slate-900"></span> Контакты для связи
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {selectedProject.profiles.contact_email && (
                      <a 
                        href={`mailto:${selectedProject.profiles.contact_email}`}
                        className="flex-1 flex items-center justify-center gap-3 p-4 bg-white border-4 border-slate-900 font-black uppercase tracking-widest text-[10px] text-slate-900 shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all"
                      >
                        <Mail className="h-5 w-5 text-blue-600" /> Написать Email
                      </a>
                    )}
                    {selectedProject.profiles.contact_telegram && (
                      <a 
                        href={selectedProject.profiles.contact_telegram.startsWith('+') 
                          ? `tel:${selectedProject.profiles.contact_telegram}`
                          : `https://t.me/${selectedProject.profiles.contact_telegram.replace('@', '')}`
                        }
                        target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-3 p-4 bg-white border-4 border-slate-900 font-black uppercase tracking-widest text-[10px] text-slate-900 shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all"
                      >
                        <Phone className="h-5 w-5 text-blue-600" /> Telegram / Phone
                      </a>
                    )}
                    {!selectedProject.profiles.contact_email && !selectedProject.profiles.contact_telegram && (
                      <div className="p-4 bg-white border-4 border-slate-900 font-black uppercase tracking-widest text-xs text-slate-400 text-center w-full">
                        Контакты скрыты
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ДЕВЛОГ (ИСТОРИЯ ОБНОВЛЕНИЙ) */}
              {selectedProject?.project_updates?.length > 0 && (
                <div className="bg-white border-4 border-slate-900 p-6 md:p-8 shadow-[6px_6px_0_#0f172a]">
                  <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-8 flex items-center gap-3">
                    <History className="h-6 w-6 text-blue-600" /> Девлог
                  </h3>
                  
                  <div className="space-y-6">
                    {selectedProject.project_updates.map((update: any, i: number) => (
                      <div key={update.id} className="relative pl-8 border-l-4 border-slate-900">
                        <div className="absolute -left-[14px] top-0 w-6 h-6 bg-blue-400 border-4 border-slate-900" />
                        <div className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest bg-slate-100 w-fit px-2 py-1 border-2 border-slate-200">
                          {new Date(update.created_at).toLocaleDateString("ru-RU", { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}
                        </div>
                        <p className="text-slate-700 font-medium whitespace-pre-wrap">{update.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* БЛОК ПОИСКА КОМАНДЫ */}
              {selectedProject?.is_looking_for_team && selectedProject.status !== 'completed' && (
                <div className="bg-blue-600 border-4 border-slate-900 p-6 md:p-8 shadow-[6px_6px_0_#0f172a] text-white">
                  <h3 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                    <Users className="h-7 w-7 text-blue-300" /> Ищем в команду!
                  </h3>
                  <div className="flex flex-wrap gap-3 mb-8">
                    {selectedProject.looking_for_roles?.map((role: string, i: number) => (
                      <span key={i} className="bg-white text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-[10px] px-4 py-2 shadow-[2px_2px_0_#0f172a]">
                        {role}
                      </span>
                    ))}
                  </div>
                  
                  {selectedProject.author_id !== profile?.id && (
                    <Button 
                      onClick={() => {
                        const proj = selectedProject;
                        setSelectedProject(null);
                        setTimeout(() => setApplyingToProject(proj), 150); 
                      }} 
                      className="w-full h-16 bg-amber-400 hover:bg-amber-500 text-slate-900 border-4 border-slate-900 rounded-none font-black text-lg uppercase tracking-widest shadow-[6px_6px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all"
                    >
                      <UserPlus className="mr-3 h-6 w-6" /> Хочу в команду
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------------- */}
      {/* МОДАЛКА: ПОДАТЬ ЗАЯВКУ */}
      <Dialog open={!!applyingToProject} onOpenChange={(v) => !v && setApplyingToProject(null)}>
        <DialogContent className="max-w-md p-0 border-4 border-slate-900 bg-white rounded-none shadow-[12px_12px_0_#0f172a]">
          <div className="bg-slate-900 p-6 flex justify-between items-start border-b-4 border-slate-900 text-white">
            <div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Подача заявки</DialogTitle>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2 line-clamp-1">{applyingToProject?.title}</p>
            </div>
            <button onClick={() => setApplyingToProject(null)} className="p-2 bg-white text-slate-900 border-2 border-slate-900 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0_#0f172a]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="p-4 bg-slate-50 border-2 border-slate-900 shadow-[4px_4px_0_#0f172a] space-y-2">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Профиль для отправки</p>
              <div className="font-black text-slate-900 uppercase tracking-tight">{profile?.name}</div>
              <div className="text-xs font-bold text-slate-500">{profile?.email}</div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Сопроводительное письмо</Label>
              <Textarea 
                placeholder="Что умеете и чем можете помочь проекту..."
                className="h-32 border-2 border-slate-900 rounded-none bg-slate-50 focus-visible:ring-0 focus-visible:border-blue-600 font-medium resize-none"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>

            <Button 
              onClick={() => applyMutation.mutate()} 
              disabled={applyMutation.isPending || !coverLetter.trim()} 
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-slate-900 border-4 border-slate-900 rounded-none font-black text-sm uppercase tracking-widest shadow-[6px_6px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[4px_4px_0_#0f172a] transition-all"
            >
              {applyMutation.isPending ? "Отправка..." : "ОТПРАВИТЬ ЗАЯВКУ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}