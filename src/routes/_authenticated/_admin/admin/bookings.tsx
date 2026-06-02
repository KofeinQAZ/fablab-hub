import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Ban, Clock, User, Activity, Calendar, CheckSquare, AlertCircle } from "lucide-react";
import { format, isWithinInterval, isAfter, isBefore } from "date-fns";
import { ru } from "date-fns/locale";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/_admin/admin/bookings")({
  component: AdminBookingsPage,
});

type Booking = {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: "pending" | "active" | "cancelled" | "completed";
  equipment: { id: string; name: string; category: string } | null;
  profiles: { name: string } | { name: string }[] | null;
};

function formatTimeRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const date = format(s, "d MMMM", { locale: ru });
  const timeStart = format(s, "HH:mm");
  const timeEnd = format(e, "HH:mm");
  return { date, timeStart, timeEnd, fullRange: `${timeStart} — ${timeEnd}` };
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function AdminBookingsPage() {
  const qc = useQueryClient();
  const now = new Date();

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      // Убрали фильтр .in("status"), чтобы получить данные для статистики (завершенные и отмененные)
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          user_id,
          start_time,
          end_time,
          status,
          equipment ( id, name, category ),
          profiles ( name )
        `)
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as unknown as Booking[];
    },
  });

  // ВЫЧИСЛЕНИЕ ДЕТАЛЬНОЙ СТАТИСТИКИ ПО БРОНЯМ
  const stats = useMemo(() => {
    const all = bookings ?? [];
    let pending = 0;
    let activeNow = 0;
    let todayTotal = 0;
    let completedToday = 0;

    all.forEach(b => {
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      
      if (b.status === "pending") pending++;
      
      if (isSameDay(start, now)) {
        todayTotal++;
        if (b.status === "completed") completedToday++;
      }
      
      if (b.status === "active" && isWithinInterval(now, { start, end })) {
        activeNow++;
      }
    });

    return { pending, activeNow, todayTotal, completedToday };
  }, [bookings, now]);

  // ОБНОВЛЕННАЯ МУТАЦИЯ (С СОХРАНЕНИЕМ RLS И PUSH-УВЕДОМЛЕНИЙ)
  const updateBooking = useMutation({
    mutationFn: async ({ booking, status }: { booking: Booking; status: Booking["status"] }) => {
      // 1. Обновляем статус в таблице bookings
      const { data, error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", booking.id)
        .select();

      if (error) throw error;

      // SECURITY: Check for silent RLS denial (empty result with 200 OK)
      if (!data || data.length === 0) {
        throw new Error("У вас нет прав для этого действия");
      }

      // 2. Формируем текст уведомления
      let title = "";
      let message = "";
      const eqName = booking.equipment?.name || "станок";

      if (status === "active") {
        title = "✅ Бронь подтверждена";
        message = `Ваша бронь на оборудование "${eqName}" успешно одобрена ментором. Ждем вас в выбранное время!`;
      } else if (status === "cancelled") {
        title = "❌ Бронь отменена";
        message = `К сожалению, ваша бронь на оборудование "${eqName}" была отклонена или отменена администратором.`;
      } else if (status === "completed") {
        title = "👍 Бронирование завершено";
        message = `Ваше время работы за станком "${eqName}" успешно завершено. Спасибо, что оставили рабочее место в чистоте!`;
      }

      // 3. Записываем уведомление в базу
      if (title && message) {
        await supabase.from("notifications").insert({
          user_id: booking.user_id,
          title,
          message,
          type: "booking"
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["notifications"] }); // Синхронно дергаем колокольчик
      toast.success("Статус обновлен, уведомление отправлено!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const getStudentName = (booking: Booking) => {
    if (Array.isArray(booking.profiles)) {
      return booking.profiles[0]?.name ?? "Неизвестный";
    }
    return booking.profiles?.name ?? "Неизвестный";
  };

  // Фильтруем данные для отображения в списках
  const pendingRequests = (bookings ?? []).filter((b) => b.status === "pending");
  const activeBookings = (bookings ?? []).filter((b) => b.status === "active");

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* HEADER SECTION */}
      <div className="border-b-4 border-slate-900 pb-6">
        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Управление бронями</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Оперативный контроль станков и заявок</p>
      </div>

      {/* DETAILED STATISTICS BLOCK (Брутальный стиль) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900">Заявок на аппрув</h4>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-4xl font-black text-slate-900">{stats.pending}</div>
        </div>

        <div className="bg-blue-600 border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between text-white">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-blue-100">Станков в работе</h4>
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="text-4xl font-black text-white">{stats.activeNow}</div>
        </div>

        <div className="bg-white border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900">Броней на сегодня</h4>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-4xl font-black text-slate-900">{stats.todayTotal}</div>
        </div>

        <div className="bg-white border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900">Завершено сегодня</h4>
            <CheckSquare className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-4xl font-black text-slate-900">{stats.completedToday}</div>
        </div>
      </div>

      {/* ЗАПРОСЫ НА ПОДТВЕРЖДЕНИЕ */}
      <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a]">
        <div className="bg-slate-900 text-white p-4 md:p-6 border-b-4 border-slate-900">
          <h2 className="text-xl font-black uppercase tracking-tight">Новые запросы</h2>
        </div>
        <div className="p-4 md:p-6">
          {bookingsLoading ? <Skeleton className="h-24 w-full bg-slate-200" /> : pendingRequests.length === 0 ? (
            <p className="py-6 text-center font-bold uppercase tracking-widest text-xs text-slate-400">Нет новых запросов</p>
          ) : (
            <div className="grid gap-4">
              {pendingRequests.map((b) => {
                const { date, fullRange } = formatTimeRange(b.start_time, b.end_time);
                return (
                  <div key={b.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-2 border-slate-900 p-4 bg-slate-50 hover:bg-blue-50 transition-colors">
                    <div className="space-y-2">
                      <div className="font-black text-lg text-slate-900 uppercase tracking-tight">{b.equipment?.name}</div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-widest text-slate-600">
                        <span className="flex items-center gap-2"><User className="h-4 w-4 text-blue-600" /> {getStudentName(b)}</span>
                        <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-600" /> {date}, {fullRange}</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={() => updateBooking.mutate({ booking: b, status: "active" })} className="bg-emerald-500 hover:bg-emerald-600 text-white border-2 border-slate-900 font-bold uppercase tracking-widest text-xs shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all">
                        Одобрить
                      </Button>
                      <Button variant="outline" onClick={() => updateBooking.mutate({ booking: b, status: "cancelled" })} className="border-2 border-slate-900 text-slate-900 hover:bg-red-50 hover:text-red-600 font-bold uppercase tracking-widest text-xs shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all">
                        Отклонить
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ОДОБРЕННЫЕ / АКТИВНЫЕ */}
      <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a]">
        <div className="bg-blue-600 text-white p-4 md:p-6 border-b-4 border-slate-900">
          <h2 className="text-xl font-black uppercase tracking-tight">Управление станками</h2>
        </div>
        <div className="p-4 md:p-6">
          {bookingsLoading ? <Skeleton className="h-24 w-full bg-slate-200" /> : activeBookings.length === 0 ? (
            <p className="py-6 text-center font-bold uppercase tracking-widest text-xs text-slate-400">Нет активных или запланированных броней</p>
          ) : (
            <div className="grid gap-4">
              {activeBookings.map((b) => {
                const start = new Date(b.start_time);
                const end = new Date(b.end_time);
                const { date, fullRange } = formatTimeRange(b.start_time, b.end_time);
                
                const isCurrentlyWorking = isWithinInterval(now, { start, end });
                const isFuture = isBefore(now, start);

                return (
                  <div key={b.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-2 border-slate-900 p-4 transition-all ${
                    isCurrentlyWorking ? "bg-emerald-100/50" : "bg-white"
                  }`}>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-black text-lg text-slate-900 uppercase tracking-tight">{b.equipment?.name}</span>
                        {isCurrentlyWorking ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-[10px] animate-pulse shadow-[2px_2px_0_#0f172a]">В РАБОТЕ</Badge>
                        ) : isFuture ? (
                          <Badge variant="outline" className="bg-white text-blue-600 border-2 border-slate-900 font-black uppercase tracking-widest text-[10px] shadow-[2px_2px_0_#0f172a]">ЗАБРОНИРОВАНО</Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-red-500 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-[10px] animate-bounce shadow-[2px_2px_0_#0f172a]">ВРЕМЯ ИСТЕКЛО</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-widest text-slate-600">
                        <span className="flex items-center gap-2"><User className="h-4 w-4 text-blue-600" /> {getStudentName(b)}</span>
                        <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-600" /> {date}: {fullRange}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2 md:mt-0">
                      <Button 
                        onClick={() => updateBooking.mutate({ booking: b, status: "completed" })}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-slate-900 font-bold uppercase tracking-widest text-xs shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all"
                      >
                        Завершить
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => updateBooking.mutate({ booking: b, status: "cancelled" })}
                        className="border-2 border-slate-900 text-slate-900 hover:bg-red-50 hover:text-red-600 font-bold uppercase tracking-widest text-xs shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all px-3"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}