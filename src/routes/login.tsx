import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/booking" });
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await ensureProfile(userData.user.id, userData.user.email);
    }
    toast.success("Вход выполнен");
    navigate({ to: "/booking" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/booking`,
        data: { name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userData.user.id,
        name: name || userData.user.email?.split("@")[0] || "Student",
        role: "student",
        safety_briefing_passed: false,
      });
      if (profileError) return toast.error(profileError.message);
    }
    toast.success("Аккаунт создан. Проверьте email при необходимости.");
    navigate({ to: "/booking" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 shadow-sm">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-blue-700">FabLab Satbayev</h1>
            <p className="text-xs uppercase tracking-widest text-slate-500">Supabase Auth</p>
          </div>
        </div>
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <Tabs defaultValue="signin">
            <CardHeader>
              <CardTitle>Добро пожаловать</CardTitle>
              <CardDescription>Войдите или зарегистрируйтесь, чтобы продолжить.</CardDescription>
              <TabsList className="mt-4 grid grid-cols-2 rounded-2xl">
                <TabsTrigger value="signin" className="rounded-xl">Вход</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-xl">Регистрация</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-2xl" />
                  </div>
                  <Button type="submit" className="h-12 w-full rounded-2xl bg-blue-700 hover:bg-blue-800" disabled={loading}>
                    {loading ? "Вход..." : "Войти"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Имя</Label>
                    <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-su">Email</Label>
                    <Input id="email-su" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-su">Password</Label>
                    <Input id="password-su" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-2xl" />
                  </div>
                  <Button type="submit" className="h-12 w-full rounded-2xl bg-blue-700 hover:bg-blue-800" disabled={loading}>
                    {loading ? "Создание..." : "Создать аккаунт"}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}