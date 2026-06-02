import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Rocket, Users, ShieldCheck, ShieldAlert, Pencil, Trash2, Plus, Megaphone, User, Mail, X, Calendar, Activity, Phone, Clock, FileText, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_student/profile")({
  component: ProfilePage,
});

interface UserProfileData {
  id: string;
  name: string;
  role: string;
  safety_briefing_passed: boolean;
  contact_email?: string;
  contact_phone?: string; // ИСПРАВЛЕНО НА TELEPHONE
}

interface AuthData {
  userId: string;
  email: string;
  profile: UserProfileData;
}

function ProfilePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Вкладки профиля
  const [activeTab, setActiveTab] = useState<'info' | 'projects' | 'applications'>('info');

  const [residencyDialogOpen, setResidencyDialogOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [submittingForm, setSubmittingForm] = useState(false);
  const [briefingDialogOpen, setBriefingDialogOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");

  // --- СТЕЙТЫ ДЛЯ КОНТАКТОВ (ИСПРАВЛЕННЫЕ) ---
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState(""); // ИСПРАВЛЕНО
  const [savingContacts, setSavingContacts] = useState(false);

  // --- СТЕЙТЫ ДЛЯ ПРОЕКТОВ ---
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [projTitle, setProjTitle] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projImage, setProjImage] = useState("");
  const [projLooking, setProjLooking] = useState(false);
  const [projRoles, setProjRoles] = useState("");
  const [projStatus, setProjStatus] = useState("in_progress");

  // --- СТЕЙТЫ ДЛЯ ОБНОВЛЕНИЙ ---
  const [addingUpdateFor, setAddingUpdateFor] = useState<any>(null);
  const [updateContent, setUpdateContent] = useState("");

  // --- СТЕЙТЫ ДЛЯ УДАЛЕНИЯ АККАУНТА ---
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const { data: authData, isLoading: isAuthLoading } = useQuery<AuthData | null>({
    queryKey: ["current-user-profile"],
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return null;

      // ИСПРАВЛЕНО: Вытягиваем правильные колонки
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, role, safety_briefing_passed, contact_email, contact_phone")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) return null;

      // ИСПРАВЛЕНО: Присваиваем правильные значения стейтам
      if (profile.contact_email) setContactEmail(profile.contact_email);
      if (profile.contact_phone) setContactPhone(profile.contact_phone);

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

  // --- 2. ЛОГИКА СЛОТОВ И ИНСТРУКТАЖЕЙ ---
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

  // --- 2.5 СОХРАНЕНИЕ КОНТАКТОВ (ИСПРАВЛЕНО) ---
  const saveContactsMutation = useMutation({
    mutationFn: async () => {
      if (!authData?.userId) throw new Error("Ошибка профиля");
      
      const { data, error } = await supabase
        .from("profiles")
        .update({ 
          contact_email: contactEmail,
          contact_phone: contactPhone // СОХРАНЯЕМ ИМЕННО В PHONE
        })
        .eq("id", authData.userId)
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Не удалось сохранить контакты");
    },
    onSuccess: () => {
      toast.success("Контакты сохранены!");
      queryClient.invalidateQueries({ queryKey: ["current-user-profile"] });
    },
    onError: (error: Error) => {
      toast.error("Ошибка сохранения: " + error.message);
    }
  });

  const handleSaveContacts = async () => {
    setSavingContacts(true);
    try { await saveContactsMutation.mutateAsync(); } finally { setSavingContacts(false); }
  };

  // --- УДАЛЕНИЕ АККАУНТА ---
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "УДАЛИТЬ") {
      toast.error("Введите слово 'УДАЛИТЬ' для подтверждения");
      return;
    }

    setDeletingAccount(true);
    try {
      const { error } = await supabase.rpc("delete_user_account");
      if (error) throw error;

      toast.success("Аккаунт успешно удален");
      await supabase.auth.signOut();
      setTimeout(() => navigate({ to: "/login" }), 1000);
    } catch (error: any) {
      toast.error("Ошибка при удалении аккаунта: " + error.message);
    } finally {
      setDeletingAccount(false);
    }
  };

  // --- 3. МУТАЦИИ ПРОЕКТОВ И ЗАЯВОК ---
  const saveProjectMutation = useMutation({
    mutationFn: async () => {
      const rolesArray = projRoles.split(',').map(r => r.trim()).filter(r => r.length > 0);
      const payload = { 
        title: projTitle, description: projDesc, image_url: projImage, 
        is_looking_for_team: projLooking, looking_for_roles: projLooking ? rolesArray : [],
        status: projStatus 
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

      const title = status === 'accepted' ? "🎉 Заявка принята!" : "😔 Заявка отклонена";
      const message = status === 'accepted'
        ? `Автор проекта "${app.projects.title}" принял вашу заявку в команду! Свяжитесь с ним для начала работы.`
        : `Ваша заявка в проект "${app.projects.title}" была отклонена.`;

      await supabase.from("notifications").insert({
        user_id: app.applicant_id, title, message, type: "project"
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

  if (isAuthLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl p-4 md:p-6 text-center font-black uppercase tracking-widest text-xs text-slate-400 py-20">
        Загрузка личного кабинета...
      </main>
    );
  }

  if (!authData) return <Navigate to="/login" />;

  const roleLabel = authData.profile.role === "student" ? "Студент" : authData.profile.role === "resident" ? "Резидент" : "Админ";
  const briefingStatus = authData.profile.safety_briefing_passed ? "ПРОЙДЕН" : "НЕ ПРОЙДЕН";

  const getStatusBadge = (status: string) => {
    const bStyle = "font-black uppercase tracking-widest text-[9px] border-2 border-slate-900 px-2 py-0.5 shadow-[2px_2px_0_#0f172a]";
    switch (status) {
      case "pending": return <span className={`bg-amber-400 text-slate-900 ${bStyle}`}>Ожидает</span>;
      case "approved": 
      case "active": return <span className={`bg-emerald-400 text-slate-900 ${bStyle}`}>Активно</span>;
      case "rejected": return <span className={`bg-rose-500 text-white ${bStyle}`}>Отклонено</span>;
      case "cancelled": return <span className={`bg-slate-300 text-slate-700 ${bStyle}`}>Отменено</span>;
      case "completed": return <span className={`bg-blue-500 text-white ${bStyle}`}>Завершено</span>;
      default: return <span className={`bg-white text-slate-900 ${bStyle}`}>{status}</span>;
    }
  };

  return (
    <main className="w-full max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24 overflow-hidden">
      
      {/* HEADER SECTION */}
      <div className="border-b-4 border-slate-900 pb-6">
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter">Личный кабинет</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm mt-2">Управление вашим профилем, бронями и проектами</p>
      </div>

      {/* БРУТАЛЬНЫЕ ТАБЫ НАВИГАЦИИ */}
      <div className="flex flex-col sm:flex-row gap-2 p-1 bg-slate-900 border-4 border-slate-900 shadow-[4px_4px_0_#0f172a] rounded-none w-full sm:w-max">
        <button 
          onClick={() => setActiveTab('info')} 
          className={`px-6 py-3 rounded-none text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'info' ? 'bg-white text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'}`}
        >
          <User className="h-4 w-4 inline-block mr-2" /> Профиль и Брони
        </button>
        <button 
          onClick={() => setActiveTab('projects')} 
          className={`px-6 py-3 rounded-none text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'projects' ? 'bg-white text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'}`}
        >
          <Rocket className="h-4 w-4 inline-block mr-2" /> Мои проекты
        </button>
        <button 
          onClick={() => setActiveTab('applications')} 
          className={`px-6 py-3 rounded-none text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'applications' ? 'bg-white text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'}`}
        >
          <Users className="h-4 w-4 inline-block mr-2" /> Заявки в команду
          {incomingApplications.length > 0 && <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-slate-900"></span>}
        </button>
      </div>

      {/* ======================================================================= */}
      {/* ВКЛАДКА 1: ПРОФИЛЬ И БРОНИ */}
      {/* ======================================================================= */}
      {activeTab === 'info' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* User Info & Contacts (Единый блок) */}
            <div className="bg-white border-4 border-slate-900 p-6 shadow-[6px_6px_0_#0f172a] space-y-6">
              <div>
                <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-400 mb-1">Студент</h4>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{authData.profile.name}</h2>
                <p className="text-sm font-bold text-slate-500 mt-1">{authData.email}</p>
              </div>

              <div className="border-t-2 border-dashed border-slate-200 pt-4 space-y-4">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-900">Контакты для связи</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="contact_email" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Email для коллабораций</Label>
                    <Input id="contact_email" type="email" placeholder="example@email.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="h-11 border-2 border-slate-900 rounded-none bg-slate-50 font-bold text-sm focus-visible:ring-0 focus-visible:border-blue-600" />
                  </div>
                  {/* ИСПРАВЛЕНО: ТЕПЕРЬ ТУТ ТЕЛЕФОН */}
                  <div className="space-y-1">
                    <Label htmlFor="contact_phone" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Номер телефона</Label>
                    <Input id="contact_phone" type="tel" placeholder="+7 (777) 000-00-00" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="h-11 border-2 border-slate-900 rounded-none bg-slate-50 font-bold text-sm focus-visible:ring-0 focus-visible:border-blue-600" />
                  </div>
                  <Button onClick={handleSaveContacts} disabled={savingContacts} className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-xs h-12 rounded-none border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all">
                    {savingContacts ? "Сохранение..." : "Сохранить контакты"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Access Level Card */}
            <div className="bg-white border-4 border-slate-900 p-6 shadow-[6px_6px_0_#0f172a] flex flex-col justify-between">
              <div className="space-y-5">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Уровни допусков</h3>
                
                <div className="flex items-center justify-between border-2 border-slate-900 p-3 bg-slate-50">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Роль в системе</p>
                    <p className="font-black text-slate-900 uppercase tracking-tight text-sm mt-0.5">{roleLabel}</p>
                  </div>
                  <span className="bg-blue-600 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-[9px] px-2 py-1 shadow-[2px_2px_0_#0f172a]">{roleLabel}</span>
                </div>

                <div className="flex items-center justify-between border-2 border-slate-900 p-3 bg-slate-50">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Инструктаж по ТБ</p>
                    <p className="text-xs font-medium text-slate-600 mt-0.5 truncate max-w-[200px]">
                      {authData.profile.safety_briefing_passed ? "Доступ к станкам открыт" : "Доступ заблокирован"}
                    </p>
                  </div>
                  <span className={`border-2 border-slate-900 font-black uppercase tracking-widest text-[9px] px-2 py-1 shadow-[2px_2px_0_#0f172a] ${authData.profile.safety_briefing_passed ? 'bg-emerald-400 text-slate-900' : 'bg-rose-500 text-white'}`}>
                    {briefingStatus}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-dashed border-slate-200 mt-6">
                {!authData.profile.safety_briefing_passed && (
                  <Dialog open={briefingDialogOpen} onOpenChange={setBriefingDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-black uppercase tracking-widest text-xs h-14 border-2 border-slate-900 rounded-none shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all">
                        Запросить сдачу ТБ
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-0 border-4 border-slate-900 bg-white rounded-none shadow-[12px_12px_0_#0f172a] flex flex-col max-h-[85vh] outline-none z-50">
                      <div className="bg-slate-900 p-5 flex justify-between items-start border-b-4 border-slate-900 text-white">
                        <DialogTitle className="text-xl font-black uppercase tracking-tighter">Запись на инструктаж</DialogTitle>
                        <button onClick={() => setBriefingDialogOpen(false)} className="p-1.5 bg-white text-slate-900 border-2 border-slate-900 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0_#0f172a]">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="p-6 overflow-y-auto space-y-5">
                        {generatedSlots.length === 0 ? (
                          <p className="text-xs font-bold text-center uppercase tracking-widest text-slate-400 py-6 border-2 border-dashed border-slate-200 bg-slate-50">
                            Нет доступных слотов на этой неделе
                          </p>
                        ) : (
                          generatedSlots.map((day, idx) => (
                            <div key={idx} className="space-y-2">
                              <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-200 pb-1">{day.dateStr}</h4>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {day.times.map((time: any, tIdx: number) => (
                                  <button
                                    key={tIdx}
                                    onClick={() => setSelectedTime(time.value)}
                                    className={`px-3 py-1.5 text-xs font-bold uppercase border-2 transition-all ${
                                      selectedTime === time.value
                                        ? "bg-blue-600 text-white border-slate-900 shadow-[2px_2px_0_#0f172a] translate-x-[1px] translate-y-[1px]"
                                        : "bg-white text-slate-900 border-slate-900 shadow-[2px_2px_0_#0f172a] hover:bg-slate-50"
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
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-xs h-12 rounded-none shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all mt-4" 
                          onClick={handleRequestSafetyBriefing} 
                          disabled={submittingForm || !selectedTime}
                        >
                          {submittingForm ? "Отправка..." : "ПОДТВЕРДИТЬ ЗАПИСЬ"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {authData.profile.safety_briefing_passed && authData.profile.role === "student" && (
                  <Button onClick={handleRequestResidency} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest text-xs h-14 border-2 border-slate-900 rounded-none shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all">
                    Заявка на Резидентство
                  </Button>
                )}

                {authData.profile.role === "resident" && (
                  <div className="border-2 border-emerald-500 bg-emerald-50 p-4 text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-900">✓ Доступен полный каталог Фаблаба</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bookings List Block */}
          <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a]">
            <div className="bg-slate-900 text-white p-4 border-b-4 border-slate-900">
              <h2 className="text-xl font-black uppercase tracking-tight">Мои бронирования</h2>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              {isBookingsLoading ? (
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center py-4 animate-pulse">Загрузка расписания...</p>
              ) : !userBookings || userBookings.length === 0 ? (
                <div className="text-center py-10 border-4 border-dashed border-slate-200 bg-slate-50">
                  <p className="font-black uppercase tracking-widest text-xs text-slate-400">У вас пока нет активных бронирований</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {userBookings.map((booking) => {
                    const startDate = new Date(booking.start_time);
                    const endDate = new Date(booking.end_time);
                    const equipName = booking.equipment?.name || "Станок";
                    
                    return (
                      <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-2 border-slate-900 bg-slate-50 hover:bg-blue-50/40 transition-colors gap-4">
                        <div className="space-y-2">
                          <h4 className="font-black text-lg text-slate-900 uppercase tracking-tight">{equipName}</h4>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-600" /> {format(startDate, 'd MMMM', { locale: ru })}</span>
                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-600" /> {format(startDate, 'HH:mm')} — {format(endDate, 'HH:mm')}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 self-start sm:self-auto shrink-0">
                          {getStatusBadge(booking.status)}
                          
                          {(booking.status === "pending" || booking.status === "approved" || booking.status === "active") && (
                            <Button 
                              variant="outline" 
                              onClick={() => handleCancelBooking(booking.id)}
                              className="border-2 border-slate-900 text-slate-900 hover:bg-red-50 hover:text-red-600 font-bold uppercase tracking-widest text-[10px] px-3 shadow-[2px_2px_0_#0f172a] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all"
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
            </div>
          </div>

          {/* Residency Request Dialog */}
          <Dialog open={residencyDialogOpen} onOpenChange={setResidencyDialogOpen}>
            <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-0 border-4 border-slate-900 bg-white rounded-none shadow-[12px_12px_0_#0f172a] flex flex-col max-h-[85vh] outline-none z-50">
              <div className="bg-slate-900 p-5 flex justify-between items-start border-b-4 border-slate-900 text-white">
                <DialogTitle className="text-xl font-black uppercase tracking-tighter">Заявка на Резидентство</DialogTitle>
                <button onClick={() => setResidencyDialogOpen(false)} className="p-1.5 bg-white text-slate-900 border-2 border-slate-900 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0_#0f172a]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Описание проекта *</Label>
                  <Textarea id="description" placeholder="Расскажите, какой стартап или идею вы планируете разрабатывать..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[120px] border-2 border-slate-900 rounded-none bg-slate-50 focus-visible:ring-0 focus-visible:border-blue-600 font-medium resize-none" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cv_url" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ссылка на портфолио / CV *</Label>
                  <Input id="cv_url" type="url" placeholder="https://drive.google.com/..." value={cvUrl} onChange={(e) => setCvUrl(e.target.value)} className="h-11 border-2 border-slate-900 rounded-none bg-slate-50 font-bold focus-visible:ring-0 focus-visible:border-blue-600" />
                </div>
                <div className="flex gap-3 pt-4 border-t-2 border-slate-100 mt-4">
                  <Button onClick={() => setResidencyDialogOpen(false)} variant="outline" className="flex-1 border-2 border-slate-900 font-black uppercase tracking-widest text-xs rounded-none shadow-[2px_2px_0_#0f172a] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all">Отмена</Button>
                  <Button onClick={handleSubmitResidencyForm} disabled={submittingForm} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-xs rounded-none shadow-[2px_2px_0_#0f172a] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all">
                    {submittingForm ? "Отправка..." : "ОТПРАВИТЬ"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ВКАЛДКА 2: МОИ ПРОЕКТЫ */}
      {/* ======================================================================= */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b-2 border-slate-200 pb-4">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Мои стартапы</h2>
            <Button onClick={() => openProjectForm()} className="bg-blue-600 hover:bg-blue-700 text-white border-4 border-slate-900 px-6 py-6 font-black text-xs tracking-widest uppercase transition-all shadow-[4px_4px_0_#0f172a] hover:translate-y-1 hover:translate-x-1 hover:shadow-none">
              <Plus className="h-5 w-5 mr-2" /> Добавить проект
            </Button>
          </div>
          
          {projectsLoading ? <p className="text-center font-bold text-slate-400">Загрузка витрины...</p> : myProjects.length === 0 ? <div className="text-center py-16 border-4 border-dashed border-slate-200 bg-white font-bold uppercase tracking-widest text-xs text-slate-400">У вас пока нет созданных проектов</div> : (
            <div className="grid gap-6">
              {myProjects.map((p: any) => (
                <div key={p.id} className="border-4 border-slate-900 bg-white p-4 md:p-6 flex flex-col md:flex-row gap-6 shadow-[6px_6px_0_#0f172a]">
                  <div className="w-full md:w-48 h-32 border-2 border-slate-900 bg-slate-100 overflow-hidden shrink-0">
                    {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" alt=""/> : <div className="w-full h-full flex items-center justify-center font-black text-slate-300 uppercase tracking-widest text-xs">МЕДИА</div>}
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight truncate">{p.title}</h3>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {p.is_rejected ? (
                            <span className="bg-red-100 text-red-700 border border-red-200 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5">❌ Отклонен в архив</span>
                          ) : !p.is_approved ? (
                            <span className="bg-amber-100 text-amber-700 border border-amber-200 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5">⏳ На проверке модератора</span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5">🚀 Опубликован</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button className="bg-white border-2 border-slate-900 text-slate-900 hover:bg-blue-50 font-black uppercase tracking-widest text-[10px] shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all px-3 h-9" onClick={() => setAddingUpdateFor(p)}><Megaphone className="h-4 w-4 mr-1" /> Апдейт</Button>
                        <Button variant="ghost" className="border-2 border-transparent hover:border-slate-900 rounded-none text-slate-600 h-9 px-3" onClick={() => openProjectForm(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" className="text-red-500 border-2 border-transparent hover:border-red-200 rounded-none h-9 px-3" onClick={() => {if(confirm('Удалить проект окончательно?')) deleteProjectMutation.mutate(p.id)}}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <p className="text-slate-600 font-medium text-sm line-clamp-2 leading-relaxed">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* ВКАЛДКА 3: ВХОДЯЩИЕ ЗАЯВКИ В КОМАНДУ */}
      {/* ======================================================================= */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight border-b-2 border-slate-200 pb-4">Запросы на вступление</h2>
          {appsLoading ? <p className="text-center font-bold text-slate-400">Сверяем списки...</p> : incomingApplications.length === 0 ? <div className="text-center py-16 border-4 border-dashed border-slate-200 bg-white font-bold uppercase tracking-widest text-xs text-slate-400">Входящих откликов на ваши вакансии пока нет</div> : (
            <div className="grid gap-4">
              {incomingApplications.map((app: any) => (
                <div key={app.id} className="border-4 border-slate-900 bg-white p-4 md:p-6 flex flex-col md:flex-row justify-between gap-6 shadow-[6px_6px_0_#0f172a]">
                  <div className="space-y-3 flex-1 min-w-0">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 border border-blue-200 font-black text-[9px] uppercase tracking-widest">Проект: {app.projects.title}</span>
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2 mt-2"><User className="h-5 w-5 text-blue-600"/> {app.profiles?.name}</h3>
                    <div className="p-4 bg-slate-50 border-2 border-slate-200 text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">{app.cover_letter}</div>
                  </div>
                  <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-32 mt-4 md:mt-0">
                    <Button className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-xs rounded-none shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all py-5 md:py-2" onClick={() => handleApplicationMutation.mutate({app: app, status: 'accepted'})}>Принять</Button>
                    <Button variant="outline" className="flex-1 md:flex-none border-2 border-slate-900 text-slate-900 hover:bg-red-50 hover:text-red-600 font-black uppercase tracking-widest text-xs rounded-none shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all py-5 md:py-2" onClick={() => handleApplicationMutation.mutate({app: app, status: 'rejected'})}>Отклонить</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* МОДАЛКА: СОЗДАНИЕ И РЕДАКТИРОВАНИЕ ПРОЕКТА */}
      {/* ======================================================================= */}
      <Dialog open={isCreatingProject} onOpenChange={setIsCreatingProject}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl p-0 border-4 border-slate-900 bg-white rounded-none shadow-[12px_12px_0_#0f172a] flex flex-col max-h-[85vh] outline-none z-50">
          <div className="bg-slate-900 p-5 flex justify-between items-start border-b-4 border-slate-900 text-white">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">{editingProject ? "Редактирование" : "Новый стартап"}</DialogTitle>
            <button onClick={() => setIsCreatingProject(false)} className="p-1.5 bg-white text-slate-900 border-2 border-slate-900 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0_#0f172a]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Название стартапа</Label>
              <Input placeholder="Введите название..." className="h-12 border-2 border-slate-900 rounded-none bg-slate-50 font-bold focus-visible:ring-0 focus-visible:border-blue-600" value={projTitle} onChange={e => setProjTitle(e.target.value)} />
            </div>
            
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Подробное описание проекта</Label>
              <Textarea placeholder="Расскажите суть идеи, цели и текущий прогресс..." className="h-28 border-2 border-slate-900 rounded-none bg-slate-50 font-medium focus-visible:ring-0 focus-visible:border-blue-600 resize-none" value={projDesc} onChange={e => setProjDesc(e.target.value)} />
            </div>
            
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ссылка на обложку (URL)</Label>
              <Input placeholder="https://..." className="h-12 border-2 border-slate-900 rounded-none bg-slate-50 font-medium focus-visible:ring-0 focus-visible:border-blue-600" value={projImage} onChange={e => setProjImage(e.target.value)} />
            </div>
            
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Текущий статус разработки</Label>
              <select className="w-full h-12 px-3 border-2 border-slate-900 rounded-none bg-white font-bold text-sm outline-none focus:border-blue-600" value={projStatus} onChange={e => setProjStatus(e.target.value)}>
                <option value="idea">💡 Идея (на этапе задумки)</option>
                <option value="in_progress">⚙️ В разработке (процесс идет)</option>
                <option value="completed">✅ Завершен</option>
              </select>
            </div>

            <div className="p-4 bg-blue-50 border-2 border-blue-200">
              <label className="flex items-center gap-3 font-black uppercase tracking-widest text-xs text-blue-900 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded-none border-2 border-slate-900 accent-blue-600" checked={projLooking} onChange={e => setProjLooking(e.target.checked)} /> Расширяю команду / Ищу людей
              </label>
              {projLooking && (
                <div className="mt-3 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-blue-800">Кто вам нужен? (укажите роли через запятую)</Label>
                  <Input className="h-12 border-2 border-blue-300 rounded-none bg-white font-bold focus-visible:ring-0 focus-visible:border-blue-600" placeholder="Frontend, Инженер, 3D-моделлер..." value={projRoles} onChange={e => setProjRoles(e.target.value)} />
                </div>
              )}
            </div>
            
            <Button onClick={() => saveProjectMutation.mutate()} disabled={!projTitle || saveProjectMutation.isPending} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-slate-900 border-2 border-slate-900 font-black text-sm uppercase tracking-widest rounded-none shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all mt-4">
              {saveProjectMutation.isPending ? "Сохранение..." : "СОХРАНИТЬ ПРОЕКТ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================================= */}
      {/* МОДАЛКА: СОЗДАНИЕ ОБНОВЛЕНИЯ (ДЕВЛОГ) */}
      {/* ======================================================================= */}
      <Dialog open={!!addingUpdateFor} onOpenChange={(v) => !v && setAddingUpdateFor(null)}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-0 border-4 border-slate-900 bg-white rounded-none shadow-[12px_12px_0_#0f172a] flex flex-col max-h-[85vh] outline-none z-50">
          <div className="bg-slate-900 p-5 flex justify-between items-start border-b-4 border-slate-900 text-white">
            <DialogTitle className="text-xl font-black uppercase tracking-tighter">Опубликовать новость</DialogTitle>
            <button onClick={() => setAddingUpdateFor(null)} className="p-1.5 bg-white text-slate-900 border-2 border-slate-900 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0_#0f172a]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Текст лога разработки (Девлог)</Label>
              <Textarea placeholder="Что нового произошло в проекте? Опишите краткие изменения..." className="h-32 border-2 border-slate-900 rounded-none bg-slate-50 font-medium focus-visible:ring-0 focus-visible:border-blue-600 resize-none" value={updateContent} onChange={e => setUpdateContent(e.target.value)} />
            </div>
            <Button onClick={() => addUpdateMutation.mutate()} disabled={!updateContent.trim() || addUpdateMutation.isPending} className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-xs rounded-none shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all mt-2">
              {addUpdateMutation.isPending ? "Публикация..." : "ВЫПУСТИТЬ АПДЕЙТ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================================= */}
      {/* ОПАСНАЯ ЗОНА: УДАЛЕНИЕ АККАУНТА */}
      {/* ======================================================================= */}
      <div className="mt-10 border-4 border-red-900 bg-red-50 p-6 shadow-[6px_6px_0_#7f1d1d]">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-700" />
          <h2 className="text-2xl font-black uppercase tracking-tight text-red-900">⚠️ Опасная зона</h2>
        </div>
        <p className="text-sm font-bold text-red-800 mb-6 max-w-2xl">
          Эти действия необратимы. После удаления аккаунта все ваши данные будут потеряны навсегда.
        </p>
        
        <Dialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-700 hover:bg-red-800 text-white border-2 border-red-900 font-black uppercase tracking-widest text-sm h-12 rounded-none shadow-[4px_4px_0_#7f1d1d] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all">
              <Trash2 className="h-5 w-5 mr-2" /> УДАЛИТЬ АККАУНТ НАВСЕГДА
            </Button>
          </DialogTrigger>
          <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-0 border-4 border-red-900 bg-white rounded-none shadow-[12px_12px_0_#7f1d1d] flex flex-col max-h-[85vh] outline-none z-50">
            <div className="bg-red-900 p-5 flex justify-between items-start border-b-4 border-red-900 text-white">
              <DialogTitle className="text-xl font-black uppercase tracking-tighter">Подтверждение удаления</DialogTitle>
              <button 
                onClick={() => setDeleteAccountDialogOpen(false)} 
                className="p-1.5 bg-white text-red-900 border-2 border-red-900 hover:bg-red-100 transition-colors shadow-[2px_2px_0_#7f1d1d]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-red-100 border-2 border-red-300 p-4 rounded-none">
                <p className="text-sm font-bold text-red-900">
                  ⚠️ Это действие необратимо! Все ваши данные, бронирования и проекты будут удалены.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-red-900">
                  Введите слово "УДАЛИТЬ" для подтверждения
                </Label>
                <Input
                  type="text"
                  placeholder="УДАЛИТЬ"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  className="h-11 border-4 border-red-900 rounded-none bg-red-50 font-black uppercase tracking-widest focus-visible:ring-0 focus-visible:border-red-700"
                />
              </div>
              <div className="flex gap-3 pt-4 border-t-2 border-red-200">
                <Button 
                  onClick={() => setDeleteAccountDialogOpen(false)} 
                  variant="outline" 
                  className="flex-1 border-2 border-red-900 text-red-900 font-black uppercase tracking-widest text-xs rounded-none shadow-[2px_2px_0_#7f1d1d] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all"
                >
                  Отмена
                </Button>
                <Button 
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount || deleteConfirmText !== "УДАЛИТЬ"}
                  className="flex-1 bg-red-700 hover:bg-red-800 disabled:bg-red-400 text-white border-2 border-red-900 font-black uppercase tracking-widest text-xs rounded-none shadow-[2px_2px_0_#7f1d1d] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all"
                >
                  {deletingAccount ? "Удаление..." : "УДАЛИТЬ АККАУНТ"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}