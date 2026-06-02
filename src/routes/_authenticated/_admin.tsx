import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { AdminRouteGuard } from "@/components/admin-route-guard";
import { ClipboardList, Calendar, Newspaper, Rocket, Users } from "lucide-react"; // <-- ДОБАВИЛ ИКОНКУ USERS

export const Route = createFileRoute("/_authenticated/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const itemClass = "block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-100";
  const activeClass = "bg-slate-900 text-white shadow-sm";

  return (
    <AdminRouteGuard>
      {(profile) => (
        <div className="min-h-screen bg-slate-50">
          <AppHeader profile={profile} />
          <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 p-4 md:p-8">
            <aside className="w-64 shrink-0 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm h-fit">
              <div className="mb-6 space-y-1">
                <h2 className="text-lg font-black text-slate-900">FabLab Admin</h2>
                <p className="text-xs text-slate-500">Управление платформой</p>
              </div>
              <nav className="space-y-2">
                <Link to="/admin/statistics" className={itemClass} activeProps={{ className: `${itemClass} ${activeClass}` }}>
                  📊 Статистика
                </Link>
                <Link to="/admin/equipment" className={itemClass} activeProps={{ className: `${itemClass} ${activeClass}` }}>
                  🛠 Управление оборудованием
                </Link>
                <Link to="/admin/bookings" className={itemClass} activeProps={{ className: `${itemClass} ${activeClass}` }}>
                  📅 Управление бронями
                </Link>
                <Link to="/admin/schedule" className={itemClass} activeProps={{ className: `${itemClass} ${activeClass}` }}>
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Мое расписание
                  </span>
                </Link>
                <Link to="/admin/requests" className={itemClass} activeProps={{ className: `${itemClass} ${activeClass}` }}>
                  <span className="inline-flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Управление заявками
                  </span>
                </Link>
                <Link to="/admin/news" className={itemClass} activeProps={{ className: `${itemClass} ${activeClass}` }}>
                  <span className="inline-flex items-center gap-2">
                    <Newspaper className="h-4 w-4" />
                    Управление медиа
                  </span>
                </Link>
                <Link to="/admin/projects" className={itemClass} activeProps={{ className: `${itemClass} ${activeClass}` }}>
                  <span className="inline-flex items-center gap-2">
                    <Rocket className="h-4 w-4" />
                    Управление проектами
                  </span>
                </Link>
                {/* НОВАЯ КНОПКА УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ */}
                <Link to="/admin/users" className={itemClass} activeProps={{ className: `${itemClass} ${activeClass}` }}>
                  <span className="inline-flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    База резидентов
                  </span>
                </Link>
              </nav>
            </aside>
            <main className="min-w-0 w-full flex-1 py-1">
              <Outlet />
            </main>
          </div>
        </div>
      )}
    </AdminRouteGuard>
  );
}