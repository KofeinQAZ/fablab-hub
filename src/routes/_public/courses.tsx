import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_public/courses")({
  component: CoursesPage,
});

function CoursesPage() {
  const courses = [
    { title: "Базовый инструктаж по ТБ", level: "Начальный", completed: true },
    { title: "Продвинутая 3D-печать на BambuLab", level: "Средний", completed: false },
    { title: "Лазерная резка и постобработка", level: "Средний", completed: false },
    { title: "Прототипирование электроники в FabLab", level: "Продвинутый", completed: false },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Обучение</CardTitle>
          <p className="text-sm text-slate-600">Каталог курсов и инструктажей по оборудованию FabLab.</p>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => (
          <Card key={course.title} className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{course.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge className="border-0 bg-slate-100 text-slate-700">{course.level}</Badge>
              <div className="flex items-center justify-between">
                <Badge className={course.completed ? "border-0 bg-green-100 text-green-700" : "border-0 bg-blue-100 text-blue-700"}>
                  {course.completed ? "Пройден" : "Доступен"}
                </Badge>
                <Button className="h-10 rounded-2xl bg-blue-700 hover:bg-blue-800">
                  {course.completed ? "Повторить" : "Начать"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
