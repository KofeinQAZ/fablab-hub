import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wrench, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [defaultTab, setDefaultTab] = useState<"signin" | "signup">("signin");
  const [returnTo, setReturnTo] = useState("/booking");

  const htmlTagPattern = /<[^>]*>/;

  // Схемы валидации перемещены внутрь компонента для работы с i18n
  const signInSchema = z.object({
    email: z.string().email(t('login.validation.emailInvalid', 'Введите корректный email')),
    password: z
      .string()
      .min(1, t('login.validation.passwordRequired', 'Введите пароль'))
      .max(128, t('login.validation.passwordTooLong', 'Пароль слишком длинный'))
      .refine((value) => !htmlTagPattern.test(value), t('login.validation.passwordInvalidChars', 'Пароль содержит недопустимые символы')),
  });

  const signUpSchema = z.object({
    name: z
      .string()
      .trim()
      .min(2, t('login.validation.nameTooShort', 'Имя слишком короткое'))
      .max(80, t('login.validation.nameTooLong', 'Имя слишком длинное'))
      .refine((value) => !htmlTagPattern.test(value), t('login.validation.nameInvalidChars', 'Имя содержит недопустимые символы')),
    email: z.string().email(t('login.validation.emailInvalid', 'Введите корректный email')),
    phone: z.string().min(10, t('login.validation.phoneInvalid', 'Введите корректный номер телефона')).max(20, t('login.validation.phoneTooLong', 'Номер слишком длинный')),
    password: z
      .string()
      .min(8, t('login.validation.passwordMinLen', 'Минимум 8 символов'))
      .max(128, t('login.validation.passwordTooLong', 'Пароль слишком длинный'))
      .refine((value) => /\d/.test(value), t('login.validation.passwordDigit', 'Пароль должен содержать цифру'))
      .refine((value) => /[^A-Za-z0-9]/.test(value), t('login.validation.passwordSpecial', 'Пароль должен содержать спецсимвол'))
      .refine((value) => !htmlTagPattern.test(value), t('login.validation.passwordInvalidChars', 'Пароль содержит недопустимые символы')),
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      const target = params.get("returnTo");
      if (mode === "signup") setDefaultTab("signup");
      if (target && target.startsWith("/")) setReturnTo(target);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: returnTo as never });
    });
  }, [navigate, returnTo]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signInLoading) return;

    const validated = signInSchema.safeParse({ email, password });
    if (!validated.success) {
      toast.error(validated.error.issues[0]?.message ?? t('login.toasts.validationError', 'Проверьте корректность полей'));
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
      toast.success(t('login.toasts.signInSuccess', 'Вход выполнен'));
      navigate({ to: returnTo as never });
    } catch (error: any) {
      toast.error(error.message || t('login.toasts.signInError', 'Произошла ошибка при входе'));
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signUpLoading) return;

    const validated = signUpSchema.safeParse({ name, email, phone, password });
    if (!validated.success) {
      toast.error(validated.error.issues[0]?.message ?? t('login.toasts.validationError', 'Проверьте корректность полей'));
      return;
    }

    setSignUpLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: validated.data.email,
        password: validated.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/booking`,
          data: { 
            name: validated.data.name,
            phone: validated.data.phone
          },
        },
      });
      if (error) return toast.error(error.message);
      
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from("profiles").upsert({
          id: userData.user.id,
          name: validated.data.name || userData.user.email?.split("@")[0] || "Student",
          contact_email: validated.data.email,
          contact_phone: validated.data.phone,
          safety_briefing_passed: false,
          is_banned: false
        });
      }
      
      toast.success(t('login.toasts.signUpSuccessTitle', '✅ Аккаунт успешно создан!'), {
        description: t('login.toasts.signUpSuccessDesc', 'Мы отправили письмо на вашу почту. Обязательно перейдите по ссылке внутри письма, чтобы активировать аккаунт и войти на платформу!'),
        duration: 10000,
      });
    } catch (error: any) {
      toast.error(error.message || t('login.toasts.signUpError', 'Произошла ошибка при регистрации'));
    } finally {
      setSignUpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8 relative">
      <div className="w-full max-w-md">
        
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {t('login.backToHome', 'На главную')}
        </Link>

        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 shadow-sm">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-blue-700">FabLab Satbayev</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{t('login.platformAuth', 'Platform Auth')}</p>
          </div>
        </div>
        
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <Tabs value={defaultTab} onValueChange={(value) => setDefaultTab(value as "signin" | "signup")}>
            <CardHeader>
              <CardTitle>{t('login.title', 'Добро пожаловать')}</CardTitle>
              <CardDescription>{t('login.subtitle', 'Войдите или зарегистрируйтесь, чтобы продолжить.')}</CardDescription>
              <TabsList className="mt-4 grid grid-cols-2 rounded-2xl">
                <TabsTrigger value="signin" className="rounded-xl">{t('login.tabSignIn', 'Вход')}</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-xl">{t('login.tabSignUp', 'Регистрация')}</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('login.emailLabel', 'Email')}</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('login.passwordLabel', 'Пароль')}</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-2xl" />
                    <p className="text-xs text-slate-500">
                      {t('login.passwordHint', 'Безопасный пароль: минимум 8 символов, цифра и спецсимвол.')}
                    </p>
                  </div>
                  <Button type="submit" className="h-12 w-full rounded-2xl bg-blue-700 hover:bg-blue-800 font-bold" disabled={signInLoading}>
                    {signInLoading ? t('login.btnSignInLoading', 'Вход...') : t('login.btnSignIn', 'Войти')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('login.nameLabel', 'Имя и Фамилия')}</Label>
                    <Input id="name" required placeholder={t('login.namePlaceholder', 'Иван Иванов')} value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-2xl" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('login.phoneLabel', 'Номер телефона')}</Label>
                    <Input id="phone" type="tel" required placeholder="+7 (777) 000-00-00" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-2xl" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-su">{t('login.emailLabel', 'Email')}</Label>
                    <Input id="email-su" type="email" required placeholder="example@satbayev.university" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-2xl" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password-su">{t('login.passwordLabel', 'Пароль')}</Label>
                    <Input id="password-su" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-2xl" />
                    <p className="text-xs text-slate-500">
                      {t('login.passwordHint', 'Минимум 8 символов, минимум одна цифра и один спецсимвол.')}
                    </p>
                  </div>
                  
                  <Button type="submit" className="h-12 w-full rounded-2xl bg-blue-700 hover:bg-blue-800 font-bold" disabled={signUpLoading}>
                    {signUpLoading ? t('login.btnSignUpLoading', 'Создание...') : t('login.btnSignUp', 'Создать аккаунт')}
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