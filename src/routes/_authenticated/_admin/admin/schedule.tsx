import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CalendarDays, Trash2, Clock } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin/admin/schedule")({
  component: SchedulePage,
});

const DAYS_OF_WEEK = [
  { value: 1, label: "Понедельник" },
  { value: 2, label: "Вторник" },
  { value: 3, label: "Среда" },
  { value: 4, label: "Четверг" },
  { value: 5, label: "Пятница" },
  { value: 6, label: "Суббота" },
  { value: 7, label: "Воскресенье" },
];

function SchedulePage() {
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(1);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");

  const { data: user } = useQuery({
    queryKey: ["current-user-data"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: scheduleSlots, isLoading } = useQuery({
    queryKey: ["mentor-schedule"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mentor_schedule")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const addScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Пользователь не авторизован");
      if (!startTime || !endTime) throw new Error("Укажите время");

      const { error } = await (supabase as any)
        .from("mentor_schedule")
        .insert({
          mentor_id: user.id,
          day_of_week: selectedDay,
          start_time: `${startTime}:00`, // Добавляем секунды для типа TIME в БД
          end_time: `${endTime}:00`,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Расписание добавлено!");
      queryClient.invalidateQueries({ queryKey: ["mentor-schedule"] });
    },
    onError: (error: any) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("mentor_schedule")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Правило удалено");
      queryClient.invalidateQueries({ queryKey: ["mentor-schedule"] });
    },
  });

  // Группируем слоты по дням недели для красивого отображения
  const groupedSchedule = DAYS_OF_WEEK.map((day) => ({
    ...day,
    slots: scheduleSlots?.filter((s: any) => s.day_of_week === day.value) || [],
  }));

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Мое расписание</h1>
        <p className="text-sm text-slate-500 mt-1">Укажите ваши регулярные часы работы в лаборатории</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 rounded-2xl border-slate-200 bg-white shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Добавить часы</CardTitle>
            <CardDescription>Выберите день недели и время</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500">День недели</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500">С (часы)</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500">До (часы)</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg mt-2"
              onClick={() => addScheduleMutation.mutate()}
              disabled={addScheduleMutation.isPending}
            >
              Добавить в график
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">График на неделю</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-slate-400 text-center py-6">Загрузка...</p>
            ) : (
              <div className="space-y-6">
                {groupedSchedule.map((day) => (
                  day.slots.length > 0 && (
                    <div key={day.value} className="space-y-2">
                      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 border-b pb-2">
                        <CalendarDays className="h-4 w-4 text-blue-600" />
                        {day.label}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {day.slots.map((slot: any) => (
                          <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <Clock className="h-4 w-4 text-slate-400" />
                              {slot.start_time.slice(0, 5)} — {slot.end_time.slice(0, 5)}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-500 hover:bg-rose-100 rounded-md"
                              onClick={() => deleteScheduleMutation.mutate(slot.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
                {scheduleSlots?.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6">График пока пуст.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}