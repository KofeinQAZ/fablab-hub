import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  ChevronRight, Cpu, Wrench, Lightbulb, MapPin, 
  Mail, Phone, Printer, Rocket, ShieldCheck, 
  Users, Zap, Target, Layers
} from "lucide-react";

// ОБЯЗАТЕЛЬНАЯ ЧАСТЬ ДЛЯ TANSTACK ROUTER
export const Route = createFileRoute("/_public/")({
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-[#FAFAFA] font-sans overflow-hidden">
      
      {/* --- ГЛОБАЛЬНЫЕ СВЕЧЕНИЯ (BACKGROUND BLOBS) --- */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[800px] right-0 w-[600px] h-[600px] bg-indigo-300/10 rounded-full blur-[100px] pointer-events-none" />

      {/* --- 1. HERO СЕКЦИЯ --- */}
      <section className="relative pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto text-center z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm mb-8 hover:shadow-md transition-shadow cursor-default">
          <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-sm font-medium text-slate-700">Платформа FabLab Satbayev открыта</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 drop-shadow-sm">
          Создавай <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">прорывные продукты</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 mb-10 leading-relaxed">
          Единая экосистема для студентов и инженеров. Бронируй высокоточное оборудование, находи команду и превращай свои чертежи в реальность.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate({ to: "/booking" })}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-[0_8px_25px_rgba(37,99,235,0.3)] hover:shadow-[0_12px_35px_rgba(37,99,235,0.4)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
          >
            Начать работу <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate({ to: "/projects" })}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-700 font-semibold border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-300"
          >
            Смотреть стартапы
          </button>
        </div>
      </section>

      {/* --- 2. ВОРОНКА ИНСТРУМЕНТОВ --- */}
      <section className="relative max-w-5xl mx-auto px-6 pb-24 z-10 flex flex-col items-center">
        <div className="w-px h-24 bg-gradient-to-b from-blue-600/0 via-blue-400 to-blue-600/0 mb-8" />
        <p className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-8">Доступные технологии</p>
        
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          {[
            { icon: Printer, color: "text-blue-600", bg: "bg-blue-100" },
            { icon: Cpu, color: "text-green-600", bg: "bg-green-100" },
            { icon: Wrench, color: "text-slate-600", bg: "bg-slate-200" },
            { icon: Zap, color: "text-amber-600", bg: "bg-amber-100" },
            { icon: Layers, color: "text-purple-600", bg: "bg-purple-100" },
          ].map((Tool, i) => (
            <div key={i} className={`w-14 h-14 rounded-2xl ${Tool.bg} flex items-center justify-center shadow-sm hover:scale-110 transition-transform duration-300 cursor-pointer`}>
              <Tool.icon className={`w-6 h-6 ${Tool.color}`} />
            </div>
          ))}
        </div>
      </section>

      {/* --- 3. BENTO GRID (Главные фичи) --- */}
      <section className="max-w-7xl mx-auto px-6 py-12 z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="bg-white rounded-[2rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-shadow duration-500 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 transition-transform duration-500 group-hover:scale-110" />
            <h3 className="text-3xl font-bold text-slate-900 mb-4 relative z-10">Тысячи деталей. <br/>Один принтер.</h3>
            <p className="text-slate-500 text-lg mb-8 relative z-10">Получи доступ к парку современных 3D-принтеров. От базового PLA до сложных инженерных пластиков — всё бронируется онлайн.</p>
            <div className="relative h-48 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden">
               <img src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80" alt="3D Printing" className="object-cover w-full h-full opacity-80 group-hover:scale-105 transition-transform duration-700" />
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-shadow duration-500 relative overflow-hidden group">
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -ml-20 -mb-20 transition-transform duration-500 group-hover:scale-110" />
            <h3 className="text-3xl font-bold text-slate-900 mb-4 relative z-10">Умное бронирование</h3>
            <p className="text-slate-500 text-lg mb-8 relative z-10">Больше никаких бумажных журналов. Интерактивное расписание, QR-коды для доступа и автоматические уведомления.</p>
            <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center">
               <div className="w-3/4 h-3/4 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-3">
                  <div className="w-full h-8 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="w-2/3 h-6 bg-blue-50 rounded-lg animate-pulse" />
                  <div className="w-full h-full bg-slate-50 rounded-lg border border-slate-100 border-dashed" />
               </div>
            </div>
          </div>

        </div>
      </section>

      {/* --- 4. GLOWING СЕКЦИЯ ("Magic AI Search" Вариант) --- */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/50 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[400px] bg-blue-500/10 rounded-[100%] blur-[80px]" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <Badge text="НОВЫЙ ПОДХОД" />
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-6 mb-6">От чертежа до стартапа</h2>
          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto">
            FabLab — это не просто станки. Это место, где ты можешь собрать команду, получить грант и запустить реальный бизнес на базе университета.
          </p>
          <div className="inline-flex bg-white p-2 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 items-center">
            <span className="px-6 py-3 text-slate-600 font-medium hidden sm:block">Ищешь команду для проекта?</span>
            <button 
              onClick={() => navigate({ to: "/projects" })}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-colors"
            >
              Перейти на Витрину
            </button>
          </div>
        </div>
      </section>

      {/* --- 🔥 НОВЫЙ БЛОК: ФОТОГАЛЕРЕЯ ФАБЛАБА (В СТИЛЕ BENTO-GRID) 🔥 --- */}
      <section className="max-w-7xl mx-auto px-6 py-12 z-10 relative">
        <div className="text-center mb-16">
          <Badge text="Атмосфера" />
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mt-4 mb-4">Жизнь внутри лаборатории</h2>
          <p className="text-slate-500 max-w-xl mx-auto text-lg">Посмотрите на рабочее пространство, где студенты Satbayev University создают будущее своими руками.</p>
        </div>

        {/* Асимметричная сетка картинок */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Фото 1: Широкое (2 колонки) */}
          <div className="md:col-span-2 relative h-[400px] rounded-[2rem] overflow-hidden group border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-500">
            <img 
              src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80" 
              alt="Рабочая зона FabLab" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <span className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-sm font-semibold text-white shadow-sm">
                Основной зал коворкинга
              </span>
            </div>
          </div>

          {/* Фото 2: Квадратное (1 колонка) */}
          <div className="relative h-[400px] rounded-[2rem] overflow-hidden group border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-500">
            <img 
              src="https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=800&q=80" 
              alt="Зона 3D-печати" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <span className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-sm font-semibold text-white shadow-sm">
                Парк 3D-принтеров
              </span>
            </div>
          </div>

          {/* Фото 3: Квадратное (1 колонка) */}
          <div className="relative h-[320px] rounded-[2rem] overflow-hidden group border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-500">
            <img 
              src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80" 
              alt="Командная работа" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <span className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-sm font-semibold text-white shadow-sm">
                Обсуждение проектов
              </span>
            </div>
          </div>

          {/* Фото 4: Широкое (2 колонки) */}
          <div className="md:col-span-2 relative h-[320px] rounded-[2rem] overflow-hidden group border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-500">
            <img 
              src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80" 
              alt="Высокотехнологичное оборудование" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <span className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-sm font-semibold text-white shadow-sm">
                Станочный парк и ЧПУ фрезеры
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* --- 5. МЕЛКАЯ СЕТКА ПРЕИМУЩЕСТВ --- */}
      <section className="max-w-7xl mx-auto px-6 py-24 z-10">
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Почему выбирают нас</h2>
          <p className="text-lg text-slate-500">Всё необходимое для комфортной и безопасной работы над проектами.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          <PerkCard 
            icon={ShieldCheck} 
            title="Безопасность (ТБ)" 
            desc="Обязательный инструктаж и тесты. Доступ к сложному оборудованию открывается только после прохождения ТБ." 
          />
          <PerkCard 
            icon={Target} 
            title="Точность" 
            desc="Промышленные ЧПУ станки, лазерные резчики и калиброванные 3D-принтеры для идеальных допусков." 
          />
          <PerkCard 
            icon={Users} 
            title="Комьюнити" 
            desc="Работайте бок о бок с лучшими умами университета. Обменивайтесь опытом и создавайте коллаборации." 
          />
          <PerkCard 
            icon={Lightbulb} 
            title="Менторство" 
            desc="Инженеры лаборатории всегда подскажут, какой материал выбрать и как оптимизировать модель." 
          />
          <PerkCard 
            icon={Rocket} 
            title="Витрина проектов" 
            desc="Публикуйте свои идеи, привлекайте инвесторов и находите недостающих специалистов в команду." 
          />
          <PerkCard 
            icon={MapPin} 
            title="Удобная локация" 
            desc="Лаборатория находится прямо в сердце кампуса Satbayev University." 
          />
        </div>
      </section>

      {/* --- 6. МИНИМАЛИСТИЧНЫЙ ФУТЕР/КОНТАКТЫ --- */}
      <footer className="border-t border-slate-200 bg-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4">
              <Wrench className="w-6 h-6 text-blue-600" /> FabLab Satbayev
            </div>
            <p className="text-slate-500 text-sm">Твои идеи. Наше оборудование.</p>
          </div>
          <div className="flex flex-col gap-3 text-sm text-slate-600">
            <h4 className="font-bold text-slate-900 mb-2">Контакты</h4>
            <a href="#" className="hover:text-blue-600 flex items-center gap-2"><Phone className="w-4 h-4"/> +7 (700) 000-00-00</a>
            <a href="#" className="hover:text-blue-600 flex items-center gap-2"><Mail className="w-4 h-4"/> fablab@satbayev.university</a>
          </div>
          <div className="flex flex-col gap-3 text-sm text-slate-600">
            <h4 className="font-bold text-slate-900 mb-2">Адрес</h4>
            <p className="flex items-start gap-2"><MapPin className="w-4 h-4 shrink-0 mt-0.5"/> г. Алматы, ул. Сатпаева 22<br/>Satbayev University</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-sm border-t border-slate-100 pt-8">
          © {new Date().getFullYear()} FabLab Satbayev Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

// Вспомогательные компоненты
function Badge({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold tracking-wider uppercase border border-blue-100">
      {text}
    </div>
  );
}

function PerkCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex flex-col group">
      <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center mb-5 group-hover:bg-blue-600 transition-colors duration-300 shadow-sm">
        <Icon className="w-6 h-6 text-slate-600 group-hover:text-white transition-colors" />
      </div>
      <h4 className="text-xl font-bold text-slate-900 mb-2">{title}</h4>
      <p className="text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}