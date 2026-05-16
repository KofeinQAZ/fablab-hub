import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_public/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const items = [
    {
      title: "Ищем 3D-моделлера для стартапа",
      team: "Team ProtoAI",
      stack: "Fusion360, SLA Print",
      status: "Открыт набор",
    },
    {
      title: "Разработка робота-манипулятора",
      team: "Robotics Satbayev",
      stack: "CAD, Electronics, ROS",
      status: "Нужен embedded инженер",
    },
    {
      title: "Аэродинамический корпус FPV-платформы",
      team: "AeroLab",
      stack: "CFD, Composite, CNC",
      status: "Нужен инженер-конструктор",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Проекты & Команды</CardTitle>
            <p className="mt-1 text-sm text-slate-600">Найдите команду под инженерный проект или опубликуйте свою идею.</p>
          </div>
          <Button className="h-11 rounded-2xl bg-blue-700 hover:bg-blue-800">Опубликовать проект</Button>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.title} className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p><span className="font-medium text-slate-900">Команда:</span> {item.team}</p>
              <p><span className="font-medium text-slate-900">Стек:</span> {item.stack}</p>
              <Badge className="border-0 bg-blue-100 text-blue-700">{item.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
