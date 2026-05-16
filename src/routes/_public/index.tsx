import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Users, Wrench, Newspaper, Bot } from "lucide-react";
import { PartnersTicker } from "@/components/partners-ticker";

export const Route = createFileRoute("/_public/")({
  component: LandingPage,
});

function LandingPage() {
  const ecosystemCards = [
    {
      title: "3D-печать",
      description: "Быстрое прототипирование инженерных деталей на современных принтерах.",
      icon: Rocket,
      tone: "bg-slate-900 text-lime-400",
    },
    {
      title: "Лазерная резка",
      description: "Точные вырезы и гравировка для акрила, фанеры и композитов.",
      icon: Wrench,
      tone: "bg-blue-900 text-lime-400",
    },
    {
      title: "Команды и стартапы",
      description: "Находите единомышленников и собирайте команды под реальные проекты.",
      icon: Users,
      tone: "bg-slate-800 text-lime-400",
    },
  ];

  const inspirationCards = [
    {
      title: "Корпус FPV-дрона",
      image:
        "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Резная деревянная панель",
      image:
        "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Робот-манипулятор",
      image:
        "https://images.unsplash.com/photo-1561144257-e32e8efc6c4f?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-12 px-4 py-12 md:space-y-16 md:px-8 md:py-16">
      <section className="grid gap-8 md:grid-cols-12">
        <Card className="relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-8 shadow-sm transition-all hover:shadow-xl md:col-span-7 md:p-10">
          <Badge className="mb-5 w-fit border-0 bg-blue-100 text-blue-700">FabLab Satbayev Portal</Badge>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-lime-200 bg-green-50/70 px-3 py-1 text-xs font-medium text-lime-700">
            <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
            FabLab открыт и работает
          </div>
          <h1 className="max-w-4xl text-4xl font-black leading-[1.05] text-slate-900 md:text-6xl">
            Твои идеи. Наше оборудование.
          </h1>
          <p className="mt-5 max-w-3xl text-sm text-slate-600 md:text-base">
            Главный хаб для мейкеров, инженеров и стартапов университета.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button asChild className="h-12 rounded-2xl bg-[#005BAB] px-7 text-sm font-semibold hover:bg-blue-800">
              <Link to="/booking">Забронировать станок</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-2xl border-lime-300 bg-white px-7 text-sm font-semibold text-slate-700 hover:border-lime-400 hover:bg-lime-50 hover:text-lime-700"
            >
              <Link to="/projects">Найти команду</Link>
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl md:col-span-5">
          <div className="relative h-full min-h-[360px]">
            <img
              src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=2000&q=80"
              alt="Современный мейкерспейс FabLab"
              className="h-full w-full rounded-3xl object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent" />
          </div>
        </Card>
      </section>

      <PartnersTicker />

      <section className="grid gap-8 py-2 md:grid-cols-3">
        {ecosystemCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl">
              <CardHeader className="space-y-4 p-8 pb-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl text-slate-900">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 text-sm text-slate-600">
                {item.description}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-5 py-2">
        <h2 className="text-2xl font-black text-slate-900 md:text-3xl">Галерея вдохновения</h2>
        <p className="text-xs text-slate-500 md:text-sm">Реальные идеи и прототипы, созданные в FabLab Satbayev.</p>
        <div className="grid gap-8 md:grid-cols-3">
          {inspirationCards.map((item) => (
            <Card
              key={item.title}
              className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:scale-[1.015] hover:shadow-xl"
            >
              <div className="relative h-72 md:h-[22rem]">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                <p className="absolute bottom-3 left-3 right-3 text-xs font-medium tracking-wide text-slate-200">{item.title}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-8 py-2 md:grid-cols-2">
        <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl text-slate-900">
              <Newspaper className="h-5 w-5 text-slate-700" />
              Последние новости и проекты
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-8 pt-0">
            {[
              "Сборка гоночного болида Formula Student",
              "Тестирование новых FPV-дронов",
              "Прототип автоматизированного манипулятора",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 border-b border-slate-100 pb-3 text-sm text-slate-700 last:border-0 last:pb-0">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl text-slate-900">
              <Bot className="h-5 w-5 text-slate-700" />
              Инструментарий FabLab
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-8 pt-0">
            <div className="grid grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                <Wrench className="mx-auto mb-2 h-4 w-4 text-slate-700" />
                3D-принтеры
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                <Wrench className="mx-auto mb-2 h-4 w-4 text-slate-700" />
                Лазер
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                <Wrench className="mx-auto mb-2 h-4 w-4 text-slate-700" />
                FPV/IoT
              </div>
            </div>
            <Button asChild className="h-12 w-full rounded-2xl bg-[#005BAB] hover:bg-blue-800">
              <Link to="/booking">Открыть каталог бронирования</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
