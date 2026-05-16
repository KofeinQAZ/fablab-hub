import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentProfile } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/_student/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: authData, isLoading } = useCurrentProfile();

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl p-4 md:p-6">
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6 text-slate-500">Загрузка профиля...</CardContent>
        </Card>
      </main>
    );
  }

  if (!authData) return <Navigate to="/login" />;

  return (
    <main className="mx-auto w-full max-w-3xl p-4 md:p-6">
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Профиль пользователя</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p><span className="font-medium">Имя:</span> {authData.profile.name}</p>
          <p><span className="font-medium">Email:</span> {authData.email}</p>
          <p><span className="font-medium">Роль:</span> {authData.profile.role}</p>
          <p>
            <span className="font-medium">Инструктаж:</span>{" "}
            {authData.profile.safety_briefing_passed ? "Пройден" : "Не пройден"}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
