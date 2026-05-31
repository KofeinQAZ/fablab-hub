import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitAccessRequest } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Rocket, Users, ShieldCheck, ShieldAlert, Pencil, Trash2, Plus, Megaphone, User, Mail, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_student/profile")({
  component: ProfilePage,
});

interface UserProfileData {
  id: string;
  name: string;
  role: string;
  safety_briefing_passed: boolean;
}

interface AuthData {
  userId: string;
  email: string;
  profile: UserProfileData;
}

function ProfilePage() {
  const queryClient = useQueryClient();
  
  // Вкладки профиля
  const [activeTab, setActiveTab] = useState<'info' | 'projects' | 'applications'>('info');

  // --- ОРИГИНАЛЬНЫЕ СТЕЙТЫ ИЗ ТВОЕГО КОДА ---
  const [residencyDialogOpen, setResidencyDialogOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [submittingForm, setSubmittingForm] = useState(false);
  const [briefingDialogOpen, setBriefingDialogOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");

  // --- СТЕЙТЫ ДЛЯ ПРОЕКТОВ ---
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [projTitle, setProjTitle] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projImage, setProjImage] = useState("");
  const [projLooking, setProjLooking] = useState(false);
  const [projRoles, setProjRoles] = useState("");
  const [projStatus, setProjStatus] = useState("in_progress"); // ДОБАВЛЕН СТАТУС ПРОЕКТА

  // --- СТЕЙТЫ ДЛЯ ОБНОВЛЕНИЙ ---
  const [addingUpdateFor, setAddingUpdateFor] = useState<any>(null);
  const [updateContent, setUpdateContent] = useState("");

  // --- 1. ЗАГРУЗКА ДАННЫХ ---
  const { data: authData, isLoading: isAuthLoading } = useQuery<AuthData | null>({
    queryKey: ["current-user-profile"],
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return null;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, role, safety_briefing_passed")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) return null;

      return {
        userId: user.id,
        email: user.email ?? "",
        profile: profile as UserProfileData,
      };
    },
  });

  const { data: userBookings, isLoading: isBookingsLoading } = useQuery({
    queryKey: ["user-bookings", authData?.userId],
    enabled: !!authData?.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, start_time, end_time, status,
          equipment:equipment_id (name, category)
        `)
        .eq("user_id", authData!.userId)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: availableSchedules } = useQuery({
    queryKey: ["mentor-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mentor_schedule").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: myProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["my-projects", authData?.userId],
    enabled: !!authData?.userId,
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("author_id", authData!.userId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: incomingApplications = [], isLoading: appsLoading } = useQuery({
    queryKey: ["incoming-applications", authData?.userId],
    enabled: !!authData?.userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("project_applications")
        .select(`*, projects!inner(id, title, author_id), profiles:applicant_id(name)`)
        .eq("projects.author_id", authData!.userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // --- 2. ЛОГИКА ТВОЕГО ОРИГИНАЛЬНОГО ПРОФИЛЯ ---
  const generatedSlots = useMemo(() => {
    if (!availableSchedules) return [];
    const slots = [];
    const today = new Date();

    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const jsDay = d.getDay();
      const dbDay = jsDay === 0 ? 7 : jsDay;
      const daySchedules = availableSchedules.filter((s: any) => s.day_of_week === dbDay);

      if (daySchedules.length > 0) {
        const dateStr = d.toLocaleDateString("ru-RU", { weekday: 'short', day: 'numeric', month: 'long' });
        const dateIso = d.toISOString().split('T')[0];

        slots.push({
          dateStr, dateIso,
          times: daySchedules.map((s: any) => ({
            start: s.start_time.slice(0, 5),
            end: s.end_time.slice(0, 5),
            value: `${dateIso}T${s.start_time}`
          })).sort((a: any, b: any) => a.start.localeCompare(b.start))
        });
      }
    }
    return slots;
  }, [availableSchedules]);

  const handleRequestSafetyBriefing = async () => {
    if (!selectedTime) {
      toast.error("Пожалуйста, выберите дату и время!");
      return;
    }
    setSubmittingForm(true);
    try {
      await submitAccessRequest({ data: { type: "safety_briefing", scheduled_time: new Date(selectedTime).toISOString() } });
      toast.success("Заявка на инструктаж отправлена!");
      setBriefingDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleRequestResidency = () => {
    setResidencyDialogOpen(true);
  };

  const isValidUrl = (url: string) => {
    try { new URL(url); return true; } catch { return false; }
  };

  const handleSubmitResidencyForm = async () => {
    if (!description.trim()) return toast.error("Пожалуйста, заполните описание проекта");
    if (!cvUrl.trim()) return toast.error("Пожалуйста, введите ссылку на CV");
    if (!isValidUrl(cvUrl)) return toast.error("Пожалуйста, введите корректный URL");

    setSubmittingForm(true);
    try {
      const result = await submitAccessRequest({
        data: { type: "residency", description: description.trim(), cv_url: cvUrl.trim() },
      });
      toast.success(result.message);
      setResidencyDialogOpen(false);
      setDescription(""); setCvUrl("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ошибка при отправке заявки";
      toast.error(errorMessage);
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Вы уверены, что хотите отменить эту бронь?")) return;
    try {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
      if (error) throw error;
      toast.success("Бронирование успешно отменено");
      queryClient.invalidateQueries({ queryKey: ["user-bookings"] });
    } catch (error: any) {
      toast.error("Не удалось отменить бронь: " + error.message);
    }
  };

  // --- 3. МУТАЦИИ ДЛЯ ПРОЕКТОВ ---
  const saveProjectMutation = useMutation({
    mutationFn: async () => {
      const rolesArray = projRoles.split(',').map(r => r.trim()).filter(r => r.length > 0);
      const payload = { 
        title: projTitle, 
        description: projDesc, 
        image_url: projImage, 
        is_looking_for_team: projLooking, 
        looking_for_roles: projLooking ? rolesArray : [],
        status: projStatus // ДОБАВЛЕН СТАТУС В PAYLOAD
      };
      if (editingProject) {
        await supabase.from("projects").update(payload).eq("id", editingProject.id);
      } else {
        await supabase.from("projects").insert({ ...payload, author_id: authData!.userId });
      }
    },
    onSuccess: () => {
      toast.success(editingProject ? "Проект обновлен!" : "Проект создан! Ожидает модерации.");
      setIsCreatingProject(false); setEditingProject(null);
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => supabase.from("projects").delete().eq("id", id),
    onSuccess: () => { toast.success("Проект удален!"); queryClient.invalidateQueries({ queryKey: ["my-projects"] }); }
  });

  const handleApplicationMutation = useMutation({
    mutationFn: async ({ app, status }: { app: any, status: 'accepted' | 'rejected' }) => {
      const { error } = await supabase.from("project_applications").update({ status }).eq("id", app.id);
      if (error) throw error;

      // Генерируем текст в зависимости от решения
      const title = status === 'accepted' ? "🎉 Заявка принята!" : "😔 Заявка отклонена";
      const message = status === 'accepted'
        ? `Автор проекта "${app.projects.title}" принял вашу заявку в команду! Свяжитесь с ним для начала работы.`
        : `Ваша заявка в проект "${app.projects.title}" была отклонена.`;

      // Отправляем пуш заявителю
      await supabase.from("notifications").insert({
        user_id: app.applicant_id,
        title,
        message,
        type: "project"
      });
    },
    onSuccess: () => { 
      toast.success("Статус заявки обновлен"); 
      queryClient.invalidateQueries({ queryKey: ["incoming-applications"] }); 
    }
  });

  const addUpdateMutation = useMutation({
    mutationFn: async () => supabase.from("project_updates").insert({ project_id: addingUpdateFor.id, content: updateContent }),
    onSuccess: () => { toast.success("Новость опубликована!"); setAddingUpdateFor(null); setUpdateContent(""); }
  });

  const openProjectForm = (project: any = null) => {
    if (project) {
      setEditingProject(project); setProjTitle(project.title); setProjDesc(project.description); setProjImage(project.image_url || ""); setProjLooking(project.is_looking_for_team); setProjRoles(project.looking_for_roles?.join(", ") || ""); setProjStatus(project.status || "in_progress");
    } else {
      setEditingProject(null); setProjTitle(""); setProjDesc(""); setProjImage(""); setProjLooking(false); setProjRoles(""); setProjStatus("in_progress");
    }
    setIsCreatingProject(true);
  };

  // --- РЕНДЕР ---
  if (isAuthLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl p-4 md:p-6">
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6 text-slate-500">Загрузка профиля...</CardContent>
        </Card>
      </main>
    );
  }

  if (!authData) return <Navigate to="/login" />;

  const roleLabel = authData.profile.role === "student" ? "Студент" : "Резидент";
  const briefingStatus = authData.profile.safety_briefing_passed ? "Пройден" : "Не пройден";
  const briefingVariant = authData.profile.safety_briefing_passed ? "default" : "destructive";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-amber-500 hover:bg-amber-600">Ожидает</Badge>;
      case "approved": 
      case "active": return <Badge className="bg-emerald-500 hover:bg-emerald-600">Активно</Badge>;
      case "rejected": return <Badge variant="destructive">Отклонено</Badge>;
      case "cancelled": return <Badge variant="secondary">Отменено</Badge>;
      case "completed": return <Badge className="bg-blue-500 hover:bg-blue-600">Завершено</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl p-4 md:p-6 space-y-8">
      <h1 className="text-4xl font-black text-slate-900 tracking-tight">Личный кабинет</h1>

      {/* ТАБЫ НАВИГАЦИИ */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('info')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'info' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
          <User className="h-4 w-4 inline-block mr-2" /> Профиль и Брони
        </button>
        <button onClick={() => setActiveTab('projects')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'projects' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
          <Rocket className="h-4 w-4 inline-block mr-2" /> Мои проекты
        </button>
        <button onClick={() => setActiveTab('applications')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all relative ${activeTab === 'applications' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
          <Users className="h-4 w-4 inline-block mr-2" /> Заявки в команду
          {incomingApplications.length > 0 && <span className="absolute top-2 right-2 h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>}
        </button>
      </div>

      {/* ВКАЛДКА 1: ПРОФИЛЬ И БРОНИ (Полностью твой оригинальный код) */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Info Card */}
            <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm h-full">
              <CardHeader>
                <CardTitle className="text-2xl">Профиль пользователя</CardTitle>
                <CardDescription>Ваша информация в системе</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600">Имя</p>
                  <p className="text-lg font-semibold text-slate-900">{authData.profile.name}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600">Email</p>
                  <p className="text-lg text-slate-900">{authData.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Access Level Card */}
            <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm h-full">
              <CardHeader>
                <CardTitle className="text-2xl">Уровень доступа</CardTitle>
                <CardDescription>Управление правами доступа</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600">Текущая роль</p>
                    <p className="text-lg font-semibold text-slate-900">{roleLabel}</p>
                  </div>
                  <Badge className="text-base px-3 py-1" variant="outline">{roleLabel}</Badge>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600">Инструктаж (ТБ)</p>
                    <p className="text-xs text-slate-700 mt-1 max-w-[180px]">
                      {authData.profile.safety_briefing_passed ? "У вас есть доступ к оборудованию" : "Требуется инструктаж"}
                    </p>
                  </div>
                  <Badge className="text-base px-3 py-1" variant={briefingVariant}>{briefingStatus}</Badge>
                </div>

                <div className="space-y-3 pt-2">
                  {!authData.profile.safety_briefing_passed && (
                    <Dialog open={briefingDialogOpen} onOpenChange={setBriefingDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                          Запросить сдачу ТБ
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Запись на инструктаж (ТБ)</DialogTitle>
                          <p className="text-sm text-slate-500 mt-2">Выберите удобное время для инструктажа.</p>
                        </DialogHeader>
                        <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto pr-2">
                          {generatedSlots.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">
                              Нет доступных слотов. Попробуйте позже.
                            </p>
                          ) : (
                            generatedSlots.map((day, idx) => (
                              <div key={idx} className="space-y-2">
                                <h4 className="text-sm font-semibold text-slate-700 capitalize border-b pb-1">{day.dateStr}</h4>
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {day.times.map((time: any, tIdx: number) => (
                                    <button
                                      key={tIdx}
                                      onClick={() => setSelectedTime(time.value)}
                                      className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
                                        selectedTime === time.value
                                          ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
                                          : "bg-white text-slate-700 border-slate-200 hover:border-blue-600 hover:text-blue-600"
                                      }`}
                                    >
                                      {time.start} — {time.end}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                          <Button 
                            className="w-full mt-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold" 
                            onClick={handleRequestSafetyBriefing} 
                            disabled={submittingForm || !selectedTime}
                          >
                            {submittingForm ? "Отправка..." : "Подтвердить запись"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {authData.profile.safety_briefing_passed && authData.profile.role === "student" && (
                    <Button onClick={handleRequestResidency} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                      Заявка на Резидентство
                    </Button>
                  )}

                  {authData.profile.role === "resident" && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                      <p className="text-sm font-medium text-emerald-900">✓ Полный доступ к ресурсам</p>
                    </div>
                  )}
                </div>
              </CardContent> 
            </Card>
          </div>

          {/* Bookings List Card */}
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Мои бронирования</CardTitle>
              <CardDescription>История и статусы ваших заявок на оборудование</CardDescription>
            </CardHeader>
            <CardContent>
              {isBookingsLoading ? (
                <p className="text-slate-500 text-center py-4">Загрузка бронирований...</p>
              ) : !userBookings || userBookings.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-500 font-medium">У вас пока нет бронирований</p>
                  <p className="text-sm text-slate-400 mt-1">Зайдите в раздел оборудования, чтобы создать первую бронь.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userBookings.map((booking) => {
                    const startDate = new Date(booking.start_time);
                    const endDate = new Date(booking.end_time);
                    const equipName = booking.equipment?.name || "Неизвестное оборудование";
                    
                    return (
                      <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-200 transition-colors gap-4 shadow-sm">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-slate-900 text-lg">{equipName}</h4>
                          <p className="text-sm text-slate-500 flex items-center gap-2">
                            <span className="font-medium text-slate-700">{format(startDate, 'd MMMM', { locale: ru })}</span>
                            <span>•</span>
                            <span>{format(startDate, 'HH:mm')} — {format(endDate, 'HH:mm')}</span>
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4 self-start sm:self-auto">
                          {getStatusBadge(booking.status)}
                          
                          {(booking.status === "pending" || booking.status === "approved" || booking.status === "active") && (
                            <Button 
                              variant="outline" size="sm" 
                              onClick={() => handleCancelBooking(booking.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              Отменить
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Residency Dialog */}
          <Dialog open={residencyDialogOpen} onOpenChange={setResidencyDialogOpen}>
            <DialogContent className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900">Заявка на Резидентство</DialogTitle>
                <DialogDescription className="text-slate-600">Заполните форму, чтобы подать заявку на статус резидента</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-slate-900">Описание вашего проекта <span className="text-red-500">*</span></Label>
                  <Textarea id="description" placeholder="Расскажите о своём проекте и целях..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[120px] rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cv_url" className="text-sm font-medium text-slate-900">Ссылка на ваше CV <span className="text-red-500">*</span></Label>
                  <Input id="cv_url" type="url" placeholder="https://drive.google.com/..." value={cvUrl} onChange={(e) => setCvUrl(e.target.value)} className="rounded-lg" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={() => setResidencyDialogOpen(false)} variant="outline" className="flex-1 rounded-lg">Отмена</Button>
                <Button onClick={handleSubmitResidencyForm} disabled={submittingForm} className="flex-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                  {submittingForm ? "Отправка..." : "Отправить"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ВКАЛДКА 2: МОИ ПРОЕКТЫ */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-slate-900">Мои проекты</h2>
            <Button onClick={() => openProjectForm()} className="bg-[#005BAB] rounded-xl font-bold"><Plus className="h-5 w-5 mr-1" /> Создать проект</Button>
          </div>
          {projectsLoading ? <p>Загрузка...</p> : myProjects.length === 0 ? <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400">Нет проектов</div> : (
            <div className="grid gap-6">
              {myProjects.map((p: any) => (
                <Card key={p.id} className="rounded-3xl p-6 flex flex-col md:flex-row gap-6 border-slate-100 shadow-sm">
                  <div className="w-full md:w-48 h-32 bg-slate-100 rounded-2xl overflow-hidden shrink-0">
                    {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-black text-slate-300">IMG</div>}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col items-start gap-1">
                        <h3 className="text-xl font-black">{p.title}</h3>
                        {/* БЕЙДЖ МОДЕРАЦИИ И АРХИВА */}
                        {p.is_rejected ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 shadow-sm">
                            ❌ Отклонен (в архиве)
                          </Badge>
                        ) : !p.is_approved ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shadow-sm">
                            ⏳ На модерации (не виден другим)
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => setAddingUpdateFor(p)}><Megaphone className="h-4 w-4 mr-1" /> Новость</Button>
                        <Button variant="ghost" size="sm" onClick={() => openProjectForm(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {if(confirm('Удалить?')) deleteProjectMutation.mutate(p.id)}}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <p className="text-slate-500 text-sm line-clamp-2">{p.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ВКАЛДКА 3: ВХОДЯЩИЕ ЗАЯВКИ */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-slate-900">Заявки в команду</h2>
          {appsLoading ? <p>Загрузка...</p> : incomingApplications.length === 0 ? <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400">Новых заявок пока нет.</div> : (
            <div className="grid gap-4">
              {incomingApplications.map((app: any) => (
                <Card key={app.id} className="rounded-3xl border-slate-100 p-6 flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-2 flex-1">
                    <p className="text-xs font-bold text-blue-600 uppercase">Проект: {app.projects.title}</p>
                    <h3 className="text-lg font-black flex items-center gap-2"><User className="h-5 w-5"/> {app.profiles?.name}</h3>
                    <div className="p-4 bg-slate-50 rounded-2xl border text-sm text-slate-700 whitespace-pre-wrap">{app.cover_letter}</div>
                  </div>
                  <div className="flex md:flex-col gap-2 shrink-0">
                    <Button className="bg-emerald-600" onClick={() => handleApplicationMutation.mutate({app: app, status: 'accepted'})}>Принять</Button>
                    <Button variant="outline" className="text-red-600" onClick={() => handleApplicationMutation.mutate({app: app, status: 'rejected'})}>Отклонить</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* МОДАЛКА: ПРОЕКТЫ */}
      <Dialog open={isCreatingProject} onOpenChange={setIsCreatingProject}>
        <DialogContent className="max-w-2xl rounded-[32px] p-8">
          <div className="flex justify-between items-start mb-6">
            <DialogTitle className="text-3xl font-black">{editingProject ? "Редактировать" : "Новый проект"}</DialogTitle>
            <button onClick={() => setIsCreatingProject(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full"><X className="h-5 w-5 text-slate-500" /></button>
          </div>
          <div className="space-y-4">
            <Input placeholder="Название" className="h-12 rounded-xl" value={projTitle} onChange={e => setProjTitle(e.target.value)} />
            <Textarea placeholder="Описание" className="h-28 rounded-xl resize-none" value={projDesc} onChange={e => setProjDesc(e.target.value)} />
            <Input placeholder="URL обложки" className="h-12 rounded-xl" value={projImage} onChange={e => setProjImage(e.target.value)} />
            
            {/* ВЫБОР СТАТУСА ПРОЕКТА */}
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Статус проекта</Label>
              <select className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 outline-none" value={projStatus} onChange={e => setProjStatus(e.target.value)}>
                <option value="idea">💡 Идея (на этапе задумки)</option>
                <option value="in_progress">⚙️ В разработке (процесс идет)</option>
                <option value="completed">✅ Завершен</option>
              </select>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl">
              <label className="flex items-center gap-2 font-bold text-blue-900 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded" checked={projLooking} onChange={e => setProjLooking(e.target.checked)} /> Ищу команду
              </label>
              {projLooking && <Input className="mt-4 h-12 rounded-xl" placeholder="Кого ищем? (через запятую)" value={projRoles} onChange={e => setProjRoles(e.target.value)} />}
            </div>
            <Button onClick={() => saveProjectMutation.mutate()} disabled={!projTitle || saveProjectMutation.isPending} className="w-full h-14 bg-[#005BAB] text-lg rounded-2xl">Сохранить</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* МОДАЛКА: НОВОСТЬ ДЛЯ ПРОЕКТА */}
      <Dialog open={!!addingUpdateFor} onOpenChange={(v) => !v && setAddingUpdateFor(null)}>
        <DialogContent className="max-w-md rounded-[32px] p-6">
          <div className="flex justify-between items-start mb-4">
            <DialogTitle className="text-2xl font-black">Новость для проекта</DialogTitle>
            <button onClick={() => setAddingUpdateFor(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full"><X className="h-5 w-5 text-slate-500" /></button>
          </div>
          <Textarea placeholder="Что нового?" className="h-32 mt-4 rounded-2xl resize-none" value={updateContent} onChange={e => setUpdateContent(e.target.value)} />
          <Button onClick={() => addUpdateMutation.mutate()} disabled={!updateContent.trim()} className="w-full h-12 mt-4 bg-emerald-600 rounded-xl">Опубликовать</Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}