import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Ban, Check, Clock3, X } from "lucide-react";

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
  profiles: { name: string } | null; // Поменяй тут с profile на profiles
};

type Profile = { id: string; name: string };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminBookingsPage() {
  const qc = useQueryClient();

  const { data: bookings, isLoading: bookingsLoading, refetch } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      // 1. Проверяем текущую сессию (на всякий случай)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 2. Делаем запрос
      const { data, error } = await (supabase as any)
        .from("bookings")
        .select(`
          id,
          user_id,
          start_time,
          end_time,
          status,
          equipment (
            id,
            name,
            category
          ),
          profiles (
            name
          )
        `)
        .in("status", ["pending", "active"])
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Ошибка загрузки броней:", error);
        throw error;
      }
      
      console.log("Загруженные брони:", data); // Открой консоль (F12), чтобы увидеть данные
      return data as any[];
    },
  });


  const updateBooking = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Booking["status"] }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pendingRequests = (bookings ?? []).filter((booking) => booking.status === "pending");
  const activeBookings = (bookings ?? []).filter((booking) => booking.status === "active");
  const getStudentName = (booking: any) => {
    // Supabase возвращает profiles либо как объект, либо как массив из одного элемента
    const p = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
    return p?.name ?? "Студент";
  };
  return (
    <div className="space-y-8">
      {/* Карточка Pending (Ожидают выдачи) */}
      <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl">
        <CardHeader className="p-6 pb-5">
          <CardTitle className="text-2xl font-black text-slate-900">Ожидают выдачи (Pending)</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {bookingsLoading ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : pendingRequests.length === 0 ? (
            <p className="text-sm text-slate-500">Нет ожидающих запросов.</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((booking) => (
                <div key={booking.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      {booking.equipment?.name ?? "Оборудование"}
                      <Badge className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700">pending</Badge>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {getStudentName(booking)} — {formatDateTime(booking.start_time)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="bg-[#005BAB] hover:bg-blue-800"
                      onClick={() => updateBooking.mutate({ id: booking.id, status: "active" })}
                      disabled={updateBooking.isPending}
                    >
                      Выдать (Approve)
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-slate-200"
                      onClick={() => updateBooking.mutate({ id: booking.id, status: "cancelled" })}
                      disabled={updateBooking.isPending}
                    >
                      Отклонить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Карточка Active (Активные сейчас) */}
      <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl">
        <CardHeader className="p-6 pb-5">
          <CardTitle className="text-2xl font-black text-slate-900">Активные сейчас</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {bookingsLoading ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : activeBookings.length === 0 ? (
            <p className="text-sm text-slate-500">Сейчас нет активных броней.</p>
          ) : (
            <div className="space-y-3">
              {activeBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      {booking.equipment?.name}
                      <Badge className="rounded-xl border border-green-200 bg-green-50 text-green-700">active</Badge>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {getStudentName(booking)} — {formatDateTime(booking.start_time)}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-slate-500 hover:text-red-600"
                    onClick={() => updateBooking.mutate({ id: booking.id, status: "cancelled" })}
                    disabled={updateBooking.isPending}
                  >
                    <Ban className="mr-1 h-4 w-4" /> Отменить
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
