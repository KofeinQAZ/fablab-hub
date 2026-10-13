import { useTranslation } from "react-i18next";
import { ArrowDown, Map, Presentation, Printer, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

const copy = {
  ru: {
    lead: "Лаборатория, где идеи становятся реальными вещами.",
    summary: "Познакомься с FabLab или переходи к карте, заявкам на воркшопы и 3D-печати.",
    more: "Подробнее", tools: "Функционал", about: "Что такое FabLab?",
    description: "FabLab Satbayev — лаборатория цифрового производства в Satbayev University. Здесь студенты, инженеры и мейкеры создают прототипы, работают с электроникой и осваивают технологии изготовления: от 3D-печати до обработки материалов на станках.",
    siteTitle: "Одна площадка для работы с лабораторией",
    siteDescription: "Этот сайт объединяет информацию о лаборатории и её сервисы: зоны и оборудование, заявки на воркшопы и печать, клубы и команду менторов.",
    features: [
      { title: "Карта и оборудование", description: "Зоны лаборатории, описания станков и их возможности." },
      { title: "Воркшопы и курсы", description: "Заявка на зону для занятия или мероприятия с выбором свободного времени." },
      { title: "3D-печать", description: "Загрузка STL-моделей, выбор пластика, предварительная стоимость и очередь." },
      { title: "Клубы и команда", description: "Сообщества, проекты и менторы, с которыми можно развивать свою идею." },
    ],
  },
  en: {
    lead: "A laboratory where ideas become real things.",
    summary: "Discover FabLab or explore the map, workshop requests and 3D printing.",
    more: "Learn more", tools: "Explore services", about: "What is FabLab?",
    description: "FabLab Satbayev is a digital fabrication laboratory at Satbayev University. Students, engineers and makers build prototypes, work with electronics and explore manufacturing technologies, from 3D printing to machining materials.",
    siteTitle: "One place to connect with the laboratory",
    siteDescription: "This website brings together lab information and services: zones and equipment, workshop and print requests, clubs and the mentor team.",
    features: [
      { title: "Map and equipment", description: "Laboratory zones, machine descriptions and their capabilities." },
      { title: "Workshops and courses", description: "Request a zone for a class or event at an available time." },
      { title: "3D printing", description: "Upload STL models, choose filament and see estimated costs and the queue." },
      { title: "Clubs and team", description: "Communities, projects and mentors to help develop your idea." },
    ],
  },
  kz: {
    lead: "Идеялар нақты бұйымға айналатын зертхана.",
    summary: "FabLab-пен таныс немесе картаға, воркшоп өтінімдеріне және 3D-басып шығаруға өт.",
    more: "Толығырақ", tools: "Мүмкіндіктер", about: "FabLab деген не?",
    description: "FabLab Satbayev — Satbayev University-дегі цифрлық өндіріс зертханасы. Мұнда студенттер, инженерлер мен мейкерлер прототиптер жасайды, электроникамен жұмыс істейді және 3D-басып шығарудан бастап станоктарда материал өңдеуге дейінгі өндіріс технологияларын меңгереді.",
    siteTitle: "Зертханамен жұмыс істеуге арналған бір алаң",
    siteDescription: "Бұл сайт зертхана туралы ақпарат пен қызметтерді біріктіреді: аймақтар мен жабдықтар, воркшоп пен басып шығару өтінімдері, клубтар және менторлар командасы.",
    features: [
      { title: "Карта және жабдықтар", description: "Зертхана аймақтары, станоктардың сипаттамалары мен мүмкіндіктері." },
      { title: "Воркшоптар мен курстар", description: "Сабақ немесе іс-шара үшін бос уақытты таңдап, аймаққа өтінім беру." },
      { title: "3D-басып шығару", description: "STL-модельдерді жүктеу, пластик таңдау, алдын ала құн және кезек." },
      { title: "Клубтар мен команда", description: "Идеяңды дамытуға көмектесетін қауымдастықтар, жобалар және менторлар." },
    ],
  },
};

function useIntroCopy() {
  const { i18n } = useTranslation();
  const language = i18n.language.split("-")[0];
  return copy[language === "kz" ? "kz" : language === "en" ? "en" : "ru"];
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    block: "start",
  });
}

export function HomepageActions() {
  const text = useIntroCopy();
  return (
    <section aria-label="FabLab Satbayev" className="bg-landing-action text-landing-action-foreground">
      <div className="mx-auto grid max-w-7xl items-center gap-7 px-4 py-8 sm:px-6 md:px-8 md:py-10 lg:grid-cols-[1fr_auto] lg:gap-12">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-black leading-tight sm:text-3xl">{text.lead}</h2>
          <p className="mt-3 text-base leading-relaxed">{text.summary}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => scrollTo("about-fablab")} className="h-auto min-h-14 justify-between gap-8 whitespace-normal rounded-none border-2 border-foreground bg-card px-5 text-base font-bold text-card-foreground hover:bg-muted">
            {text.more}<ArrowDown aria-hidden="true" />
          </Button>
          <Button variant="outline" onClick={() => scrollTo("lab")} className="h-auto min-h-14 justify-between gap-8 whitespace-normal rounded-none border-2 border-landing-action-foreground bg-transparent px-5 text-base font-bold text-landing-action-foreground hover:bg-card hover:text-card-foreground">
            {text.tools}<Map aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}

export function HomepageIntroduction() {
  const text = useIntroCopy();
  const icons = [Wrench, Presentation, Printer, Users];
  return (
    <section id="about-fablab" className="scroll-mt-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:px-8 md:py-16">
        <div className="grid gap-8 border-b-2 border-foreground pb-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-3xl font-black uppercase leading-tight sm:text-4xl">{text.about}</h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{text.description}</p>
          </div>
          <div className="lg:border-l-2 lg:border-border lg:pl-10">
            <h3 className="text-2xl font-bold leading-tight">{text.siteTitle}</h3>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{text.siteDescription}</p>
          </div>
        </div>
        <div className="grid gap-8 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {text.features.map((feature, index) => {
            const Icon = icons[index] ?? Wrench;
            return (
              <article key={feature.title}>
                <Icon className="mb-4 h-7 w-7 text-primary" aria-hidden="true" />
                <h3 className="text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-muted-foreground">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}