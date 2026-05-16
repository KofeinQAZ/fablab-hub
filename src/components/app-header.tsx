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
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-700 shadow-sm">
            <Wrench className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold leading-tight text-blue-700">FabLab Satbayev</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 leading-tight">FabLab Platform</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-4 text-sm font-medium text-slate-600 md:flex">
          <Link to="/" className="[&.active]:text-blue-700 hover:text-blue-700">Главная</Link>
          <Link to="/projects" className="[&.active]:text-blue-700 hover:text-blue-700">Проекты & Команды</Link>
          <Link to="/courses" className="[&.active]:text-blue-700 hover:text-blue-700">Обучение</Link>
          <Link to="/booking" className="[&.active]:text-blue-700 hover:text-blue-700">Бронирование</Link>
        </nav>
        {profile ? (
          <div className="flex items-center gap-2">
            {profile.safety_briefing_passed ? (
              <Badge className="hidden gap-1 rounded-xl border-0 bg-green-100 text-green-700 sm:inline-flex">
                <ShieldCheck className="h-3 w-3" /> Инструктаж пройден
              </Badge>
            ) : (
              <Badge className="hidden gap-1 rounded-xl border-0 bg-red-100 text-red-700 sm:inline-flex">
                <ShieldAlert className="h-3 w-3" /> Не пройден
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 rounded-2xl px-2 text-slate-700 hover:bg-slate-100">
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
          <Button onClick={() => navigate({ to: "/login" })} className="h-10 rounded-2xl bg-blue-700 hover:bg-blue-800">
            Войти
          </Button>
        )}
      </div>
    </header>
  );
}