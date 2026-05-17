import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_public/")({
  component: LandingPage,
});

function LandingPage() {
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
            Твои идеи. Наше оборудование. FabLab Satbayev
          </h1>
          <p className="mt-5 max-w-3xl text-sm text-slate-600 md:text-base">
            Бронируйте оборудование за пару кликов и превращайте идеи в реальные прототипы.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button asChild className="h-12 rounded-2xl bg-[#005BAB] px-7 text-sm font-semibold hover:bg-blue-800">
              <Link to="/booking">Перейти к бронированию</Link>
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

      <section className="space-y-5 py-2">
        <h2 className="text-2xl font-black text-slate-900 md:text-3xl">Вдохновение из FabLab</h2>
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
    </main>
  );
}
