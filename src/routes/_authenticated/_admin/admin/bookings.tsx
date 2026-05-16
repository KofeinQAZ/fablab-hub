import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Ban, Check, X } from "lucide-react";

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
      const { data, error } = await supabase
        .from("bookings")
        .select("id,user_id,start_time,end_time,status,equipment:equipment_id(id,name,category,status)")
        .in("status", ["pending", "active"])
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data as Booking[]) ?? [];
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

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Pending-запросы на инвентарь</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-slate-500">Нет ожидающих запросов.</p>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((booking) => (
                <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{booking.equipment?.name ?? "Equipment"}</div>
                    <div className="text-xs text-slate-500">
                      {profilesById.get(booking.user_id) ?? "Student"} • {formatDateTime(booking.start_time)} → {formatDateTime(booking.end_time)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateBooking.mutate({ id: booking.id, status: "active" })}>
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateBooking.mutate({ id: booking.id, status: "cancelled" })}>
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Активные брони</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {bookingsLoading ? (
            <Skeleton className="h-40" />
          ) : activeBookings.length === 0 ? (
            <p className="text-sm text-slate-500">Сейчас нет активных броней.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Оборудование</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Начало</TableHead>
                  <TableHead>Конец</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.equipment?.name ?? "—"}</TableCell>
                    <TableCell>{profilesById.get(booking.user_id) ?? "—"}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(booking.start_time)}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(booking.end_time)}</TableCell>
                    <TableCell><Badge>{booking.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => updateBooking.mutate({ id: booking.id, status: "cancelled" })}>
                        <Ban className="mr-1 h-4 w-4" /> Отменить
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
