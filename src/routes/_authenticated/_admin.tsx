import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { AdminRouteGuard } from "@/components/admin-route-guard";
import { ClipboardList, Calendar, Newspaper, Rocket, Users, Menu, X, LayoutDashboard, Wrench } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Обновили классы на брутальные
  const itemClass = "block border-4 border-transparent px-4 py-4 md:py-3 text-xs md:text-sm font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-100 hover:border-slate-900";
  const activeClass = "!bg-blue-600 !text-white !border-slate-900 shadow-[4px_4px_0_#0f172a] hover:!bg-blue-700";

  // Вынесли навигацию в отдельный компонент, чтобы не дублировать код для мобайла и десктопа
  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      <Link to="/admin/statistics" onClick={onClick} className={itemClass} activeProps={{ className: activeClass }}>
        <span className="inline-flex items-center gap-3">
          <LayoutDashboard className="h-5 w-5 md:h-4 md:w-4" />
          Статистика
        </span>
      </Link>
      <Link to="/admin/equipment" onClick={onClick} className={itemClass} activeProps={{ className: activeClass }}>
        <span className="inline-flex items-center gap-3">
          <Wrench className="h-5 w-5 md:h-4 md:w-4" />
          Оборудование
        </span>
      </Link>
      <Link to="/admin/bookings" onClick={onClick} className={itemClass} activeProps={{ className: activeClass }}>
        <span className="inline-flex items-center gap-3">
          <ClipboardList className="h-5 w-5 md:h-4 md:w-4" />
          Бронирования
        </span>
      </Link>
      <Link to="/admin/schedule" onClick={onClick} className={itemClass} activeProps={{ className: activeClass }}>
        <span className="inline-flex items-center gap-3">
          <Calendar className="h-5 w-5 md:h-4 md:w-4" />
          Расписание
        </span>
      </Link>
      <Link to="/admin/requests" onClick={onClick} className={itemClass} activeProps={{ className: activeClass }}>
        <span className="inline-flex items-center gap-3">
          <ClipboardList className="h-5 w-5 md:h-4 md:w-4" />
          Заявки
        </span>
      </Link>
      <Link to="/admin/news" onClick={onClick} className={itemClass} activeProps={{ className: activeClass }}>
        <span className="inline-flex items-center gap-3">
          <Newspaper className="h-5 w-5 md:h-4 md:w-4" />
          Медиа
        </span>
      </Link>
      <Link to="/admin/projects" onClick={onClick} className={itemClass} activeProps={{ className: activeClass }}>
        <span className="inline-flex items-center gap-3">
          <Rocket className="h-5 w-5 md:h-4 md:w-4" />
          Проекты
        </span>
      </Link>
      <Link to="/admin/users" onClick={onClick} className={itemClass} activeProps={{ className: activeClass }}>
        <span className="inline-flex items-center gap-3">
          <Users className="h-5 w-5 md:h-4 md:w-4" />
          Резиденты
        </span>
      </Link>
    </>
  );

  return (
    <AdminRouteGuard>
      {(profile) => (
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <AppHeader profile={profile} />
          
          <div className="mx-auto flex flex-1 w-full max-w-7xl flex-col md:flex-row gap-6 p-4 md:p-8 overflow-hidden">
            
            {/* МОБИЛЬНАЯ ПЛАШКА И ГАМБУРГЕР (Видна только на телефонах) */}
            <div className="md:hidden flex items-center justify-between bg-white border-4 border-slate-900 p-4 shadow-[4px_4px_0_#0f172a] shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">FabLab Admin</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Управление платформой</p>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="p-2 bg-blue-600 text-white border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>

            {/* ДЕСКТОПНЫЙ САЙДБАР (Скрыт на телефонах) */}
            <aside className="hidden md:block w-72 shrink-0 border-4 border-slate-900 bg-white p-6 shadow-[6px_6px_0_#0f172a] h-fit sticky top-24">
              <div className="mb-6 space-y-1 border-b-4 border-slate-900 pb-4">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Admin Panel</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Управление платформой</p>
              </div>
              <nav className="space-y-2">
                <NavLinks />
              </nav>
            </aside>

            {/* ВЫЕЗЖАЮЩЕЕ МОБИЛЬНОЕ МЕНЮ */}
            {isMobileMenuOpen && (
              <div className="md:hidden fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center border-b-4 border-slate-900 shrink-0">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Навигация</h2>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className="p-2 bg-white text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
                  <NavLinks onClick={() => setIsMobileMenuOpen(false)} />
                </nav>
              </div>
            )}

            {/* ОСНОВНОЙ КОНТЕНТ */}
            <main className="min-w-0 w-full flex-1 flex flex-col">
              <Outlet />
            </main>

          </div>
        </div>
      )}
    </AdminRouteGuard>
  );
}