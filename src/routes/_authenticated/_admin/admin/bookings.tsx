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
import { useMemo, useState } from "react";

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

// Хелпер для получения строковой даты (YYYY-MM-DD) в локальном часовом поясе
function getLocalDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function AdminBookingsPage() {
  const qc = useQueryClient();
  const now = new Date();
  
  // Стейт теперь хранит строку даты или 'all'
  const [dateFilter, setDateFilter] = useState<string>(() => getLocalDateString(now));

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
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

  const updateBooking = useMutation({
    mutationFn: async ({ booking, status }: { booking: Booking; status: Booking["status"] }) => {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", booking.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("У вас нет прав для этого действия");
      }

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
      qc.invalidateQueries({ queryKey: ["notifications"] });
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

  // Генерируем 7 вкладок для фильтра (на неделю вперед)
  const dayTabs = useMemo(() => {
    const tabs = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      
      let label = "";
      if (i === 0) label = "СЕГОДНЯ";
      else if (i === 1) label = "ЗАВТРА";
      else label = format(d, "d MMM (EEEE)", { locale: ru }).toUpperCase();
      
      tabs.push({
        id: getLocalDateString(d),
        label,
      });
    }
    return tabs;
  }, []);

  const pendingRequests = (bookings ?? []).filter((b) => b.status === "pending");
  
  const filteredAndSortedActiveBookings = useMemo(() => {
    const active = (bookings ?? []).filter((b) => b.status === "active");

    // 1. Фильтруем по выбранной вкладке даты
    const filtered = active.filter(b => {
      if (dateFilter === 'all') return true;
      const start = new Date(b.start_time);
      return getLocalDateString(start) === dateFilter;
    });

    // 2. Сортируем: сначала в работе -> затем просроченные -> затем будущие
    return filtered.sort((a, b) => {
      const startA = new Date(a.start_time);
      const endA = new Date(a.end_time);
      const startB = new Date(b.start_time);
      const endB = new Date(b.end_time);

      const isWorkingA = isWithinInterval(now, { start: startA, end: endA });
      const isWorkingB = isWithinInterval(now, { start: startB, end: endB });

      if (isWorkingA && !isWorkingB) return -1;
      if (!isWorkingA && isWorkingB) return 1;

      const isExpiredA = isAfter(now, endA);
      const isExpiredB = isAfter(now, endB);

      if (isExpiredA && !isExpiredB) return -1;
      if (!isExpiredA && isExpiredB) return 1;

      return startA.getTime() - startB.getTime();
    });
  }, [bookings, dateFilter, now]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* HEADER SECTION */}
      <div className="border-b-4 border-slate-900 pb-6">
        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Управление бронями</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Оперативный контроль станков и заявок</p>
      </div>

      {/* DETAILED STATISTICS BLOCK */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900">Заявок на одобрение</h4>
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
        <div className="bg-blue-600 text-white p-4 md:p-6 border-b-4 border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-black uppercase tracking-tight">Управление станками</h2>
        </div>
        
        {/* ФИЛЬТРЫ ДАТ (ВКЛАДКИ НА НЕДЕЛЮ) */}
        <div className="flex overflow-x-auto gap-2 p-4 md:px-6 bg-slate-50 border-b-4 border-slate-900 no-scrollbar">
          {dayTabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setDateFilter(tab.id)} 
              className={`shrink-0 px-4 py-2 font-black uppercase tracking-widest text-[10px] md:text-xs border-2 transition-all ${dateFilter === tab.id ? 'bg-blue-600 text-white border-slate-900 shadow-[2px_2px_0_#0f172a] translate-y-[1px] translate-x-[1px]' : 'bg-white text-slate-900 border-slate-300 hover:border-slate-900'}`}
            >
              {tab.label}
            </button>
          ))}
          <button 
            onClick={() => setDateFilter('all')} 
            className={`shrink-0 px-4 py-2 font-black uppercase tracking-widest text-[10px] md:text-xs border-2 transition-all ${dateFilter === 'all' ? 'bg-blue-600 text-white border-slate-900 shadow-[2px_2px_0_#0f172a] translate-y-[1px] translate-x-[1px]' : 'bg-white text-slate-900 border-slate-300 hover:border-slate-900'}`}
          >
            ВСЕ ДНИ
          </button>
        </div>

        <div className="p-4 md:p-6">
          {bookingsLoading ? <Skeleton className="h-24 w-full bg-slate-200" /> : filteredAndSortedActiveBookings.length === 0 ? (
            <p className="py-6 text-center font-bold uppercase tracking-widest text-xs text-slate-400">Нет активных или запланированных броней на выбранный период</p>
          ) : (
            <div className="grid gap-4">
              {filteredAndSortedActiveBookings.map((b) => {
                const start = new Date(b.start_time);
                const end = new Date(b.end_time);
                const { date, fullRange } = formatTimeRange(b.start_time, b.end_time);
                
                const isCurrentlyWorking = isWithinInterval(now, { start, end });
                const isExpired = isAfter(now, end);

                return (
                  <div key={b.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-4 p-4 transition-all ${
                    isExpired ? "border-red-600 bg-red-50" : isCurrentlyWorking ? "border-emerald-500 bg-emerald-50" : "border-slate-900 bg-white"
                  }`}>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`font-black text-lg uppercase tracking-tight ${isExpired ? 'text-red-900' : 'text-slate-900'}`}>{b.equipment?.name}</span>
                        {isCurrentlyWorking ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-[10px] animate-pulse shadow-[2px_2px_0_#0f172a]">В РАБОТЕ</Badge>
                        ) : isExpired ? (
                          <Badge variant="destructive" className="bg-red-600 text-white border-2 border-red-900 font-black uppercase tracking-widest text-[10px] animate-bounce shadow-[2px_2px_0_#7f1d1d]">ВРЕМЯ ИСТЕКЛО</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-white text-blue-600 border-2 border-slate-900 font-black uppercase tracking-widest text-[10px] shadow-[2px_2px_0_#0f172a]">ЗАБРОНИРОВАНО</Badge>
                        )}
                      </div>
                      <div className={`flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-widest ${isExpired ? 'text-red-700' : 'text-slate-600'}`}>
                        <span className="flex items-center gap-2"><User className="h-4 w-4 opacity-70" /> {getStudentName(b)}</span>
                        <span className="flex items-center gap-2"><Clock className="h-4 w-4 opacity-70" /> {date}: {fullRange}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2 md:mt-0">
                      <Button 
                        onClick={() => updateBooking.mutate({ booking: b, status: "completed" })}
                        className={`border-2 font-black uppercase tracking-widest text-xs transition-all ${
                          isExpired 
                            ? "bg-red-600 hover:bg-red-700 text-white border-red-900 shadow-[4px_4px_0_#7f1d1d] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none animate-pulse" 
                            : "bg-blue-600 hover:bg-blue-700 text-white border-slate-900 shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none"
                        }`}
                      >
                        Завершить
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => updateBooking.mutate({ booking: b, status: "cancelled" })}
                        className={`border-2 font-bold uppercase tracking-widest text-xs transition-all px-3 ${
                          isExpired
                            ? "border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
                            : "border-slate-900 text-slate-900 hover:bg-red-50 hover:text-red-600 shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none"
                        }`}
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