import { createFileRoute, Link, Navigate, Outlet } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { useCurrentProfile } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { data: authData, isLoading } = useCurrentProfile();

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (!authData) {
    return <Navigate to="/login" />;
  }

  if (authData.profile.role !== "admin") {
    return <Navigate to="/booking" />;
  }

  const itemClass = "block rounded-2xl px-3 py-2 text-slate-700 hover:bg-slate-100";
  const activeClass = "bg-blue-50 text-blue-700";

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader profile={authData.profile} />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl p-4 md:p-6">
        <aside className="w-64 shrink-0 rounded-3xl border-r border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-blue-700">FabLab Admin</h2>
            <p className="text-sm text-slate-500">Управление платформой</p>
          </div>
          <nav className="space-y-2 text-sm font-medium">
            <Link to="/admin/statistics" className={itemClass} activeProps={{ className: `${itemClass} ${activeClass}` }}>
              📊 Статистика
            </Link>
            <Link to="/admin/equipment" className={itemClass} activeProps={{ className: `${itemClass} ${activeClass}` }}>
              🛠 Оборудование
            </Link>
            <Link to="/admin/bookings" className={itemClass} activeProps={{ className: `${itemClass} ${activeClass}` }}>
              📅 Бронирования
            </Link>
          </nav>
        </aside>
        <main className="min-w-0 w-full flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
