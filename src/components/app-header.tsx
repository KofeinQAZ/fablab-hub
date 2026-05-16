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
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, LogOut, ShieldAlert, ShieldCheck, User, Wrench } from "lucide-react";
import { toast } from "sonner";
import type { UserProfile } from "@/lib/auth";

export function AppHeader({ profile }: { profile: UserProfile | null }) {
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Вы вышли из аккаунта");
    navigate({ to: "/login" });
  };

  const isAdmin = profile?.role === "admin";

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
        <nav className="hidden items-center gap-2 rounded-2xl border border-slate-100 bg-white/80 px-2 py-1 text-sm font-medium text-slate-600 md:flex">
          <Link to="/" className="rounded-xl px-3 py-2 transition-colors hover:bg-blue-50 hover:text-blue-700 [&.active]:bg-blue-50 [&.active]:text-blue-700">Главная</Link>
          <Link to="/projects" className="rounded-xl px-3 py-2 transition-colors hover:bg-blue-50 hover:text-blue-700 [&.active]:bg-blue-50 [&.active]:text-blue-700">Проекты & Команды</Link>
          <Link to="/courses" className="rounded-xl px-3 py-2 transition-colors hover:bg-blue-50 hover:text-blue-700 [&.active]:bg-blue-50 [&.active]:text-blue-700">Обучение</Link>
          <Link to="/booking" className="rounded-xl px-3 py-2 transition-colors hover:bg-blue-50 hover:text-blue-700 [&.active]:bg-blue-50 [&.active]:text-blue-700">Бронирование</Link>
        </nav>
        {profile ? (
          <div className="flex items-center gap-2">
            {profile.safety_briefing_passed ? (
              <Badge className="hidden gap-1 rounded-xl border border-green-100 bg-green-50 text-[11px] text-green-700 sm:inline-flex">
                <ShieldCheck className="h-3 w-3" /> Инструктаж пройден
              </Badge>
            ) : (
              <Badge className="hidden gap-1 rounded-xl border border-red-100 bg-red-50 text-[11px] text-red-700 sm:inline-flex">
                <ShieldAlert className="h-3 w-3" /> Не пройден
              </Badge>
            )}
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