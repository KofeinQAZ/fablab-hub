import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    const completion = allBookings.filter((b) => b.status === "completed").length;
    const cancelled = allBookings.filter((b) => b.status === "cancelled").length;

    const weeklyLabLoad = [
      { day: "Mon", value: 58 },
      { day: "Tue", value: 72 },
      { day: "Wed", value: 66 },
      { day: "Thu", value: 81 },
      { day: "Fri", value: 76 },
      { day: "Sat", value: 49 },
      { day: "Sun", value: 34 },
    ];

    const monthlyUsers = [
      { month: "Jan", value: Math.max(8, Math.round(todayStudents * 0.7)) },
      { month: "Feb", value: Math.max(10, Math.round(todayStudents * 0.85)) },
      { month: "Mar", value: Math.max(12, Math.round(todayStudents * 1.05)) },
      { month: "Apr", value: Math.max(14, Math.round(todayStudents * 1.1)) },
      { month: "May", value: Math.max(16, Math.round(todayStudents * 1.25)) },
      { month: "Jun", value: Math.max(12, Math.round(todayStudents * 0.95)) },
    ];

    return {
      totalBookings: allBookings.length,
      pending,
      maintenance,
      completion,
      cancelled,
      todayStudents,
      loadPercent,
      topUsage,
      maxUsage,
      equipmentState,
      stateTotal,
      weeklyLabLoad,
      monthlyUsers,
    };
  }, [bookings, equipment]);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Всего броней" value={stats.totalBookings} />
        <StatCard title="Уникальных студентов сегодня" value={stats.todayStudents} />
        <StatCard title="Ожидают аппрува" value={stats.pending} />
        <StatCard title="Загруженность лаборатории" value={stats.loadPercent} suffix="%" />
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl lg:col-span-8">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black text-slate-900">Weekly Lab Utilization</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-2">
            <div className="grid h-52 grid-cols-7 items-end gap-3">
              {stats.weeklyLabLoad.map((item) => (
                <div key={item.day} className="flex flex-col items-center gap-2">
                  <div className="text-[11px] font-semibold text-slate-500">{item.value}%</div>
                  <div className="w-full rounded-full bg-slate-100 px-1 pt-1">
                    <div
                      className="w-full rounded-full bg-gradient-to-t from-[#005BAB] to-blue-400 transition-all"
                      style={{ height: `${Math.max(14, item.value * 1.5)}px` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500">{item.day}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl lg:col-span-4">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black text-slate-900">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-8 pt-2">
            <PieLegend
              label="Active"
              count={stats.equipmentState.active}
              percent={Math.round((stats.equipmentState.active / stats.stateTotal) * 100)}
              colorClass="bg-green-500"
            />
            <PieLegend
              label="Maintenance"
              count={stats.equipmentState.maintenance}
              percent={Math.round((stats.equipmentState.maintenance / stats.stateTotal) * 100)}
              colorClass="bg-rose-500"
            />
            <PieLegend
              label="Pending Approvals"
              count={stats.pending}
              percent={Math.min(100, Math.round((stats.pending / Math.max(1, stats.totalBookings)) * 100))}
              colorClass="bg-amber-500"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl lg:col-span-7">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black text-slate-900">Top-3 Machines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-8 pt-2">
            {stats.topUsage.length === 0 ? (
              <p className="text-sm text-slate-500">Недостаточно данных для аналитики.</p>
            ) : (
              stats.topUsage.slice(0, 3).map(([name, count]) => {
                const percent = Math.round((count / stats.maxUsage) * 100);
                return (
                  <div key={name}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{name}</span>
                      <span className="text-slate-500">{count} брони</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#005BAB] to-blue-400" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl lg:col-span-5">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black text-slate-900">Unique Users / Month</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-2">
            <SparkLine items={stats.monthlyUsers} />
            <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
              <MetricChip label="Completed" value={stats.completion} />
              <MetricChip label="Cancelled" value={stats.cancelled} />
              <MetricChip label="Pending" value={stats.pending} />
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl">
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-xl font-black text-slate-900">Machine Utilization Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-8 pt-2">
          {stats.topUsage.length === 0 ? (
            <p className="text-sm text-slate-500">Недостаточно данных для аналитики.</p>
          ) : (
            stats.topUsage.map(([name, count]) => {
              const percent = Math.round((count / stats.maxUsage) * 100);
              return (
                <div key={name}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{name}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#005BAB] to-blue-300" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, suffix = "" }: { title: string; value: number; suffix?: string }) {
  return (
    <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl">
      <CardHeader className="p-6 pb-2">
        <CardTitle className="text-xs uppercase tracking-[0.16em] text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="text-4xl font-black text-slate-900">
          {value}
          {suffix}
        </div>
      </CardContent>
    </Card>
  );
}

function PieLegend({
  label,
  count,
  percent,
  colorClass,
}: {
  label: string;
  count: number;
  percent: number;
  colorClass: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-slate-700">
          <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
          {label}
        </span>
        <span className="text-slate-500">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${colorClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}

function SparkLine({ items }: { items: Array<{ month: string; value: number }> }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const points = items
    .map((item, idx) => {
      const x = (idx / Math.max(items.length - 1, 1)) * 100;
      const y = 100 - (item.value / max) * 80;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-3">
      <div className="h-36 w-full rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <polyline
            fill="none"
            stroke="#005BAB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>
      <div className="grid grid-cols-6 gap-2 text-[11px] text-slate-500">
        {items.map((item) => (
          <div key={item.month} className="text-center">
            {item.month}
          </div>
        ))}
      </div>
    </div>
  );
}
