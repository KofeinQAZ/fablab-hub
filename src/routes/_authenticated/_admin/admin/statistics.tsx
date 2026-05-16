import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/_admin/admin/statistics")({
  component: AdminStatisticsPage,
});

type Equipment = {
  id: string;
  name: string;
  status: "active" | "maintenance";
};

type Booking = {
  id: string;
  user_id: string;
  start_time: string;
  status: "pending" | "active" | "cancelled" | "completed";
  equipment: { id: string; name: string } | null;
};

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear()
    && dateA.getMonth() === dateB.getMonth()
    && dateA.getDate() === dateB.getDate()
  );
}

function AdminStatisticsPage() {
  const { data: equipment } = useQuery({
    queryKey: ["admin-equipment"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("id,name,status");
      if (error) throw error;
      return (data as Equipment[]) ?? [];
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["admin-bookings-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id,user_id,start_time,status,equipment:equipment_id(id,name)");
      if (error) throw error;
      return (data as Booking[]) ?? [];
    },
  });

  const stats = useMemo(() => {
    const allBookings = bookings ?? [];
    const allEquipment = equipment ?? [];
    const pending = allBookings.filter((b) => b.status === "pending").length;
    const active = allBookings.filter((b) => b.status === "active").length;
    const maintenance = allEquipment.filter((e) => e.status === "maintenance").length;

    const today = new Date();
    const todayStudents = new Set(
      allBookings
        .filter((booking) => isSameDay(new Date(booking.start_time), today))
        .map((booking) => booking.user_id),
    ).size;

    const activeEquipmentCount = allEquipment.filter((item) => item.status === "active").length;
    const loadPercent = activeEquipmentCount === 0 ? 0 : Math.min(100, Math.round((active / activeEquipmentCount) * 100));

    const byEquipment = new Map<string, number>();
    for (const booking of allBookings) {
      const name = booking.equipment?.name ?? "Unknown";
      byEquipment.set(name, (byEquipment.get(name) ?? 0) + 1);
    }
    const topUsage = Array.from(byEquipment.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const maxUsage = topUsage[0]?.[1] ?? 1;

    const equipmentState = {
      active: allEquipment.filter((e) => e.status === "active").length,
      maintenance,
    };
    const stateTotal = Math.max(1, equipmentState.active + equipmentState.maintenance);

    return {
      totalBookings: allBookings.length,
      pending,
      maintenance,
      todayStudents,
      loadPercent,
      topUsage,
      maxUsage,
      equipmentState,
      stateTotal,
    };
  }, [bookings, equipment]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Всего броней" value={stats.totalBookings} />
        <StatCard title="Уникальных студентов сегодня" value={stats.todayStudents} />
        <StatCard title="Ожидают аппрува" value={stats.pending} />
        <StatCard title="Загруженность лаборатории (%)" value={stats.loadPercent} suffix="%" />
      </section>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Самые популярные станки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.topUsage.length === 0 ? (
            <p className="text-sm text-slate-500">Недостаточно данных для аналитики.</p>
          ) : (
            stats.topUsage.map(([name, count]) => {
              const percent = Math.round((count / stats.maxUsage) * 100);
              return (
                <div key={name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{name}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <Progress value={percent} className="h-3 rounded-full bg-slate-100" />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Состояние оборудования</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StateRow
            label="Active"
            count={stats.equipmentState.active}
            percent={Math.round((stats.equipmentState.active / stats.stateTotal) * 100)}
            barClass="bg-green-500"
          />
          <StateRow
            label="Maintenance"
            count={stats.equipmentState.maintenance}
            percent={Math.round((stats.equipmentState.maintenance / stats.stateTotal) * 100)}
            barClass="bg-red-500"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, suffix = "" }: { title: string; value: number; suffix?: string }) {
  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900">
          {value}
          {suffix}
        </div>
      </CardContent>
    </Card>
  );
}

function StateRow({
  label,
  count,
  percent,
  barClass,
}: {
  label: string;
  count: number;
  percent: number;
  barClass: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {count} ({percent}%)
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${barClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
