import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Users, ShieldCheck, Rocket, Calendar, Activity, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/admin/statistics")({
  component: AdminStatisticsPage,
});

type Equipment = { id: string; name: string; status: "active" | "maintenance" };
type Profile = { id: string; name: string; role: string; safety_briefing_passed: boolean };
type Project = { id: string; status: string };

// ИСПРАВЛЕНО: Убрали email из типа
type Booking = {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: "pending" | "active" | "cancelled" | "completed";
  equipment: { id: string; name: string } | null;
  profiles: { name: string } | null; 
};

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function AdminStatisticsPage() {
  const { data: equipment } = useQuery({
    queryKey: ["admin-equipment-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("id,name,status");
      if (error) throw error;
      return (data as Equipment[]) ?? [];
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["admin-bookings-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, user_id, start_time, end_time, status, 
          equipment(id,name),
          profiles(name)
        `);
      if (error) throw error;
      return (data as Booking[]) ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,name,role,safety_briefing_passed");
      if (error) return [];
      return (data as Profile[]) ?? [];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["admin-projects-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id,status");
      if (error) return [];
      return (data as Project[]) ?? [];
    },
  });

  const stats = useMemo(() => {
    const allBookings = bookings ?? [];
    const allEquipment = equipment ?? [];
    const allProfiles = profiles ?? [];
    const allProjects = projects ?? [];

    const now = new Date();
    const msInDay = 24 * 60 * 60 * 1000;

    const totalStudents = allProfiles.filter((p) => p.role === "student").length || 1; 
    const briefedStudents = allProfiles.filter((p) => p.role === "student" && p.safety_briefing_passed).length;
    const briefingRate = Math.round((briefedStudents / totalStudents) * 100);

    const activeUsersByPeriod = (days: number) => {
      return new Set(
        allBookings
          .filter((b) => (now.getTime() - new Date(b.start_time).getTime()) <= days * msInDay)
          .map((b) => b.user_id)
      ).size;
    };
    const dau = activeUsersByPeriod(1);
    const wau = activeUsersByPeriod(7);
    const mau = activeUsersByPeriod(30);

    const usersWithBookings = new Set(allBookings.map(b => b.user_id)).size;
    const bookingRate = Math.round((usersWithBookings / totalStudents) * 100);

    const userBookingCount = new Map<string, { name: string; count: number }>();
    allBookings.forEach((b) => {
      const name = b.profiles?.name || "Студент";
      const current = userBookingCount.get(b.user_id) || { name, count: 0 };
      userBookingCount.set(b.user_id, { name, count: current.count + 1 });
    });
    const topUsers = Array.from(userBookingCount.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    const byEquipment = new Map<string, number>();
    allBookings.forEach((b) => {
      const name = b.equipment?.name ?? "Удаленный станок";
      byEquipment.set(name, (byEquipment.get(name) ?? 0) + 1);
    });
    const topEquipment = Array.from(byEquipment.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const maxEqUsage = topEquipment[0]?.[1] || 1;

    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    allBookings.forEach((b) => dayCounts[new Date(b.start_time).getDay()]++);
    const busiestDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const busiestDay = Math.max(...dayCounts) > 0 ? dayNames[busiestDayIdx] : "Нет данных";

    const trendData = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const count = allBookings.filter(b => isSameDay(new Date(b.start_time), d)).length;
      return { day: d.toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'}), value: count };
    });

    return {
      totalBookings: allBookings.length,
      totalStudents, briefedStudents, briefingRate,
      dau, wau, mau, wauRate: Math.round((wau / totalStudents) * 100),
      usersWithBookings, bookingRate,
      topUsers, topEquipment, maxEqUsage,
      busiestDay, avgBookingsPerUser: Math.round((allBookings.length / (usersWithBookings || 1)) * 10) / 10,
      trendData, totalProjects: allProjects.length
    };
  }, [bookings, equipment, profiles, projects]);

  const handleExportCSV = () => {
    if (!bookings || bookings.length === 0) return toast.error("Нет данных");
    
    // ИСПРАВЛЕНО: Убрали колонку Email
    const headers = ["ID Брони", "Студент", "Оборудование", "Дата начала", "Статус"];
    const csvData = bookings.map(b => [
      b.id, b.profiles?.name || "Неизвестно",
      b.equipment?.name || "Удалено", new Date(b.start_time).toLocaleString("ru-RU"), b.status
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.setAttribute("download", `fablab_stats_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success("Отчет скачан!");
  };

  return (
    // ИСПРАВЛЕНО: Добавлен w-full, чтобы контент не плющило на мобилке
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-12 p-4 md:p-0">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b-4 border-slate-900 pb-4 md:pb-6">
        <div className="w-full">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter break-words">Панель статистики</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-1 md:mt-2">Обзор метрик и активности</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="w-full sm:w-auto bg-slate-900 hover:bg-blue-600 text-white px-6 py-4 md:py-3 font-black text-xs tracking-widest uppercase transition-colors shadow-[4px_4px_0_#2563eb] flex items-center justify-center gap-2 shrink-0"
        >
          <Download className="w-4 h-4" /> Экспорт CSV
        </button>
      </div>

      {/* ROW 1: MAIN KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <MetricCard title="Всего пользователей" value={stats.totalStudents} sub="Зарегистрировано" icon={Users} color="text-blue-600" />
        <MetricCard title="Всего бронирований" value={stats.totalBookings} sub="За все время" icon={Calendar} color="text-green-600" />
        <MetricCard title="Проекты на витрине" value={stats.totalProjects} sub="Опубликовано" icon={Rocket} color="text-amber-600" />
        <div className="bg-white border-4 border-slate-900 p-4 md:p-6 flex flex-col justify-between shadow-[4px_4px_0_#0f172a] w-full overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900 truncate pr-2">Активные юзеры</h4>
            <Activity className="w-4 h-4 md:w-5 md:h-5 text-purple-600 shrink-0" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><div className="text-xl md:text-2xl font-black text-slate-900">{stats.dau}</div><div className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase">DAU</div></div>
            <div><div className="text-xl md:text-2xl font-black text-slate-900">{stats.wau}</div><div className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase">WAU</div></div>
            <div><div className="text-xl md:text-2xl font-black text-slate-900">{stats.mau}</div><div className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase">MAU</div></div>
          </div>
        </div>
      </div>

      {/* ROW 2: TRENDS & FUNNEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-white border-4 border-slate-900 p-4 md:p-6 shadow-[4px_4px_0_#0f172a] overflow-hidden w-full">
          <h3 className="font-black text-base md:text-lg uppercase tracking-tight text-slate-900 mb-6">Тренды активности (7 дней)</h3>
          <div className="overflow-x-auto pb-2">
            <div className="h-48 md:h-64 min-w-[300px] flex items-end justify-between gap-1 sm:gap-2 border-b-2 border-slate-200 relative">
              {stats.trendData.map((d, i) => {
                const max = Math.max(...stats.trendData.map(t => t.value), 1);
                const height = `${(d.value / max) * 100}%`;
                return (
                  <div key={i} className="flex flex-col items-center flex-1 group">
                    <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-[10px] sm:text-xs font-bold mb-1 sm:mb-2">{d.value}</div>
                    <div className="w-full bg-blue-600 hover:bg-slate-900 transition-colors" style={{ height: d.value === 0 ? '4px' : height }} />
                    <div className="text-[8px] sm:text-[10px] font-bold uppercase text-slate-400 mt-1 sm:mt-2 truncate w-full text-center">{d.day}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border-4 border-slate-900 p-4 md:p-6 shadow-[4px_4px_0_#2563eb] text-white flex flex-col w-full">
          <h3 className="font-black text-base md:text-lg uppercase tracking-tight mb-6">Воронка</h3>
          <div className="space-y-4 md:space-y-6 flex-1 flex flex-col justify-center">
            <FunnelStep icon={Users} title="Студенты" value={stats.totalStudents} percent={100} />
            <FunnelStep icon={ShieldCheck} title="Прошли ТБ" value={stats.briefedStudents} percent={stats.briefingRate} color="bg-amber-500" />
            <FunnelStep icon={Zap} title="Брони" value={stats.usersWithBookings} percent={stats.bookingRate} color="bg-blue-500" />
          </div>
        </div>
      </div>

      {/* ROW 3: LEADERBOARD & HORIZONTAL BARS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white border-4 border-slate-900 p-4 md:p-6 shadow-[4px_4px_0_#0f172a] w-full overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-5 h-5 md:w-6 md:h-6 text-amber-500 shrink-0" />
            <h3 className="font-black text-base md:text-lg uppercase tracking-tight text-slate-900 truncate">Топ юзеров</h3>
          </div>
          <div className="space-y-3 md:space-y-4">
            {stats.topUsers.length === 0 ? <p className="text-slate-500 text-xs md:text-sm font-bold uppercase">Нет данных</p> : 
              stats.topUsers.map((u, i) => (
              <div key={i} className="flex items-center justify-between gap-2 p-3 border-2 border-slate-100 hover:border-slate-900 transition-colors">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-6 h-6 md:w-8 md:h-8 shrink-0 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px] md:text-xs">{i + 1}</div>
                  <span className="font-bold text-xs md:text-sm text-slate-900 truncate">{u.name}</span>
                </div>
                <div className="bg-blue-100 text-blue-800 px-2 py-1 font-black text-[10px] md:text-xs uppercase tracking-widest whitespace-nowrap">
                  {u.count} <span className="hidden sm:inline">Броней</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border-4 border-slate-900 p-4 md:p-6 shadow-[4px_4px_0_#0f172a] w-full overflow-hidden">
          <h3 className="font-black text-base md:text-lg uppercase tracking-tight text-slate-900 mb-6">Загрузка станков</h3>
          <div className="space-y-4 md:space-y-5">
            {stats.topEquipment.length === 0 ? <p className="text-slate-500 text-xs md:text-sm font-bold uppercase">Нет данных</p> : 
              stats.topEquipment.map(([name, count], i) => (
              <div key={i}>
                <div className="flex justify-between text-[10px] md:text-xs font-bold uppercase tracking-wide mb-1 md:mb-2 gap-2">
                  <span className="truncate text-slate-900">{name}</span>
                  <span className="text-slate-500 whitespace-nowrap shrink-0">{count} шт</span>
                </div>
                <div className="w-full h-2 md:h-3 bg-slate-100 border border-slate-200">
                  <div className="h-full bg-blue-600" style={{ width: `${(count / stats.maxEqUsage) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 4: KEY INDICATORS */}
      <div className="bg-slate-50 border-4 border-slate-900 p-4 md:p-6 shadow-[4px_4px_0_#0f172a] w-full">
        <h3 className="font-black text-base md:text-lg uppercase tracking-tight text-slate-900 mb-4 md:mb-6">Ключевые показатели</h3>
        <div className="space-y-3 md:space-y-4">
          <KeyIndicator label="Инструктаж ТБ" sub="% юзеров с доступом" value={`${stats.briefingRate}%`} />
          <KeyIndicator label="Броней на юзера" sub="В среднем" value={stats.avgBookingsPerUser} />
          <KeyIndicator label="Активный день" sub="Пик загрузки" value={stats.busiestDay} />
          <KeyIndicator label="WAU Rate" sub="% активных за неделю" value={`${stats.wauRate}%`} />
        </div>
      </div>

    </div>
  );
}

// ИСПРАВЛЕНО: Добавлены w-full и overflow-hidden, чтобы карточки не ломались
function MetricCard({ title, value, sub, icon: Icon, color }: any) {
  return (
    <div className="bg-white border-4 border-slate-900 p-4 md:p-6 flex flex-col justify-between shadow-[4px_4px_0_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_#2563eb] transition-all w-full overflow-hidden">
      <div className="flex justify-between items-start mb-3 md:mb-4 gap-2">
        <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900 leading-tight truncate">{title}</h4>
        <Icon className={`w-5 h-5 shrink-0 ${color}`} />
      </div>
      <div className="min-w-0">
        <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter mb-1 truncate">{value}</div>
        <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500 truncate">{sub}</div>
      </div>
    </div>
  );
}

function FunnelStep({ icon: Icon, title, value, percent, color = "bg-slate-700" }: any) {
  return (
    <div className="bg-slate-800 p-3 md:p-4 border-l-4 border-blue-500 flex items-center justify-between gap-2">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <Icon className="w-4 h-4 md:w-5 md:h-5 text-slate-400 shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-slate-400 truncate">{title}</div>
          <div className="text-lg md:text-xl font-black truncate">{value}</div>
        </div>
      </div>
      <div className={`shrink-0 px-2 md:px-3 py-1 ${color} text-white font-black text-[10px] md:text-xs`}>{percent}%</div>
    </div>
  );
}

function KeyIndicator({ label, sub, value }: any) {
  return (
    <div className="flex items-center justify-between p-3 md:p-4 bg-white border-2 border-slate-200 gap-2">
      <div className="min-w-0 pr-2 flex-1">
        <div className="font-black text-xs md:text-sm uppercase tracking-wide text-slate-900 truncate">{label}</div>
        <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5 md:mt-1 truncate">{sub}</div>
      </div>
      <div className="text-xl md:text-2xl font-black text-blue-600 shrink-0">{value}</div>
    </div>
  );
}