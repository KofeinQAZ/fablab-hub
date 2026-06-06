import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
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
import { useState } from "react";
import { ChevronDown, LogOut, ShieldAlert, ShieldCheck, User, Wrench, Bell, CheckCircle2, Menu, X, Rocket, Newspaper, Calendar, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { UserProfile } from "@/lib/auth";

export function AppHeader({ profile }: { profile: UserProfile | null }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success(t('auth.signOutSuccess', 'Вы вышли из аккаунта')); 
    setIsMobileMenuOpen(false);
    navigate({ to: "/login" });
  };

  const isAdmin = profile?.role === "admin";

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile.id).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const closeMenu = () => setIsMobileMenuOpen(false);

  // ОДНА кнопка, которая переключает языки по кругу
  const renderLanguageToggle = () => {
    const langs = ['ru', 'kz', 'en'];
    const currentLang = langs.includes(i18n.language) ? i18n.language : 'ru';
    
    const cycleLanguage = () => {
      const nextIndex = (langs.indexOf(currentLang) + 1) % langs.length;
      changeLanguage(langs[nextIndex]);
    };

    return (
      <Button
        variant="ghost"
        onClick={cycleLanguage}
        className="h-8 w-8 md:h-10 md:w-10 p-0 rounded-full border border-slate-200 bg-white hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center font-black uppercase tracking-widest text-[9px] md:text-[10px] text-blue-700 mr-1 shrink-0"
      >
        {currentLang}
      </Button>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-3 md:px-8">
          
          {/* МЯГКИЙ ЛОГОТИП С ТЕКСТОМ ДЛЯ ВСЕХ УСТРОЙСТВ */}
          <Link to="/" onClick={closeMenu} className="flex min-w-0 items-center gap-2 md:gap-3 group shrink-1 overflow-hidden mr-2">
            <img 
              src="/fablab-logo.png" 
              alt="FabLab Logo" 
              className="h-8 w-8 md:h-10 md:w-10 object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <div className="min-w-0 flex flex-col">
              <div className="truncate text-[11px] sm:text-sm md:text-base font-black uppercase tracking-tight text-slate-900 leading-none">FabLab Satbayev</div>
              <div className="truncate text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase leading-tight tracking-widest text-slate-400 mt-0.5">Platform</div>
            </div>
          </Link>
          
          {/* ЧИСТАЯ НАВИГАЦИЯ ДЛЯ DESKTOP СО СЛОВАРЕМ */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all [&.active]:bg-blue-50 [&.active]:text-blue-700">{t('nav.home')}</Link>
            <Link to="/booking" className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all [&.active]:bg-blue-50 [&.active]:text-blue-700">{t('nav.booking')}</Link>
            <Link to="/news" className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all [&.active]:bg-blue-50 [&.active]:text-blue-700">{t('nav.media')}</Link>
            <Link to="/projects" className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all [&.active]:bg-blue-50 [&.active]:text-blue-700">{t('nav.projects')}</Link>
          </nav>

          {/* ПРАВАЯ ЧАСТЬ */}
          <div className="flex items-center gap-1 md:gap-3 shrink-0">
            
            {/* Единая кнопка переключения языка */}
            {renderLanguageToggle()}

            {profile ? (
              <>
                {/* КОЛОКОЛЬЧИК */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 md:h-10 md:w-10 p-0 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm shrink-0">
                      <Bell className="h-4 w-4 text-slate-600" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 md:h-4 md:w-4 items-center justify-center rounded-full bg-red-500 border-2 border-white text-[8px] md:text-[9px] font-bold text-white shadow-sm">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 rounded-2xl border border-slate-100 p-0 shadow-xl bg-white overflow-hidden">
                    <div className="p-4 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                      <span className="font-bold text-slate-900 uppercase tracking-widest text-xs">{t('header.notifications.title', 'Уведомления')}</span>
                      {unreadCount > 0 && (
                        <button onClick={() => markAllAsRead.mutate()} className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                          <CheckCircle2 className="h-3 w-3" /> {t('header.notifications.markAllRead', 'Прочитать все')}
                        </button>
                      )}
                    </div>
                    <div className="max-h-[350px] overflow-y-auto p-2 space-y-1 bg-white">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs font-bold uppercase tracking-widest text-slate-400">{t('header.notifications.empty', 'Нет новых уведомлений')}</div>
                      ) : (
                        notifications.map((n: any) => (
                          <div 
                            key={n.id} 
                            onClick={() => { if(!n.is_read) markAsRead.mutate(n.id); }}
                            className={`p-3 rounded-xl transition-all cursor-pointer border ${n.is_read ? 'border-transparent bg-white hover:bg-slate-50' : 'border-blue-100 bg-blue-50/50 hover:bg-blue-50'}`}
                          >
                            <div className="font-bold text-slate-900 mb-1 text-sm leading-tight flex items-start justify-between gap-2">
                              <span>{n.title}</span>
                              {!n.is_read && <span className="h-2 w-2 mt-1.5 shrink-0 rounded-full bg-blue-600" />}
                            </div>
                            <p className="text-slate-600 text-xs font-medium leading-relaxed whitespace-pre-wrap">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* МЕНЮ ДЛЯ DESKTOP */}
                <div className="hidden md:flex items-center gap-3 ml-1">
                  {profile.safety_briefing_passed ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                      <ShieldCheck className="h-3 w-3" /> {t('header.user.tbPassed', 'ТБ Сдан')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-600">
                      <ShieldAlert className="h-3 w-3" /> {t('header.user.tbFailed', 'Нет ТБ')}
                    </span>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-10 rounded-full border border-slate-200 bg-white px-2 hover:bg-slate-50 transition-all shadow-sm">
                        <Avatar className="h-7 w-7 rounded-full">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                            {profile.name.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="mx-2 max-w-[120px] truncate text-xs font-bold uppercase tracking-widest text-slate-700">{profile.name}</span>
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-2xl border border-slate-100 p-2 shadow-xl bg-white">
                      <DropdownMenuItem asChild className="rounded-xl font-bold uppercase tracking-widest text-xs text-slate-600 focus:bg-slate-50 focus:text-slate-900 cursor-pointer p-3 mb-1">
                        <Link to="/profile"><User className="h-4 w-4 mr-2" /> {t('header.user.profile', 'Личный кабинет')}</Link>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem asChild className="rounded-xl font-bold uppercase tracking-widest text-xs text-blue-600 focus:bg-blue-50 focus:text-blue-700 cursor-pointer p-3 mb-1">
                          <Link to="/admin/statistics"><LayoutDashboard className="h-4 w-4 mr-2" /> {t('header.user.adminPanel', 'Админ-панель')}</Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-slate-100 my-1" />
                      <DropdownMenuItem onClick={signOut} className="rounded-xl font-bold uppercase tracking-widest text-xs text-rose-600 focus:bg-rose-50 focus:text-rose-700 cursor-pointer p-3">
                        <LogOut className="h-4 w-4 mr-2" /> {t('header.user.logout', 'Выйти')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              /* КНОПКИ ВХОДА СО СЛОВАРЕМ */
              <div className="flex items-center gap-1.5 md:gap-2 ml-1">
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/login" })}
                  className="h-8 md:h-9 rounded-full border border-slate-200 bg-white font-bold uppercase tracking-widest text-[9px] md:text-[10px] hover:bg-slate-50 transition-all shadow-sm px-2 md:px-3"
                >
                  {t('auth.login')}
                </Button>
                <Button
                  onClick={() => navigate({ to: "/login", search: { mode: "signup" } as never })}
                  className="hidden sm:flex h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-[10px] transition-all shadow-sm"
                >
                  {t('auth.register')}
                </Button>
              </div>
            )}

            {/* МЯГКАЯ КНОПКА ГАМБУРГЕРА (MOBILE) — ВЫНЕСЕНА СЮДА! ТЕПЕРЬ ОНА ДОСТУПНА ВСЕМ */}
            <Button 
              variant="ghost" 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden relative h-8 w-8 p-0 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-all shrink-0 ml-1"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ========================================= */}
      {/* МОБИЛЬНОЕ МЕНЮ */}
      {/* ========================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-top-2 duration-200 overflow-hidden">
          
          {/* Шапка моб меню */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div className="text-lg font-black uppercase tracking-tight text-slate-900 leading-none">{t('header.mobile.menu', 'Меню')}</div>
            </div>
            <button 
              onClick={closeMenu} 
              className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto w-full bg-white px-4 py-6 pb-24">
            
            {/* Навигационные ссылки со словарем */}
            <div className="flex flex-col gap-3">
              <Link to="/" onClick={closeMenu} className="flex items-center gap-4 text-lg font-bold uppercase tracking-tight p-4 rounded-2xl bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                {t('nav.home')}
              </Link>
              <Link to="/booking" onClick={closeMenu} className="flex items-center gap-4 text-lg font-bold uppercase tracking-tight p-4 rounded-2xl bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Calendar className="w-6 h-6" /> {t('nav.booking')}
              </Link>
              <Link to="/news" onClick={closeMenu} className="flex items-center gap-4 text-lg font-bold uppercase tracking-tight p-4 rounded-2xl bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Newspaper className="w-6 h-6" /> {t('nav.media')}
              </Link>
              <Link to="/projects" onClick={closeMenu} className="flex items-center gap-4 text-lg font-bold uppercase tracking-tight p-4 rounded-2xl bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Rocket className="w-6 h-6" /> {t('nav.projects')}
              </Link>
            </div>

            {/* Блок действий (Профиль или Вход/Регистрация) */}
            {profile ? (
              <div className="mt-8 border-t border-slate-100 pt-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{t('header.mobile.loggedInAs', 'Вы вошли как')}</div>
                    <div className="truncate text-lg font-black uppercase tracking-tight text-slate-900">{profile.name}</div>
                  </div>
                  {profile.safety_briefing_passed ? (
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest">
                      <ShieldCheck className="h-3 w-3" /> {t('header.user.tbPassed', 'ТБ Сдан')}
                    </span>
                  ) : (
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-rose-50 text-rose-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest">
                      <ShieldAlert className="h-3 w-3" /> {t('header.user.tbFailed', 'Нет ТБ')}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Link to="/profile" onClick={closeMenu} className="flex items-center justify-center gap-2 w-full rounded-xl bg-slate-50 text-slate-700 p-4 font-bold uppercase tracking-widest text-xs hover:bg-slate-100 transition-colors">
                    <User className="h-4 w-4" /> {t('header.user.profile', 'Личный кабинет')}
                  </Link>
                  {isAdmin && (
                    <Link to="/admin/statistics" onClick={closeMenu} className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-50 text-blue-700 p-4 font-bold uppercase tracking-widest text-xs hover:bg-blue-100 transition-colors">
                      <LayoutDashboard className="h-4 w-4" /> {t('header.user.adminPanel', 'Админ-панель')}
                    </Link>
                  )}
                  <button onClick={signOut} className="flex items-center justify-center gap-2 w-full rounded-xl bg-rose-50 text-rose-600 p-4 font-bold uppercase tracking-widest text-xs hover:bg-rose-100 transition-colors mt-2">
                    <LogOut className="h-4 w-4" /> {t('header.user.logout', 'Выйти')}
                  </button>
                </div>
              </div>
            ) : (
              /* Кнопки входа для гостей в мобильном меню */
              <div className="mt-8 border-t border-slate-100 pt-6 space-y-3">
                <Button
                  onClick={() => {
                    closeMenu();
                    navigate({ to: "/login" });
                  }}
                  variant="outline"
                  className="w-full h-14 rounded-2xl border-2 border-slate-200 font-bold uppercase tracking-widest text-xs text-slate-700 hover:bg-slate-50"
                >
                  {t('auth.login', 'Вход')}
                </Button>
                <Button
                  onClick={() => {
                    closeMenu();
                    navigate({ to: "/login", search: { mode: "signup" } as never });
                  }}
                  className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-xs shadow-md"
                >
                  {t('auth.register', 'Регистрация')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}