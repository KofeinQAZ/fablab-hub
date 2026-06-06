import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { 
  ChevronRight, Cpu, Wrench, Lightbulb, MapPin, 
  Mail, Phone, Printer, Rocket, ShieldCheck, 
  Users, Zap, Target, Layers, ExternalLink
} from "lucide-react";

export const Route = createFileRoute("/_public/")({
  component: LandingPage,
});

function LandingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Реальные экосистемные партнеры FabLab Satbayev
  const partners = [
    { name: "Satbayev University", logo: "/partners/logo_eng.png", url: "https://satbayev.university/" },
    { name: "Chevron", logo: "/partners/Chevron.png", url: "https://www.chevron.com" },
    { name: "Fab Foundation", logo: "/partners/Fablabfound.jpg", url: "https://fabfoundation.org" },
    { name: "Astana Hub", logo: "/partners/Astanahub.avif", url: "https://astanahub.com" },
  ];

  return (
    <div className="relative min-h-screen bg-[#FAFAFA] font-sans overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* --- 1. АРХИТЕКТУРНАЯ HERO СЕКЦИЯ --- */}
      <section className="relative pt-12 md:pt-16 pb-0 bg-[#FAFAFA] min-h-[calc(100vh-80px)] flex flex-col justify-between">
        <div className="relative z-10 px-4 md:px-12 text-right select-none flex flex-col items-end justify-start w-full mt-4 md:mt-8">
          
          <div className="absolute top-[10%] left-[5%] hidden xl:block text-xs font-bold tracking-[0.2em] text-slate-900 uppercase text-left">
            <span className="text-blue-600 block text-lg mb-1">{t('landing.hero.badge', 'ИННОВАЦИИ В ДЕЙСТВИИ')}</span>
            {t('landing.hero.subtitle1', 'НАЦИОНАЛЬНЫЙ ИССЛЕДОВАТЕЛЬСКИЙ')}<br/>{t('landing.hero.subtitle2', 'ТЕХНИЧЕСКИЙ УНИВЕРСИТЕТ')}
          </div>

          <h1 className="text-[18vw] md:text-[14vw] font-black leading-[0.75] tracking-tighter text-slate-900 uppercase">
            FABLAB
          </h1>
          <h1 className="text-[15vw] md:text-[11vw] font-black leading-[0.8] tracking-tighter text-slate-900 uppercase opacity-90 mt-2">
            SATBAYEV
          </h1>
        </div>

        <div className="relative z-20 w-full max-w-[1600px] mx-auto px-0 sm:px-6 mt-8 md:mt-[-16vw] flex-1 flex flex-col justify-end">
          <div className="relative w-full h-[60vh] min-h-[500px] md:h-[650px] flex items-end justify-between">
            
            <img 
              src="/hero-bg.png" 
              alt="FabLab Satbayev Building" 
              className="absolute bottom-0 left-0 md:left-[-5%] w-full md:w-[95%] h-full object-cover object-center md:object-contain md:object-left-bottom pointer-events-none drop-shadow-2xl"
            />
            
            {/* Градиент */}
            <div className="absolute bottom-0 left-0 md:left-[-5%] w-full md:w-[95%] h-[50%] md:h-[30%] bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/90 to-transparent pointer-events-none" />

            {/* Акцентный блок CTA */}
            <div className="relative z-30 bg-blue-600 text-white p-6 md:p-10 lg:p-12 w-full md:w-[550px] rounded-t-[2rem] md:rounded-t-none md:rounded-tl-[3rem] flex flex-col justify-end shadow-[0_20px_50px_rgba(37,99,235,0.3)] border-t-4 border-[#FAFAFA] md:border-none md:border-t-8 md:border-l-8 md:border-[#FAFAFA] ml-auto">
              <p className="font-bold text-sm md:text-base uppercase tracking-widest mb-4 opacity-90">
                {t('landing.hero.ctaDesc', '3D-ПЕЧАТЬ, ЧПУ СТАНКИ, СЛЕСАРНАЯ ЗОНА')}
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-8 leading-tight">
                {t('landing.hero.ctaTitle', 'БРОНИРУЙТЕ ОБОРУДОВАНИЕ ОНЛАЙН')}
              </h2>
              <button 
                onClick={() => navigate({ to: "/booking" })}
                className="group flex items-center font-bold uppercase tracking-widest text-sm border-b-2 border-white pb-2 w-max hover:text-blue-200 hover:border-blue-200 transition-colors"
              >
                {t('landing.hero.ctaBtn', 'ПЕРЕЙТИ К БРОНИРОВАНИЮ')} <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- 2. ТЕХНОЛОГИИ (Брутальная сетка) --- */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-24 z-10 relative mt-12">
        <div className="border-t-4 border-slate-900 pt-12 flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900">
            {t('landing.tech.title', 'НАШИ ВОЗМОЖНОСТИ')}
          </h2>
          <p className="text-xs md:text-sm font-bold tracking-[0.2em] text-slate-500 uppercase md:text-right max-w-sm leading-relaxed">
            {t('landing.tech.subtitle', 'ВЕСЬ СПЕКТР ИНСТРУМЕНТОВ ДЛЯ ВОПЛОЩЕНИЯ ИДЕЙ')}
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
          {[
            { name: t('landing.tech.items.print', '3D Печать'), icon: Printer },
            { name: t('landing.tech.items.electronics', 'Электроника'), icon: Cpu },
            { name: t('landing.tech.items.lock', 'Слесарная'), icon: Wrench },
            { name: t('landing.tech.items.solder', 'Пайка'), icon: Zap },
            { name: t('landing.tech.items.cnc', 'ЧПУ Станки'), icon: Layers },
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
              <Badge text={t('landing.bento.equipBadge', 'ПАРК ОБОРУДОВАНИЯ')} />
              <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 mt-6 mb-4 leading-none">{t('landing.bento.equipTitle1', 'ТЫСЯЧИ ДЕТАЛЕЙ.')}<br/>{t('landing.bento.equipTitle2', 'ОДИН ПРИНТЕР.')}</h3>
              <p className="text-slate-600 text-base md:text-lg mb-8 font-medium">{t('landing.bento.equipDesc', 'Получи доступ к парку современных 3D-принтеров. От базового PLA до сложных инженерных пластиков — всё бронируется онлайн.')}</p>
            </div>
            <div className="relative h-64 bg-slate-100 border-4 border-slate-900 overflow-hidden">
               <img src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80" alt="3D Printing" className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
            </div>
          </div>

          <div className="bg-blue-600 border-4 border-slate-900 p-8 md:p-12 shadow-[8px_8px_0_theme(colors.slate.900)] flex flex-col justify-between">
            <div>
              <div className="inline-block border-2 border-slate-900 px-3 py-1 font-bold text-xs tracking-widest uppercase bg-slate-900 text-white shadow-[4px_4px_0_#ffffff]">{t('landing.bento.processBadge', 'ПРОЦЕССЫ')}</div>
              <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white mt-6 mb-4 leading-none">{t('landing.bento.processTitle1', 'УМНОЕ')}<br/>{t('landing.bento.processTitle2', 'БРОНИРОВАНИЕ')}</h3>
              <p className="text-blue-100 text-base md:text-lg mb-8 font-medium">{t('landing.bento.processDesc', 'Больше никаких бумажных журналов. Интерактивное расписание, контроль доступов и автоматические уведомления.')}</p>
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

      {/* --- НОВЫЙ БЛОК: ПАРТНЕРЫ (Бегущая строка) --- */}
      <section className="bg-white border-y-4 border-slate-900 py-16 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 mb-10 flex flex-col md:flex-row justify-between items-end gap-4">
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900">
            {t('landing.partners.title', 'НАШИ ПАРТНЕРЫ')}
          </h2>
          <p className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">
            {t('landing.partners.subtitle', 'КОМПАНИИ, КОТОРЫЕ НАМ ДОВЕРЯЮТ')}
          </p>
        </div>

        <div className="relative w-full flex overflow-hidden border-y-4 border-slate-900 bg-slate-50">
          <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

          <div className="flex w-max animate-scroll">
            {[...partners, ...partners].map((partner, i) => (
              <a 
                key={i} 
                href={partner.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center w-48 md:w-64 h-32 px-8 border-r-4 border-slate-900 transition-all hover:bg-slate-100"
              >
                <img 
                  src={partner.logo} 
                  alt={partner.name} 
                  className="max-w-full max-h-16 object-contain opacity-85 group-hover:opacity-100 transition-all duration-300"
                />
                <ExternalLink className="absolute top-3 right-3 w-4 h-4 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* --- 4. МАССИВНЫЙ БЛОК CTA --- */}
      <section className="bg-slate-900 border-b-4 border-slate-900 py-24 md:py-32 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center mix-blend-luminosity" />
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-5xl md:text-8xl font-black uppercase text-white tracking-tighter mb-8 leading-none">{t('landing.cta.title1', 'СДЕЛАЙ СВОЙ')}<br/><span className="text-blue-500">{t('landing.cta.title2', 'ПЕРВЫЙ ШАГ')}</span></h2>
          <p className="text-lg md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto font-medium">
            {t('landing.cta.desc', 'Присоединяйся к сообществу мейкеров, находи команду и создавай проекты, которые изменят мир.')}
          </p>
          <button 
            onClick={() => navigate({ to: "/projects" })}
            className="bg-blue-600 text-white border-4 border-blue-600 px-8 py-5 font-black uppercase tracking-[0.2em] hover:bg-white hover:text-blue-600 hover:border-white transition-colors text-sm md:text-base shadow-[8px_8px_0_#ffffff] hover:shadow-[4px_4px_0_#2563eb] hover:translate-y-1 hover:translate-x-1"
          >
            {t('landing.cta.btn', 'ИСКАТЬ ПРОЕКТЫ')}
          </button>
        </div>
      </section>

      {/* --- 5. ФОТОГАЛЕРЕЯ (Жесткие рамки) --- */}
      <section className="max-w-7xl mx-auto px-6 py-24 z-10 relative">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12 border-b-4 border-slate-900 pb-12">
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900">
            {t('landing.atmosphere.title', 'АТМОСФЕРА')}
          </h2>
          <p className="text-xs md:text-sm font-bold tracking-[0.2em] text-slate-500 uppercase md:text-right max-w-sm leading-relaxed">
            {t('landing.atmosphere.subtitle', 'ТВОРИ. ОШИБАЙСЯ. СОЗДАВАЙ ЗАНОВО.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 relative h-[400px] border-4 border-slate-900 shadow-[8px_8px_0_#2563eb] group overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80" alt="FabLab Working Area" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 bg-blue-600 text-white px-6 py-3 font-black uppercase tracking-widest text-xs border-t-4 border-r-4 border-slate-900">{t('landing.atmosphere.mainHall', 'Главный зал')}</div>
          </div>

          <div className="relative h-[400px] border-4 border-slate-900 shadow-[8px_8px_0_#2563eb] group overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=800&q=80" alt="3D Printing Zone" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 bg-slate-900 text-white px-6 py-3 font-black uppercase tracking-widest text-xs border-t-4 border-r-4 border-slate-900">{t('landing.tech.items.print', '3D Печать')}</div>
          </div>

          <div className="relative h-[320px] border-4 border-slate-900 shadow-[8px_8px_0_#2563eb] group overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80" alt="Teamwork" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 bg-slate-900 text-white px-6 py-3 font-black uppercase tracking-widest text-xs border-t-4 border-r-4 border-slate-900">{t('landing.atmosphere.teams', 'Командная работа')}</div>
          </div>

          <div className="md:col-span-2 relative h-[320px] border-4 border-slate-900 shadow-[8px_8px_0_#2563eb] group overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80" alt="High-tech equipment" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 bg-blue-600 text-white px-6 py-3 font-black uppercase tracking-widest text-xs border-t-4 border-r-4 border-slate-900">{t('landing.atmosphere.cncPark', 'Парк ЧПУ станков')}</div>
          </div>
        </div>
      </section>

      {/* --- 6. ПРЕИМУЩЕСТВА --- */}
      <section className="bg-white border-y-4 border-slate-900 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 mb-6">{t('landing.whyUs.title', 'ПОЧЕМУ МЫ?')}</h2>
            <div className="h-2 w-32 bg-blue-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
            <PerkCard 
              icon={ShieldCheck} 
              title={t('landing.whyUs.safetyTitle', 'БЕЗОПАСНОСТЬ')} 
              desc={t('landing.whyUs.safetyDesc', 'Обязательный инструктаж и контроль доступа к сложному оборудованию.')} 
            />
            <PerkCard 
              icon={Target} 
              title={t('landing.whyUs.precisionTitle', 'ТОЧНОСТЬ')} 
              desc={t('landing.whyUs.precisionDesc', 'Профессиональные станки для реализации инженерных задач любой сложности.')} 
            />
            <PerkCard 
              icon={Users} 
              title={t('landing.whyUs.communityTitle', 'КОМЬЮНИТИ')} 
              desc={t('landing.whyUs.communityDesc', 'Знакомься с единомышленниками, собирай команды и делись опытом.')} 
            />
            <PerkCard 
              icon={Lightbulb} 
              title={t('landing.whyUs.mentorTitle', 'МЕНТОРСТВО')} 
              desc={t('landing.whyUs.mentorDesc', 'Опытные резиденты всегда помогут разобраться с чертежами и настройками.')} 
            />
            <PerkCard 
              icon={Rocket} 
              title={t('landing.whyUs.showcaseTitle', 'ВИТРИНА ПРОЕКТОВ')} 
              desc={t('landing.whyUs.showcaseDesc', 'Публикуй свои стартапы, находи инвесторов и привлекай таланты.')} 
            />
            <PerkCard 
              icon={MapPin} 
              title={t('landing.whyUs.locationTitle', 'ЛОКАЦИЯ')} 
              desc={t('landing.whyUs.locationDesc', 'Находимся в самом центре кампуса Satbayev University.')} 
            />
          </div>
        </div>
      </section>

      {/* --- НОВЫЙ БЛОК 7: ЦУР / SUSTAINABLE DEVELOPMENT GOALS --- */}
      <section className="bg-slate-50 border-b-4 border-slate-900 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-16">
            <div>
              <span className="text-blue-600 font-black tracking-widest text-xs uppercase block mb-2">
                {t('landing.sdg.miniTitle', 'Sustainable Development Goals')}
              </span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900">
                {t('landing.sdg.title', 'Цели устойчивого развития (ЦУР)')}
              </h2>
            </div>
            <p className="text-xs md:text-sm font-bold tracking-[0.2em] text-slate-500 uppercase md:text-right max-w-md leading-relaxed">
              {t('landing.sdg.subtitle', 'FabLab Satbayev активно поддерживает глобальную стратегию университета в рамках инициатив ООН')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* СDG 4 - Качественное образование */}
            <div className="bg-white border-4 border-slate-900 p-6 md:p-8 shadow-[6px_6px_0_#0f172a] relative overflow-hidden group hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0_#0f172a] transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-[#C5192D] text-white flex items-center justify-center font-black text-3xl border-l-4 border-b-4 border-slate-900 shadow-[inset_-4px_-4px_0_rgba(0,0,0,0.15)]">
                4
              </div>
              <div className="pr-14">
                <span className="text-[#C5192D] font-black text-[10px] uppercase tracking-widest block mb-1">{t('landing.sdg.goal4.badge', 'Качественное образование')}</span>
                <h4 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 mb-4">{t('landing.sdg.goal4.title', 'Quality Education')}</h4>
                <p className="text-slate-600 font-medium text-xs md:text-sm leading-relaxed">
                  {t('landing.sdg.goal4.desc', 'Обеспечиваем открытый доступ к цифровому производству. Обучаем студентов практической инженерии, прототипированию и работе на промышленном оборудовании.')}
                </p>
              </div>
            </div>

            {/* SDG 7 - Чистая энергия */}
            <div className="bg-white border-4 border-slate-900 p-6 md:p-8 shadow-[6px_6px_0_#0f172a] relative overflow-hidden group hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0_#0f172a] transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-[#FFB314] text-slate-900 flex items-center justify-center font-black text-3xl border-l-4 border-b-4 border-slate-900 shadow-[inset_-4px_-4px_0_rgba(0,0,0,0.1)]">
                7
              </div>
              <div className="pr-14">
                <span className="text-[#D49000] font-black text-[10px] uppercase tracking-widest block mb-1">{t('landing.sdg.goal7.badge', 'Чистая энергия')}</span>
                <h4 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 mb-4">{t('landing.sdg.goal7.title', 'Affordable & Clean Energy')}</h4>
                <p className="text-slate-600 font-medium text-xs md:text-sm leading-relaxed">
                  {t('landing.sdg.goal7.desc', 'Стимулируем разработку студенческих проектов в сфере GreenTech. Помогаем собирать прототипы энергоэффективных систем и возобновляемых источников.')}
                </p>
              </div>
            </div>

            {/* SDG 9 - Инновации и Инфраструктура */}
            <div className="bg-white border-4 border-slate-900 p-6 md:p-8 shadow-[6px_6px_0_#0f172a] relative overflow-hidden group hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0_#0f172a] transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-[#F26A2E] text-white flex items-center justify-center font-black text-3xl border-l-4 border-b-4 border-slate-900 shadow-[inset_-4px_-4px_0_rgba(0,0,0,0.15)]">
                9
              </div>
              <div className="pr-14">
                <span className="text-[#F26A2E] font-black text-[10px] uppercase tracking-widest block mb-1">{t('landing.sdg.goal9.badge', 'Инновации и инфраструктура')}</span>
                <h4 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 mb-4">{t('landing.sdg.goal9.title', 'Industry & Innovation')}</h4>
                <p className="text-slate-600 font-medium text-xs md:text-sm leading-relaxed">
                  {t('landing.sdg.goal9.desc', 'Развиваем надежную hardware-инфраструктуру для стартапов. Помогаем трансформировать теоретические идеи в готовые к рынку технологические продукты.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

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