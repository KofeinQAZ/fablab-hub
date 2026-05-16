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
import { z } from "zod";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const htmlTagPattern = /<[^>]*>/;

  const signInSchema = z.object({
    email: z.string().email("Введите корректный email"),
    password: z
      .string()
      .min(1, "Введите пароль")
      .max(128, "Пароль слишком длинный")
      .refine((value) => !htmlTagPattern.test(value), "Пароль содержит недопустимые символы"),
  });

  const signUpSchema = z.object({
    name: z
      .string()
      .trim()
      .min(2, "Имя слишком короткое")
      .max(80, "Имя слишком длинное")
      .refine((value) => !htmlTagPattern.test(value), "Имя содержит недопустимые символы"),
    email: z.string().email("Введите корректный email"),
    password: z
      .string()
      .min(8, "Минимум 8 символов")
      .max(128, "Пароль слишком длинный")
      .refine((value) => /\d/.test(value), "Пароль должен содержать цифру")
      .refine((value) => /[^A-Za-z0-9]/.test(value), "Пароль должен содержать спецсимвол")
      .refine((value) => !htmlTagPattern.test(value), "Пароль содержит недопустимые символы"),
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/booking" });
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signInLoading) return;

    const validated = signInSchema.safeParse({ email, password });
    if (!validated.success) {
      toast.error(validated.error.issues[0]?.message ?? "Проверьте корректность полей");
      return;
    }

    setSignInLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(validated.data);
      if (error) return toast.error(error.message);
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await ensureProfile(userData.user.id, userData.user.email);
      }
      toast.success("Вход выполнен");
      navigate({ to: "/booking" });
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signUpLoading) return;

    const validated = signUpSchema.safeParse({ name, email, password });
    if (!validated.success) {
      toast.error(validated.error.issues[0]?.message ?? "Проверьте корректность полей");
      return;
    }

    setSignUpLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: validated.data.email,
        password: validated.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/booking`,
          data: { name: validated.data.name },
        },
      });
      if (error) return toast.error(error.message);
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userData.user.id,
          name: validated.data.name || userData.user.email?.split("@")[0] || "Student",
          role: "student",
          safety_briefing_passed: false,
        });
        if (profileError) return toast.error(profileError.message);
      }
      toast.success("Аккаунт создан. Проверьте email при необходимости.");
      navigate({ to: "/booking" });
    } finally {
      setSignUpLoading(false);
    }
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
                    <p className="text-xs text-slate-500">
                      Безопасный пароль: минимум 8 символов, цифра и спецсимвол.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-blue-700 hover:bg-blue-800"
                    disabled={signInLoading}
                  >
                    {signInLoading ? "Вход..." : "Войти"}
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
                    <Input id="password-su" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-2xl" />
                    <p className="text-xs text-slate-500">
                      Минимум 8 символов, минимум одна цифра и один спецсимвол.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-blue-700 hover:bg-blue-800"
                    disabled={signUpLoading}
                  >
                    {signUpLoading ? "Создание..." : "Создать аккаунт"}
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