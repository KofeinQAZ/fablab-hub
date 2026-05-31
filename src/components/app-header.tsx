import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut, ShieldAlert, ShieldCheck, User, Wrench, Bell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { UserProfile } from "@/lib/auth";

export function AppHeader({ profile }: { profile: UserProfile | null }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Вы вышли из аккаунта");
    navigate({ to: "/login" });
  };

  const isAdmin = profile?.role === "admin";

  // Загрузка уведомлений пользователя
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Отметить как прочитанное
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  // Отметить ВСЕ как прочитанные
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile!.id).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-7xl items-center justify-between gap-4 px-4 py-2 md:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#005BAB] shadow-sm">
            <Wrench className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold leading-tight text-slate-900">FabLab Satbayev</div>
            <div className="text-[10px] uppercase leading-tight tracking-[0.2em] text-slate-500">FabLab Platform</div>
          </div>
        </Link>
        
        {/* МЕНЮ НАВИГАЦИИ */}
        <nav className="hidden items-center gap-2 rounded-2xl border border-slate-100 bg-white/80 px-2 py-1 text-sm font-medium text-slate-600 md:flex">
          <Link to="/" className="rounded-xl px-3 py-2 transition-colors hover:bg-blue-50 hover:text-blue-700 [&.active]:bg-blue-50 [&.active]:text-blue-700">Главная</Link>
          <Link to="/booking" className="rounded-xl px-3 py-2 transition-colors hover:bg-blue-50 hover:text-blue-700 [&.active]:bg-blue-50 [&.active]:text-blue-700">Бронирование</Link>
          <Link to="/news" className="rounded-xl px-3 py-2 transition-colors hover:bg-blue-50 hover:text-blue-700 [&.active]:bg-blue-50 [&.active]:text-blue-700">Медиа</Link>
          <Link to="/projects" className="rounded-xl px-3 py-2 transition-colors hover:bg-blue-50 hover:text-blue-700 [&.active]:bg-blue-50 [&.active]:text-blue-700">Проекты</Link>
        </nav>

        {profile ? (
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* КОЛОКОЛЬЧИК УВЕДОМЛЕНИЙ */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full text-slate-600 hover:bg-slate-100">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 rounded-3xl p-0 overflow-hidden border-slate-200 shadow-xl">
                <div className="p-4 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                  <span className="font-bold text-slate-900">Уведомления</span>
                  {unreadCount > 0 && (
                    <button onClick={() => markAllAsRead.mutate()} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Прочитать все
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">Нет новых уведомлений</div>
                  ) : (
                    notifications.map((n: any) => (
                      <div 
                        key={n.id} 
                        onClick={() => { if(!n.is_read) markAsRead.mutate(n.id); }}
                        className={`p-3 rounded-2xl text-sm transition-colors cursor-pointer ${n.is_read ? 'opacity-60 hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'}`}
                      >
                        <div className="font-bold text-slate-900 mb-1 flex items-center justify-between gap-2">
                          <span className="truncate">{n.title}</span>
                          {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                        </div>
                        <p className="text-slate-600 text-xs line-clamp-2">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* БЕЙДЖ ТБ */}
            {profile.safety_briefing_passed ? (
              <Badge className="hidden gap-1 rounded-xl border border-green-100 bg-green-50 text-[11px] text-green-700 sm:inline-flex">
                <ShieldCheck className="h-3 w-3" /> ТБ пройден
              </Badge>
            ) : (
              <Badge className="hidden gap-1 rounded-xl border border-red-100 bg-red-50 text-[11px] text-red-700 sm:inline-flex">
                <ShieldAlert className="h-3 w-3" /> ТБ не пройден
              </Badge>
            )}

            {/* ПРОФИЛЬ */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 rounded-2xl border border-slate-100 px-2 text-slate-700 hover:bg-slate-100">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {profile.name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="mx-2 hidden max-w-[120px] truncate text-sm md:inline">{profile.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-200 bg-white">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="h-4 w-4" />
                    Профиль
                  </Link>
                </DropdownMenuItem>
                {isAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/statistics" className="cursor-pointer">
                      Панель администратора
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-600 focus:text-red-700">
                  <LogOut className="h-4 w-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/login" })}
              className="h-10 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            >
              Войти
            </Button>
            <Button
              onClick={() => navigate({ to: "/login", search: { mode: "signup" } as never })}
              className="h-10 rounded-2xl bg-[#005BAB] hover:bg-blue-800"
            >
              Регистрация
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}