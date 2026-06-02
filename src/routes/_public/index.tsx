import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  ChevronRight, Cpu, Wrench, Lightbulb, MapPin, 
  Mail, Phone, Printer, Rocket, ShieldCheck, 
  Users, Zap, Target, Layers
} from "lucide-react";

export const Route = createFileRoute("/_public/")({
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-[#FAFAFA] font-sans overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* --- 1. АРХИТЕКТУРНАЯ HERO СЕКЦИЯ --- */}
      <section className="relative pt-12 md:pt-16 pb-0 bg-[#FAFAFA] min-h-[calc(100vh-80px)] flex flex-col justify-between">
        <div className="relative z-10 px-4 md:px-12 text-right select-none flex flex-col items-end justify-start w-full mt-4 md:mt-8">
          
          <div className="absolute top-[10%] left-[5%] hidden xl:block text-xs font-bold tracking-[0.2em] text-slate-900 uppercase text-left">
            <span className="text-blue-600 block text-lg mb-1">№1 В УНИВЕРСИТЕТЕ</span>
            Современный коворкинг<br/>для инженеров
          </div>

          <h1 className="text-[18vw] md:text-[14vw] font-black leading-[0.75] tracking-tighter text-slate-900 uppercase">
            FABLAB
          </h1>
          <h1 className="text-[15vw] md:text-[11vw] font-black leading-[0.8] tracking-tighter text-slate-900 uppercase opacity-90 mt-2">
            SATBAYEV
          </h1>
        </div>

        <div className="relative z-20 w-full max-w-[1600px] mx-auto px-0 sm:px-6 mt-8 md:mt-[-16vw] flex-1 flex flex-col justify-end">
          {/* ИСПРАВЛЕНО: Увеличили высоту на мобилках (h-[60vh] min-h-[500px]) */}
          <div className="relative w-full h-[60vh] min-h-[500px] md:h-[650px] flex items-end justify-between">
            
            {/* ИСПРАВЛЕНО: На мобилках object-center вместо object-bottom, чтобы поднять надпись здания */}
            <img 
              src="/hero-bg.png" 
              alt="Здание FabLab Satbayev" 
              className="absolute bottom-0 left-0 md:left-[-5%] w-full md:w-[95%] h-full object-cover object-center md:object-contain md:object-left-bottom pointer-events-none drop-shadow-2xl"
            />
            
            {/* Градиент */}
            <div className="absolute bottom-0 left-0 md:left-[-5%] w-full md:w-[95%] h-[50%] md:h-[30%] bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/90 to-transparent pointer-events-none" />

            {/* Акцентный блок CTA */}
            <div className="relative z-30 bg-blue-600 text-white p-6 md:p-10 lg:p-12 w-full md:w-[550px] rounded-t-[2rem] md:rounded-t-none md:rounded-tl-[3rem] flex flex-col justify-end shadow-[0_20px_50px_rgba(37,99,235,0.3)] border-t-4 border-[#FAFAFA] md:border-none md:border-t-8 md:border-l-8 md:border-[#FAFAFA] ml-auto">
              <p className="font-bold text-sm md:text-base uppercase tracking-widest mb-4 opacity-90">
                3D-печать, ЧПУ станки, слесарная зона, пайка и электроника
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-8 leading-tight">
                БРОНИРУЙ ОБОРУДОВАНИЕ ОНЛАЙН
              </h2>
              <button 
                onClick={() => navigate({ to: "/booking" })}
                className="group flex items-center font-bold uppercase tracking-widest text-sm border-b-2 border-white pb-2 w-max hover:text-blue-200 hover:border-blue-200 transition-colors"
              >
                ПЕРЕЙТИ К БРОНИРОВАНИЮ <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- 2. ТЕХНОЛОГИИ (Брутальная сетка) --- */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-24 z-10 relative mt-12">
        <div className="border-t-4 border-slate-900 pt-12 flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900">
            Технологии
          </h2>
          <p className="text-xs md:text-sm font-bold tracking-[0.2em] text-slate-500 uppercase md:text-right max-w-sm leading-relaxed">
            Профессиональное оборудование для решения реальных инженерных задач
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
          {[
            { name: "3D Печать", icon: Printer },
            { name: "Электроника", icon: Cpu },
            { name: "Слесарная", icon: Wrench },
            { name: "Пайка", icon: Zap },
            { name: "ЧПУ Станки", icon: Layers },
          ].map((Tool, i) => (
            <div key={i} className="group bg-white border-4 border-slate-900 flex flex-col items-center justify-center aspect-square shadow-[6px_6px_0_#2563eb] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0_#2563eb] transition-all cursor-default">
              <Tool.icon className="w-10 h-10 text-slate-900 mb-3 group-hover:text-blue-600 transition-colors" />
              <span className="font-bold text-xs tracking-widest uppercase text-slate-900 text-center">{Tool.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* --- 3. BENTO GRID (Журнальные карточки) --- */}
      <section className="max-w-7xl mx-auto px-6 pb-24 z-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          
          <div className="bg-white border-4 border-slate-900 p-8 md:p-12 shadow-[8px_8px_0_theme(colors.slate.900)] flex flex-col justify-between group">
            <div>
              <Badge text="Парк оборудования" />
              <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 mt-6 mb-4 leading-none">Тысячи деталей.<br/>Один принтер.</h3>
              <p className="text-slate-600 text-base md:text-lg mb-8 font-medium">Получи доступ к парку современных 3D-принтеров. От базового PLA до сложных инженерных пластиков — всё бронируется онлайн.</p>
            </div>
            <div className="relative h-64 bg-slate-100 border-4 border-slate-900 overflow-hidden">
               <img src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80" alt="3D Printing" className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
            </div>
          </div>

          <div className="bg-blue-600 border-4 border-slate-900 p-8 md:p-12 shadow-[8px_8px_0_theme(colors.slate.900)] flex flex-col justify-between">
            <div>
              <div className="inline-block border-2 border-slate-900 px-3 py-1 font-bold text-xs tracking-widest uppercase bg-slate-900 text-white shadow-[4px_4px_0_#ffffff]">Процессы</div>
              <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white mt-6 mb-4 leading-none">Умное<br/>бронирование</h3>
              <p className="text-blue-100 text-base md:text-lg mb-8 font-medium">Больше никаких бумажных журналов. Интерактивное расписание, контроль доступов и автоматические уведомления.</p>
            </div>
            <div className="relative h-64 bg-slate-900 border-4 border-slate-900 flex items-center justify-center p-6">
               <div className="w-full h-full border-2 border-slate-700 bg-slate-800 flex flex-col gap-4 p-4">
                  <div className="w-full h-8 bg-slate-700 animate-pulse" />
                  <div className="w-2/3 h-6 bg-blue-500 animate-pulse" />
                  <div className="w-full h-full border-2 border-dashed border-slate-600" />
               </div>
            </div>
          </div>

        </div>
      </section>

      {/* --- 4. МАССИВНЫЙ БЛОК CTA --- */}
      <section className="bg-slate-900 border-y-4 border-slate-900 py-24 md:py-32 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center mix-blend-luminosity" />
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-5xl md:text-8xl font-black uppercase text-white tracking-tighter mb-8 leading-none">От чертежа<br/><span className="text-blue-500">до стартапа</span></h2>
          <p className="text-lg md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto font-medium">
            FabLab — это не просто станки. Это место, где ты можешь собрать команду, получить грант и запустить реальный бизнес на базе университета.
          </p>
          <button 
            onClick={() => navigate({ to: "/projects" })}
            className="bg-blue-600 text-white border-4 border-blue-600 px-8 py-5 font-black uppercase tracking-[0.2em] hover:bg-white hover:text-blue-600 hover:border-white transition-colors text-sm md:text-base shadow-[8px_8px_0_#ffffff] hover:shadow-[4px_4px_0_#2563eb] hover:translate-y-1 hover:translate-x-1"
          >
            Перейти на Витрину
          </button>
        </div>
      </section>

      {/* --- 5. ФОТОГАЛЕРЕЯ (Жесткие рамки) --- */}
      <section className="max-w-7xl mx-auto px-6 py-24 z-10 relative">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12 border-b-4 border-slate-900 pb-12">
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900">
            Атмосфера
          </h2>
          <p className="text-xs md:text-sm font-bold tracking-[0.2em] text-slate-500 uppercase md:text-right max-w-sm leading-relaxed">
            Рабочее пространство, где создается будущее своими руками
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 relative h-[400px] border-4 border-slate-900 shadow-[8px_8px_0_#2563eb] group overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80" alt="Рабочая зона FabLab" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 bg-blue-600 text-white px-6 py-3 font-black uppercase tracking-widest text-xs border-t-4 border-r-4 border-slate-900">Основной зал</div>
          </div>

          <div className="relative h-[400px] border-4 border-slate-900 shadow-[8px_8px_0_#2563eb] group overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=800&q=80" alt="Зона 3D-печати" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 bg-slate-900 text-white px-6 py-3 font-black uppercase tracking-widest text-xs border-t-4 border-r-4 border-slate-900">3D Печать</div>
          </div>

          <div className="relative h-[320px] border-4 border-slate-900 shadow-[8px_8px_0_#2563eb] group overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80" alt="Командная работа" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 bg-slate-900 text-white px-6 py-3 font-black uppercase tracking-widest text-xs border-t-4 border-r-4 border-slate-900">Команды</div>
          </div>

          <div className="md:col-span-2 relative h-[320px] border-4 border-slate-900 shadow-[8px_8px_0_#2563eb] group overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80" alt="Высокотехнологичное оборудование" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 bg-blue-600 text-white px-6 py-3 font-black uppercase tracking-widest text-xs border-t-4 border-r-4 border-slate-900">Станочный парк</div>
          </div>
        </div>
      </section>

      {/* --- 6. ПРЕИМУЩЕСТВА --- */}
      <section className="bg-white border-y-4 border-slate-900 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 mb-6">Почему мы</h2>
            <div className="h-2 w-32 bg-blue-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
            <PerkCard 
              icon={ShieldCheck} 
              title="Безопасность" 
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
              title="Витрина" 
              desc="Публикуйте свои идеи, привлекайте инвесторов и находите недостающих специалистов в команду." 
            />
            <PerkCard 
              icon={MapPin} 
              title="Локация" 
              desc="Лаборатория находится прямо в сердце кампуса Satbayev University." 
            />
          </div>
        </div>
      </section>

      {/* --- 7. ФУТЕР (Минимализм) --- */}
      <footer className="bg-slate-900 border-t-8 border-blue-600 pt-20 pb-10 relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <div>
            <div className="flex items-center gap-3 text-2xl font-black uppercase text-white mb-6 tracking-tighter">
              <div className="w-10 h-10 bg-blue-600 flex items-center justify-center border-2 border-white">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              FABLAB
            </div>
            <p className="text-slate-400 text-sm font-bold tracking-widest uppercase leading-relaxed max-w-xs">
              Твои идеи. Наше оборудование. Место создания стартапов.
            </p>
          </div>
          
          <div className="flex flex-col gap-4 text-sm font-bold tracking-widest uppercase text-slate-400">
            <h4 className="text-white mb-2">Контакты</h4>
            <a href="#" className="hover:text-blue-400 flex items-center gap-3 transition-colors">
              <Phone className="w-5 h-5 text-slate-600" /> +7 (700) 000-00-00
            </a>
            <a href="mailto:fablab@satbayev.university" className="hover:text-blue-400 flex items-center gap-3 transition-colors">
              <Mail className="w-5 h-5 text-slate-600" /> fablab@satbayev.university
            </a>
          </div>
          
          <div className="flex flex-col gap-4 text-sm font-bold tracking-widest uppercase text-slate-400">
            <h4 className="text-white mb-2">Адрес</h4>
            <p className="flex items-start gap-3">
              <MapPin className="w-5 h-5 shrink-0 mt-1 text-slate-600" /> 
              <span>г. Алматы, ул. Сатпаева 22<br/>Главный корпус</span>
            </p>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-600 font-bold tracking-widest uppercase text-xs border-t-2 border-slate-800 pt-8">
          © {new Date().getFullYear()} FABLAB SATBAYEV.
        </div>
      </footer>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <div className="inline-block border-2 border-slate-900 px-3 py-1 font-bold text-xs tracking-widest uppercase bg-blue-600 text-white shadow-[4px_4px_0_#0f172a]">
      {text}
    </div>
  );
}

function PerkCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex flex-col">
      <div className="w-16 h-16 bg-[#FAFAFA] border-4 border-slate-900 flex items-center justify-center mb-6 shadow-[4px_4px_0_#2563eb]">
        <Icon className="w-8 h-8 text-blue-600" />
      </div>
      <h4 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-3">{title}</h4>
      <p className="text-slate-600 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}