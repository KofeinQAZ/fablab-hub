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
  equipment: { id: string; name: string; category: "stationary" | "portable"; status: "active" | "maintenance" } | null;
  profile?: { name: string | null } | null;
};

type Profile = { id: string; name: string };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    timeZone: "UTC",
    hour12: false,
  });
}

function AdminBookingsPage() {
  const qc = useQueryClient();

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      // Preferred query: bookings + joined student profile + joined equipment
      const joinedQuery = await supabase
        .from("bookings")
        .select(
          "id,user_id,start_time,end_time,status,equipment:equipment_id(id,name,category,status),profile:profiles!bookings_user_id_fkey(name)",
        )
        .in("status", ["pending", "active"])
        .order("start_time", { ascending: true });

      if (!joinedQuery.error) {
        return (joinedQuery.data as Booking[]) ?? [];
      }

      // Fallback for projects where FK bookings.user_id -> profiles.id is not present
      const basicQuery = await supabase
        .from("bookings")
        .select("id,user_id,start_time,end_time,status,equipment:equipment_id(id,name,category,status)")
        .in("status", ["pending", "active"])
        .order("start_time", { ascending: true });

      if (basicQuery.error) throw basicQuery.error;
      return (basicQuery.data as Booking[]) ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,name");
      if (error) throw error;
      return (data as Profile[]) ?? [];
    },
  });

  const profilesById = new Map((profiles ?? []).map((item) => [item.id, item.name]));

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
  const getStudentName = (booking: Booking) =>
    booking.profile?.name
    ?? profilesById.get(booking.user_id)
    ?? "Student";

  return (
    <div className="space-y-8">
      <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl">
        <CardHeader className="p-8 pb-5">
          <CardTitle className="text-2xl font-black text-slate-900">Ожидают выдачи (Pending)</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          {bookingsLoading ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : pendingRequests.length === 0 ? (
            <p className="text-sm text-slate-500">Нет ожидающих запросов.</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((booking) => (
                <div key={booking.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      {booking.equipment?.name ?? "Equipment"}
                      <Badge className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                        pending
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {getStudentName(booking)} • {formatDateTime(booking.start_time)} → {formatDateTime(booking.end_time)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-[#005BAB] hover:bg-blue-800"
                      onClick={() => updateBooking.mutate({ id: booking.id, status: "active" })}
                      disabled={updateBooking.isPending}
                    >
                      <Check className="mr-1 h-4 w-4" /> Выдать (Approve)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-200"
                      onClick={() => updateBooking.mutate({ id: booking.id, status: "cancelled" })}
                      disabled={updateBooking.isPending}
                    >
                      <X className="mr-1 h-4 w-4" /> Отклонить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl">
        <CardHeader className="p-8 pb-5">
          <CardTitle className="text-2xl font-black text-slate-900">Активные сейчас</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          {bookingsLoading ? (
            <Skeleton className="h-40 rounded-2xl" />
          ) : activeBookings.length === 0 ? (
            <p className="text-sm text-slate-500">Сейчас нет активных броней.</p>
          ) : (
            <div className="space-y-3">
              {activeBookings.map((booking) => (
                <div key={booking.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      {booking.equipment?.name ?? "Equipment"}
                      <Badge className="rounded-xl border border-green-200 bg-green-50 text-green-700">
                        active
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {getStudentName(booking)}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDateTime(booking.start_time)} → {formatDateTime(booking.end_time)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
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
