import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [loadingResidency, setLoadingResidency] = useState(false);
  const [residencyDialogOpen, setResidencyDialogOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [submittingForm, setSubmittingForm] = useState(false);
  const [briefingDialogOpen, setBriefingDialogOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");

  const { data: authData, isLoading } = useQuery<AuthData | null>({
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

// Загружаем общее расписание всех менторов
  const { data: availableSchedules } = useQuery({
    queryKey: ["mentor-schedules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("mentor_schedule").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Умная генерация слотов на 14 дней вперед на основе расписания из базы
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
          dateStr,
          dateIso,
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

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl p-4 md:p-6">
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6 text-slate-500">Загрузка профиля...</CardContent>
        </Card>
      </main>
    );
  }

  if (!authData) return <Navigate to="/login" />;

  const handleRequestSafetyBriefing = async () => {
    if (!selectedTime) {
      toast.error("Пожалуйста, выберите дату и время!");
      return;
    }
    setSubmittingForm(true);
    try {
      await submitAccessRequest({ 
        data: { 
          type: "safety_briefing", 
          scheduled_time: new Date(selectedTime).toISOString() 
        } 
      });
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
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmitResidencyForm = async () => {
    if (!description.trim()) {
      toast.error("Пожалуйста, заполните описание проекта");
      return;
    }

    if (!cvUrl.trim()) {
      toast.error("Пожалуйста, введите ссылку на CV");
      return;
    }

    if (!isValidUrl(cvUrl)) {
      toast.error("Пожалуйста, введите корректный URL");
      return;
    }

    setSubmittingForm(true);
    try {
      const result = await submitAccessRequest({
        data: {
          type: "residency",
          description: description.trim(),
          cv_url: cvUrl.trim(),
        },
      });
      toast.success(result.message);
      setResidencyDialogOpen(false);
      setDescription("");
      setCvUrl("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ошибка при отправке заявки";
      toast.error(errorMessage);
    } finally {
      setSubmittingForm(false);
    }
  };

  const roleLabel = authData.profile.role === "student" ? "Студент" : "Резидент";
  const briefingStatus = authData.profile.safety_briefing_passed ? "Пройден" : "Не пройден";
  const briefingVariant = authData.profile.safety_briefing_passed ? "default" : "destructive";

  return (
    <main className="mx-auto w-full max-w-3xl p-4 md:p-6">
      {/* User Info Card */}
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm mb-6">
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
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Уровень доступа</CardTitle>
          <CardDescription>Управление правами доступа</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Role */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600">Текущая роль</p>
              <p className="text-lg font-semibold text-slate-900">{roleLabel}</p>
            </div>
            <Badge className="text-base px-3 py-1" variant="outline">
              {roleLabel}
            </Badge>
          </div>

          {/* Safety Briefing Status */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600">Инструктаж (ТБ)</p>
              <p className="text-sm text-slate-700">
                {authData.profile.safety_briefing_passed
                  ? "Вы прошли инструктаж по технике безопасности"
                  : "Требуется прохождение инструктажа"}
              </p>
            </div>
            <Badge className="text-base px-3 py-1" variant={briefingVariant}>
              {briefingStatus}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {!authData.profile.safety_briefing_passed && (
  <Dialog open={briefingDialogOpen} onOpenChange={setBriefingDialogOpen}>
    <DialogTrigger asChild>
      <Button className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">
        Запросить сдачу ТБ
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Запись на инструктаж (ТБ)</DialogTitle>
        <p className="text-sm text-slate-500 mt-2">
          Выберите удобное время, когда ментор сможет провести для вас инструктаж.
        </p>
      </DialogHeader>
      <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto pr-2">
        {generatedSlots.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">
            Нет доступных слотов на ближайшие 14 дней. Попробуйте зайти позже.
          </p>
        ) : (
          generatedSlots.map((day, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-700 capitalize border-b pb-1">
                {day.dateStr}
              </h4>
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
          className="w-full h-11 mt-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold" 
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
              <Button
                onClick={handleRequestResidency}
                className="w-full h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Подать заявку на Резидентство
              </Button>
            )}

            {authData.profile.role === "resident" && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-900">✓ Вы резидент</p>
                <p className="text-xs text-emerald-700 mt-1">
                  У вас есть полный доступ ко всем ресурсам лаборатории
                </p>
              </div>
            )}
          </div>
        </CardContent> 
      </Card>

      {/* Residency Dialog */}
      <Dialog open={residencyDialogOpen} onOpenChange={setResidencyDialogOpen}>
        <DialogContent className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Заявка на Резидентство
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Заполните форму, чтобы подать заявку на статус резидента
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-slate-900">
                Описание вашего проекта / О себе <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Расскажите о своём проекте, интересах и целях в фаблабе..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] rounded-lg border border-slate-300 bg-white p-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* CV URL */}
            <div className="space-y-2">
              <Label htmlFor="cv_url" className="text-sm font-medium text-slate-900">
                Ссылка на ваше CV <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cv_url"
                type="url"
                placeholder="https://drive.google.com/... или ссылка на резюме"
                value={cvUrl}
                onChange={(e) => setCvUrl(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => setResidencyDialogOpen(false)}
              variant="outline"
              className="flex-1 rounded-lg border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmitResidencyForm}
              disabled={submittingForm}
              className="flex-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {submittingForm ? "Отправка..." : "Отправить заявку"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main> 
  );
}
