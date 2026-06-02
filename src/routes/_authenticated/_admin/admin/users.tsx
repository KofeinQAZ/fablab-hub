import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, Ban, CheckCircle2, AlertCircle, Search, Lock, Unlock, Crown, Mail, Phone, X, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin/users")({
  component: UsersPage,
});

interface UserProfile {
  id: string;
  name: string;
  email?: string;
  role: "student" | "resident" | "admin";
  contact_email?: string;
  contact_phone?: string;
  safety_briefing_passed: boolean;
  is_banned: boolean;
  created_at: string;
}

function UsersPage() {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "resident" | "admin">("all");
  const [banFilter, setBanFilter] = useState<"all" | "active" | "banned">("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [roleChangeDialog, setRoleChangeDialog] = useState(false);
  const [newRole, setNewRole] = useState<"student" | "resident" | "admin">("student");

  // Загрузка всех пользователей
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as UserProfile[];
    },
  });

  // Фильтрация
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.contact_phone?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesBan =
      banFilter === "all" ||
      (banFilter === "banned" && u.is_banned) ||
      (banFilter === "active" && !u.is_banned);

    return matchesSearch && matchesRole && matchesBan;
  });

  // Смена роли
  const changeRoleMutation = useMutation({
    mutationFn: async (params: { userId: string; newRole: string }) => {
      const { error } = await supabase.rpc("change_user_role", {
        target_user_id: params.userId,
        new_role: params.newRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
      setRoleChangeDialog(false);
      setSelectedUser(null);
      toast.success("✅ РОЛЬ ИЗМЕНЕНА");
    },
    onError: (error: any) => {
      toast.error(error.message || "Ошибка при изменении роли");
    },
  });

  // Бан / Разбан
  const toggleBanMutation = useMutation({
    mutationFn: async (params: { userId: string; isBanned: boolean }) => {
      const { error } = await supabase.rpc("toggle_user_ban", {
        target_user_id: params.userId,
        is_banned_new: params.isBanned,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
      setSelectedUser(null);
      toast.success("✅ СТАТУС БЛОКИРОВКИ ОБНОВЛЕН");
    },
    onError: (error: any) => {
      toast.error(error.message || "Ошибка при обновлении статуса");
    },
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <span className="bg-blue-600 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-[9px] px-2 py-1 shadow-[2px_2px_0_#0f172a] flex items-center"><Crown className="h-3 w-3 mr-1" /> АДМИН</span>;
      case "resident":
        return <span className="bg-purple-500 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-[9px] px-2 py-1 shadow-[2px_2px_0_#0f172a] flex items-center"><CheckCircle2 className="h-3 w-3 mr-1" /> РЕЗИДЕНТ</span>;
      default:
        return <span className="bg-slate-200 text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-[9px] px-2 py-1 shadow-[2px_2px_0_#0f172a] flex items-center"><User className="h-3 w-3 mr-1" /> СТУДЕНТ</span>;
    }
  };

  const getSafetyBadge = (passed: boolean) => {
    return passed ? (
      <span className="bg-emerald-400 text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-[9px] px-2 py-1 shadow-[2px_2px_0_#0f172a]">✓ ТБ СДАН</span>
    ) : (
      <span className="bg-rose-500 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-[9px] px-2 py-1 shadow-[2px_2px_0_#0f172a]">✗ НЕТ ТБ</span>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="border-b-4 border-slate-900 pb-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 mb-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors"
          >
            ← ВЕРНУТЬСЯ В АДМИНКУ
          </Link>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 border-4 border-slate-900 bg-emerald-400 flex items-center justify-center shadow-[4px_4px_0_#0f172a]">
              <Shield className="h-7 w-7 text-slate-900" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase">База резидентов</h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm mt-1">
                Всего пользователей в системе: <span className="font-black text-slate-900">{users.length}</span>
              </p>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-4 border-slate-900 p-4 bg-slate-50 shadow-[6px_6px_0_#0f172a]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="ПОИСК (ИМЯ, EMAIL, ТЕЛЕФОН)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 rounded-none border-2 border-slate-900 bg-white font-bold focus-visible:ring-0 focus-visible:border-blue-600 uppercase"
            />
          </div>

          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
            <SelectTrigger className="h-14 rounded-none border-2 border-slate-900 bg-white font-black uppercase tracking-widest text-xs focus:ring-0">
              <SelectValue placeholder="ФИЛЬТР ПО РОЛИ" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-4 border-slate-900 shadow-[4px_4px_0_#0f172a]">
              <SelectItem value="all" className="font-bold uppercase text-xs">Все роли</SelectItem>
              <SelectItem value="student" className="font-bold uppercase text-xs">Студенты</SelectItem>
              <SelectItem value="resident" className="font-bold uppercase text-xs">Резиденты</SelectItem>
              <SelectItem value="admin" className="font-bold uppercase text-xs">Администраторы</SelectItem>
            </SelectContent>
          </Select>

          <Select value={banFilter} onValueChange={(v) => setBanFilter(v as any)}>
            <SelectTrigger className="h-14 rounded-none border-2 border-slate-900 bg-white font-black uppercase tracking-widest text-xs focus:ring-0">
              <SelectValue placeholder="ФИЛЬТР ПО СТАТУСУ" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-4 border-slate-900 shadow-[4px_4px_0_#0f172a]">
              <SelectItem value="all" className="font-bold uppercase text-xs">Все статусы</SelectItem>
              <SelectItem value="active" className="font-bold uppercase text-xs">Активные</SelectItem>
              <SelectItem value="banned" className="font-bold uppercase text-xs text-rose-600">Заблокированные</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* USERS GRID */}
        {isLoading ? (
          <div className="p-20 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
            Загрузка базы данных...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-20 text-center border-4 border-dashed border-slate-200">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Пользователи не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`border-4 border-slate-900 rounded-none p-5 bg-white shadow-[6px_6px_0_#0f172a] flex flex-col justify-between ${user.is_banned ? 'opacity-80 bg-slate-50' : ''}`}
              >
                <div>
                  {/* User Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight truncate">{user.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Рег: {new Date(user.created_at).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                    {user.is_banned && (
                      <div className="px-2 py-1 border-2 border-rose-500 bg-rose-100 flex items-center justify-center">
                        <Ban className="h-4 w-4 text-rose-600" />
                      </div>
                    )}
                  </div>

                  {/* Badges Row */}
                  <div className="flex gap-2 mb-6 flex-wrap">
                    {getRoleBadge(user.role)}
                    {getSafetyBadge(user.safety_briefing_passed)}
                  </div>

                  {/* КОНТАКТЫ (КРУПНО И ЧЕТКО) */}
                  <div className="border-y-4 border-slate-900 py-4 mb-6 space-y-3 bg-slate-50 px-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-600 shrink-0" />
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {user.contact_email || "НЕТ ПОЧТЫ"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-emerald-600 shrink-0" />
                      <span className="font-black text-base tracking-widest text-slate-900">
                        {user.contact_phone || "НЕТ ТЕЛЕФОНА"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-auto">
                  <Dialog open={selectedUser?.id === user.id && roleChangeDialog} onOpenChange={(open) => {
                    if (!open) setRoleChangeDialog(false);
                    setSelectedUser(open ? user : null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        className="flex-1 bg-white border-2 border-slate-900 text-slate-900 font-black uppercase tracking-widest text-[10px] h-12 rounded-none shadow-[2px_2px_0_#0f172a] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all"
                        onClick={() => {
                          setSelectedUser(user);
                          setNewRole(user.role);
                          setRoleChangeDialog(true);
                        }}
                      >
                        Роль
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-0 border-4 border-slate-900 bg-white rounded-none shadow-[12px_12px_0_#0f172a] outline-none z-50 [&>button]:hidden">
                      <div className="bg-slate-900 p-5 flex justify-between items-start border-b-4 border-slate-900 text-white">
                        <DialogTitle className="text-xl font-black uppercase tracking-tighter">Назначить роль</DialogTitle>
                        <button onClick={() => setRoleChangeDialog(false)} className="p-1.5 bg-white text-slate-900 border-2 border-slate-900 hover:bg-rose-500 hover:text-white transition-colors shadow-[2px_2px_0_#0f172a]">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Текущий юзер: <span className="text-slate-900">{user.name}</span>
                          </label>
                          <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
                            <SelectTrigger className="h-14 rounded-none border-2 border-slate-900 bg-slate-50 font-black uppercase tracking-widest focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-4 border-slate-900 shadow-[4px_4px_0_#0f172a]">
                              <SelectItem value="student" className="font-bold uppercase text-xs py-3">Студент</SelectItem>
                              <SelectItem value="resident" className="font-bold uppercase text-xs py-3">Резидент</SelectItem>
                              <SelectItem value="admin" className="font-bold uppercase text-xs py-3">Администратор</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={() => changeRoleMutation.mutate({ userId: user.id, newRole })}
                          disabled={changeRoleMutation.isPending}
                          className="w-full h-14 bg-emerald-400 hover:bg-emerald-500 text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-xs rounded-none shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all mt-4"
                        >
                          {changeRoleMutation.isPending ? "СОХРАНЕНИЕ..." : "УТВЕРДИТЬ"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    onClick={() => toggleBanMutation.mutate({ userId: user.id, isBanned: !user.is_banned })}
                    disabled={toggleBanMutation.isPending}
                    className={`flex-1 h-12 rounded-none border-2 border-slate-900 font-black uppercase tracking-widest text-[10px] shadow-[2px_2px_0_#0f172a] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all ${
                      user.is_banned
                        ? "bg-slate-900 hover:bg-slate-800 text-white"
                        : "bg-rose-500 hover:bg-rose-600 text-white"
                    }`}
                  >
                    {toggleBanMutation.isPending ? "..." : user.is_banned ? (
                      <><Unlock className="h-4 w-4 mr-2" /> РАЗБАН</>
                    ) : (
                      <><Lock className="h-4 w-4 mr-2" /> БАН</>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}