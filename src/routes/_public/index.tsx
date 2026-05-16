import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Users, Wrench, GraduationCap, Newspaper, Bot } from "lucide-react";

export const Route = createFileRoute("/_public/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-blue-50 to-slate-100 p-8 shadow-sm">
        <Badge className="mb-4 border-0 bg-blue-100 text-blue-700">FabLab Satbayev Portal</Badge>
        <h1 className="max-w-4xl text-4xl font-black leading-tight text-slate-900 md:text-6xl">
          Твои идеи. Наше оборудование. FabLab Satbayev
        </h1>
        <p className="mt-4 max-w-3xl text-base text-slate-600 md:text-lg">
          Главный хаб для мейкеров, инженеров и стартапов университета.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild className="h-12 rounded-2xl bg-blue-700 px-6 text-base hover:bg-blue-800">
            <Link to="/booking">Забронировать станок</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-2xl border-slate-300 bg-white px-6 text-base">
            <Link to="/projects">Найти команду</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-12">
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm md:col-span-4">
          <CardHeader className="pb-2">
            <Rocket className="h-6 w-6 text-blue-700" />
            <CardTitle>Создавать прототипы</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            От идеи до MVP: 3D-печать, лазерная резка и быстрые итерации внутри кампуса.
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm md:col-span-4">
          <CardHeader className="pb-2">
            <Users className="h-6 w-6 text-blue-700" />
            <CardTitle>Искать единомышленников</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Собирайте междисциплинарные команды и находите людей под реальные инженерные задачи.
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm md:col-span-4">
          <CardHeader className="pb-2">
            <GraduationCap className="h-6 w-6 text-blue-700" />
            <CardTitle>Проходить курсы</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            От базового инструктажа до продвинутой работы с оборудованием и цифровым производством.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-blue-700" />
              Последние новости и проекты
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Сборка гоночного болида Formula Student",
              "Тестирование новых FPV-дронов",
              "Прототип автоматизированного манипулятора",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-700" />
              Инструментарий FabLab
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center">
                <Wrench className="mx-auto mb-1 h-4 w-4 text-blue-700" />
                3D-принтеры
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center">
                <Wrench className="mx-auto mb-1 h-4 w-4 text-blue-700" />
                Лазер
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center">
                <Wrench className="mx-auto mb-1 h-4 w-4 text-blue-700" />
                FPV/IoT
              </div>
            </div>
            <Button asChild className="h-12 w-full rounded-2xl bg-blue-700 hover:bg-blue-800">
              <Link to="/booking">Открыть каталог бронирования</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
