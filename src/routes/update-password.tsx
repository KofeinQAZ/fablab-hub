import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/update-password")({
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Проверяем, удалось ли Supabase подхватить сессию из ссылки в письме
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        toast.error("Ссылка недействительна или устарела");
        navigate({ to: "/login" });
      }
    });
  }, [navigate]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Пароль должен быть минимум 8 символов");
      return;
    }

    setLoading(true);
    // Отправляем новый пароль в Supabase
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error("Ошибка при обновлении: " + error.message);
    } else {
      toast.success("Пароль успешно обновлен!");
      navigate({ to: "/profile" }); // После смены кидаем в профиль
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8 relative">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 shadow-sm">
            <KeyRound className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">FabLab Satbayev</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Установка пароля</p>
          </div>
        </div>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle>Новый пароль</CardTitle>
            <CardDescription>Придумайте новый надежный пароль для вашей учетной записи.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Новый пароль</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="h-11 rounded-2xl" 
                  placeholder="Минимум 8 символов"
                />
              </div>
              <Button type="submit" className="h-12 w-full rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold mt-2" disabled={loading}>
                {loading ? "Сохранение..." : "Сохранить и войти"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}