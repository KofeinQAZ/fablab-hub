import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Ban, Check, Clock, User, CheckCircle2, AlertCircle } from "lucide-react";
import { format, isWithinInterval, isAfter, isBefore } from "date-fns";
import { ru } from "date-fns/locale";

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

function AdminBookingsPage() {
  const qc = useQueryClient();
  const now = new Date();

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
        .in("status", ["pending", "active"])
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as unknown as Booking[];
    },
  });

  // Обновленная мутация: принимает весь объект бронирования для генерации пуша
  const updateBooking = useMutation({
    mutationFn: async ({ booking, status }: { booking: Booking; status: Booking["status"] }) => {
      // 1. Обновляем статус в таблице bookings
      const { error } = await supabase.from("bookings").update({ status }).eq("id", booking.id);
      if (error) throw error;

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

  const pendingRequests = (bookings ?? []).filter((b) => b.status === "pending");
  const activeBookings = (bookings ?? []).filter((b) => b.status === "active");

  return (
    <div className="space-y-8 p-2">
      {/* Запросы на подтверждение */}
      <Card className="rounded-3xl border-none bg-white shadow-lg">
        <CardHeader className="border-b border-slate-50 pb-4">
          <CardTitle className="text-xl font-bold">Новые запросы</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {bookingsLoading ? <Skeleton className="h-24 w-full" /> : pendingRequests.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Нет новых запросов</p>
          ) : (
            <div className="grid gap-4">
              {pendingRequests.map((b) => {
                const { date, fullRange } = formatTimeRange(b.start_time, b.end_time);
                return (
                  <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900">{b.equipment?.name}</div>
                      <div className="flex flex-wrap gap-x-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {getStudentName(b)}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {date}, {fullRange}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateBooking.mutate({ booking: b, status: "active" })} className="bg-emerald-600">Одобрить</Button>
                      <Button size="sm" variant="ghost" onClick={() => updateBooking.mutate({ booking: b, status: "cancelled" })} className="text-red-500">Отклонить</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Одобренные / Активные */}
      <Card className="rounded-3xl border-none bg-white shadow-lg">
        <CardHeader className="border-b border-slate-50 pb-4">
          <CardTitle className="text-xl font-bold">Управление станками</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {bookingsLoading ? <Skeleton className="h-24 w-full" /> : activeBookings.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Нет активных или запланированных броней</p>
          ) : (
            <div className="grid gap-4">
              {activeBookings.map((b) => {
                const start = new Date(b.start_time);
                const end = new Date(b.end_time);
                const { date, fullRange } = formatTimeRange(b.start_time, b.end_time);
                
                // Определяем реальный текущий статус
                const isCurrentlyWorking = isWithinInterval(now, { start, end });
                const isFuture = isBefore(now, start);
                const isOverdue = isAfter(now, end);

                return (
                  <div key={b.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 transition-all ${
                    isCurrentlyWorking ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 bg-white"
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{b.equipment?.name}</span>
                        {isCurrentlyWorking ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-none animate-pulse">В РАБОТЕ</Badge>
                        ) : isFuture ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">ЗАБРОНИРОВАНО</Badge>
                        ) : (
                          <Badge variant="destructive" className="animate-bounce">ВРЕМЯ ИСТЕКЛО</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-6 text-sm">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="font-semibold">{getStudentName(b)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>{date}: <span className="font-bold">{fullRange}</span></span>
                        </div>
                      </div>
                      {isFuture && (
                        <p className="text-[10px] text-blue-500 font-medium">Начнется через некоторое время</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => updateBooking.mutate({ booking: b, status: "completed" })}
                        className="bg-blue-600"
                      >
                        Завершить
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => updateBooking.mutate({ booking: b, status: "cancelled" })}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}