import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  ChevronRight, Cpu, Wrench, Lightbulb, MapPin, 
  Mail, Phone, Printer, Rocket, ShieldCheck, 
  Users, Zap, Target, Layers, ExternalLink, Code2, Send, X
} from "lucide-react";
import mitLogo from "/fablab-mit-logo.png";
import buildingPhoto from "@/assets/fablab-building.webp";
import { Button } from "@/components/ui/button";
import { LabExperience } from "@/components/lab-experience";
import { AtmosphereCarousel } from "@/components/atmosphere-carousel";

export const Route = createFileRoute("/_public/")({
  component: LandingPage,
});

function LandingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const partners = [
    { name: "Satbayev University", logo: "/partners/logo_eng.png", url: "https://satbayev.university/" },
    { name: "Chevron", logo: "/partners/Chevron.png", url: "https://www.chevron.com" },
    { name: "Fab Foundation", logo: "/partners/Fablabfound.jpg", url: "https://fabfoundation.org" },
    { name: "Astana Hub", logo: "/partners/Astanahub.avif", url: "https://astanahub.com" },
  ];

  return (
    <div className="relative min-h-screen bg-background font-sans overflow-hidden selection:bg-primary selection:text-primary-foreground">
      
      <section className="landing-hero">
        <div className="landing-hero-container">
        <div className="landing-hero-heading">
          <div>
            <h1 className="landing-hero-title"><span>FABLAB</span><span>SATBAYEV</span></h1>
          </div>
          <p className="landing-hero-intro">{t("booking.map.heroText")}</p>
        </div>
        <div className="landing-hero-scene">
          <img src={buildingPhoto} alt="FabLab Satbayev" width={1920} height={439} fetchPriority="high" className="landing-hero-photo" />
        <div className="landing-hero-action">
          <p className="landing-hero-caption">{t("landing.hero.ctaDesc")}</p>
          <div className="landing-hero-buttons">
            <Button onClick={() => document.getElementById("booking-book")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })} className="landing-hero-button landing-hero-button-primary">
              {t("booking.book.workshopBtn")}<ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/print-3d" })} className="landing-hero-button landing-hero-button-secondary">
              <Printer className="h-4 w-4 shrink-0" />{t("booking.book.printTitle")}
            </Button>
          </div>
        </div>
        </div>
        </div>
      </section>
      <LabExperience />
      <AtmosphereCarousel />

      {/* --- 3. BENTO GRID (Журнальные карточки) --- */}
      <section className="max-w-7xl mx-auto px-6 pb-12 md:pb-16 z-10 relative">
        <div className="grid grid-cols-1 gap-6">
          
          <div className="bg-landing-action text-landing-action-foreground border-y-2 border-foreground p-6 md:p-10 grid items-center gap-8 md:grid-cols-[1fr_280px]">
            <div>
              <div className="inline-block border-2 border-foreground px-3 py-1 font-bold text-xs tracking-normal uppercase bg-foreground text-primary-foreground shadow-[4px_4px_0_var(--foreground)]">{t('landing.bento.mitBadge', 'СОТРУДНИЧЕСТВО')}</div>
              <h3 className="text-3xl md:text-4xl font-black uppercase tracking-normal text-primary-foreground mt-6 mb-4 leading-none">{t('landing.bento.mitTitle1', 'ПРИ ПОДДЕРЖКЕ')}<br/>{t('landing.bento.mitTitle2', 'MIT')}</h3>
              <p className="text-landing-action-foreground text-base md:text-lg font-medium">{t('landing.bento.mitDesc', 'FabLab Satbayev — часть глобальной сети fabrication laboratories, работающей при поддержке и в сотрудничестве с MIT.')}</p>
            </div>
            <div className="relative h-48 bg-card flex items-center justify-center p-6">
               <img src={mitLogo} alt={t('landing.bento.mitLogoAlt', 'Fab Lab MIT')} className="w-full h-full max-h-[180px] object-contain" />
            </div>
          </div>

        </div>
      </section>

      {/* --- НОВЫЙ БЛОК: ПАРТНЕРЫ (Бегущая строка) --- */}
      <section className="bg-card border-y-4 border-foreground py-16 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 mb-10 flex flex-col md:flex-row justify-between items-end gap-4">
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-normal text-foreground">
            {t('landing.partners.title', 'НАШИ ПАРТНЕРЫ')}
          </h2>
          <p className="text-xs font-bold tracking-normal text-muted-foreground uppercase">
            {t('landing.partners.subtitle', 'КОМПАНИИ, КОТОРЫЕ НАМ ДОВЕРЯЮТ')}
          </p>
        </div>

        <div className="relative w-full flex overflow-hidden border-y-4 border-foreground bg-background">
          <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

          <div className="flex w-max animate-scroll">
            {[...partners, ...partners].map((partner, i) => (
              <a 
                key={i} 
                href={partner.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center w-48 md:w-64 h-32 px-8 border-r-4 border-foreground transition-all hover:bg-muted"
              >
                <img 
                  src={partner.logo} 
                  alt={partner.name} 
                  className="max-w-full max-h-16 object-contain opacity-85 group-hover:opacity-100 transition-all duration-300"
                />
                <ExternalLink className="absolute top-3 right-3 w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* --- 6. ПРЕИМУЩЕСТВА --- */}
      <section className="bg-card border-y-4 border-foreground py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-normal text-foreground mb-6">{t('landing.whyUs.title', 'ПОЧЕМУ МЫ?')}</h2>
            <div className="h-2 w-32 bg-landing-action" />
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

      {/* --- 7. ЦУР / SUSTAINABLE DEVELOPMENT GOALS --- */}
      <section className="bg-background border-b-4 border-foreground py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-16">
            <div>
              <span className="text-primary font-black tracking-normal text-xs uppercase block mb-2">
                {t('landing.sdg.miniTitle', 'Sustainable Development Goals')}
              </span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-normal text-foreground">
                {t('landing.sdg.title', 'Цели устойчивого развития (ЦУР)')}
              </h2>
            </div>
            <p className="text-sm md:text-base font-bold tracking-normal text-muted-foreground uppercase md:text-right max-w-md leading-relaxed">
              {t('landing.sdg.subtitle', 'FabLab Satbayev активно поддерживает глобальную стратегию университета в рамках инициатив ООН')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* СDG 4 */}
            <div className="bg-card border-4 border-foreground p-6 md:p-8 shadow-[6px_6px_0_var(--foreground)] relative overflow-hidden group hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0_var(--foreground)] transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-destructive text-primary-foreground flex items-center justify-center font-black text-3xl border-l-4 border-b-4 border-foreground shadow-[inset_-4px_-4px_0_rgba(0,0,0,0.15)]">
                4
              </div>
              <div className="pr-14">
                <span className="text-destructive font-black text-xs uppercase tracking-normal block mb-1">{t('landing.sdg.goal4.badge', 'Качественное образование')}</span>
                <h4 className="text-xl md:text-2xl font-black uppercase tracking-normal text-foreground mb-4">{t('landing.sdg.goal4.title', 'Quality Education')}</h4>
                <p className="text-muted-foreground font-medium text-sm md:text-base leading-relaxed">
                  {t('landing.sdg.goal4.desc', 'Обеспечиваем открытый доступ к цифровому производству. Обучаем студентов практической инженерии, прототипированию и работе на промышленном оборудовании.')}
                </p>
              </div>
            </div>

            {/* SDG 7 */}
            <div className="bg-card border-4 border-foreground p-6 md:p-8 shadow-[6px_6px_0_var(--foreground)] relative overflow-hidden group hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0_var(--foreground)] transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-zone-yellow text-foreground flex items-center justify-center font-black text-3xl border-l-4 border-b-4 border-foreground shadow-[inset_-4px_-4px_0_rgba(0,0,0,0.1)]">
                7
              </div>
              <div className="pr-14">
                <span className="text-foreground font-black text-xs uppercase tracking-normal block mb-1">{t('landing.sdg.goal7.badge', 'Чистая энергия')}</span>
                <h4 className="text-xl md:text-2xl font-black uppercase tracking-normal text-foreground mb-4">{t('landing.sdg.goal7.title', 'Affordable & Clean Energy')}</h4>
                <p className="text-muted-foreground font-medium text-sm md:text-base leading-relaxed">
                  {t('landing.sdg.goal7.desc', 'Стимулируем разработку студенческих проектов в сфере GreenTech. Помогаем собирать прототипы энергоэффективных систем и возобновляемых источников.')}
                </p>
              </div>
            </div>

            {/* SDG 9 */}
            <div className="bg-card border-4 border-foreground p-6 md:p-8 shadow-[6px_6px_0_var(--foreground)] relative overflow-hidden group hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0_var(--foreground)] transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-zone-yellow text-primary-foreground flex items-center justify-center font-black text-3xl border-l-4 border-b-4 border-foreground shadow-[inset_-4px_-4px_0_rgba(0,0,0,0.15)]">
                9
              </div>
              <div className="pr-14">
                <span className="text-[#F26A2E] font-black text-xs uppercase tracking-normal block mb-1">{t('landing.sdg.goal9.badge', 'Инновации и инфраструктура')}</span>
                <h4 className="text-xl md:text-2xl font-black uppercase tracking-normal text-foreground mb-4">{t('landing.sdg.goal9.title', 'Industry & Innovation')}</h4>
                <p className="text-muted-foreground font-medium text-sm md:text-base leading-relaxed">
                  {t('landing.sdg.goal9.desc', 'Развиваем надежную hardware-инфраструктуру для стартапов. Помогаем трансформировать теоретические идеи в готовые к рынку технологические продукты.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- НОВЫЙ БЛОК 8: ASIR TEAM (О РАЗРАБОТЧИКАХ) --- */}
      <section className="bg-muted border-b-4 border-foreground py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(var(--foreground)_2px,transparent_2px)] [background-size:32px_32px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="bg-card border-4 border-foreground shadow-[12px_12px_0_var(--primary)] flex flex-col md:flex-row items-stretch">
            
            <div className="w-full md:w-2/5 border-b-4 md:border-b-0 md:border-r-4 border-foreground relative bg-muted group p-6 flex flex-col items-center justify-center min-h-[350px] md:min-h-[450px]">
              
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                 <Users className="w-16 h-16 mb-4 opacity-50" />
                 <span className="font-black uppercase tracking-normal text-xs border-2 border-border border-dashed px-4 py-2 bg-card/50 backdrop-blur-sm">
                   {t('creators.photoPlaceholder', 'МЕСТО ДЛЯ ВАШЕГО ФОТО')}
                 </span>
              </div>
              
              {<img src="/asir-team.png" alt="ASIR Team" className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 z-10" />}

              <div className="absolute bottom-6 right-6 z-20 bg-zone-yellow border-4 border-foreground px-4 py-2 shadow-[4px_4px_0_var(--foreground)] transform rotate-[-3deg]">
                <span className="font-black text-foreground uppercase tracking-normal text-lg sm:text-xl">ASIR TEAM</span>
              </div>
            </div>

            <div className="w-full md:w-3/5 p-8 md:p-12 flex flex-col justify-center">
              <div className="mb-6">
                <span className="inline-block bg-foreground text-primary-foreground font-black text-xs uppercase tracking-normal px-3 py-1 border-2 border-foreground shadow-[2px_2px_0_var(--primary)] mb-4">
                  {t('creators.btnPre', 'РАЗРАБОТКА ПЛАТФОРМЫ')}
                </span>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-normal text-foreground leading-[0.9]">
                  {t('creators.needSystem1', 'НУЖНА ТАКАЯ ЖЕ')} <br/> 
                  <span className="text-primary">{t('creators.needSystem2', 'СИСТЕМА?')}</span>
                </h2>
              </div>
              
              <p className="text-muted-foreground font-medium text-base md:text-lg leading-relaxed mb-8">
                {t('creators.p2', 'Наша цель — разрабатывать удобные системы бронирования и цифровые решения для самых разных сфер. Мы проектируем и запускаем мощные цифровые продукты, делая процессы простыми и понятными.')}
              </p>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="group flex items-center justify-center gap-4 bg-foreground text-primary-foreground border-4 border-foreground px-8 py-4 hover:bg-landing-action transition-colors shadow-[6px_6px_0_var(--primary)] hover:shadow-[2px_2px_0_var(--foreground)] hover:translate-y-1 hover:translate-x-1 w-full sm:w-max"
              >
                <Code2 className="w-5 h-5" />
                <span className="font-black uppercase tracking-normal text-xs sm:text-sm">
                  {t('creators.contacts', 'СВЯЗАТЬСЯ С НАМИ')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================= */}
      {/* МОДАЛЬНОЕ ОКНО РАЗРАБОТЧИКОВ (ПЕРЕНЕСЛИ СЮДА ИЗ ФУТЕРА) */}
      {/* ========================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-foreground/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
          
          <div className="bg-card border-4 border-foreground shadow-[12px_12px_0_var(--primary)] max-w-3xl w-full relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-5 md:p-6 border-b-4 border-foreground bg-background shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-landing-action flex items-center justify-center border-2 border-foreground shadow-[2px_2px_0_var(--foreground)]">
                  <Code2 className="w-4 h-4 text-primary-foreground" />
                </div>
                <h3 className="font-black text-xl md:text-2xl uppercase tracking-normal text-foreground leading-none mt-1">
                  {t('creators.modalTitle', 'О создателях')}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-10 h-10 flex items-center justify-center border-2 border-transparent hover:border-foreground hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 md:p-10 overflow-y-auto bg-card">
              <div className="border-4 border-foreground p-5 sm:p-6 md:p-10 bg-background shadow-[4px_4px_0_var(--primary)] sm:shadow-[6px_6px_0_var(--primary)] relative">
                
                <div className="absolute -top-6 -left-6 w-12 h-12 md:w-14 md:h-14 bg-landing-action border-4 border-foreground flex items-center justify-center shadow-[4px_4px_0_var(--foreground)] hidden sm:flex">
                  <Users className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground" />
                </div>

                <h4 className="font-black text-2xl sm:text-3xl md:text-4xl uppercase tracking-normal text-foreground mb-6 sm:mb-8 mt-1 sm:mt-2">
                  {t('creators.heading', 'Мы — Амира и Расул')}
                </h4>
                
                <div className="space-y-6 text-lg sm:text-xl font-medium text-foreground leading-[1.6] sm:leading-[1.7]">
                  <p>
                    {t('creators.p1', 'Создатели')} <span className="font-black text-primary uppercase tracking-normal">«ASIR»</span>.
                  </p>
                  <p>
                    {t('creators.p2', 'Наша цель — разрабатывать удобные системы бронирования и цифровые решения для самых разных сфер. Мы изучаем, как пользователи взаимодействуют с сервисами, и создаём инструменты, которые делают процесс простым, быстрым и понятным.')}
                  </p>
                  <p>
                    {t('creators.p3_start', 'Система бронирования')} <span className="font-bold border-b-2 border-primary">Satbayev FabLab</span> {t('creators.p3_middle', 'является одним из примеров нашей работы. Проект появился как студенческая инициатива во время обучения в')} <span className="font-black">inVision U</span> {t('creators.p3_end', 'и со временем превратился в полноценный продукт.')}
                  </p>
                  <p>
                    <span className="font-black text-primary uppercase tracking-normal">«ASIR»</span> {t('creators.p4', '— независимый проект, который был полностью придуман и разработан нашей командой.')}
                  </p>
                </div>

                <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t-4 border-foreground">
                  <h5 className="font-black text-sm sm:text-base uppercase tracking-normal text-foreground mb-5 sm:mb-6 text-center sm:text-left">
                    {t('creators.contacts', 'Связаться с нами')}
                  </h5>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <a href="https://t.me/iamkofein" target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2.5 bg-landing-action text-primary-foreground border-2 border-foreground py-4 sm:py-3.5 font-bold text-xs sm:text-sm tracking-normal uppercase hover:bg-foreground transition-all shadow-[4px_4px_0_var(--foreground)] hover:shadow-none hover:translate-y-1 hover:translate-x-1">
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" /> Telegram
                    </a>
                    
                    <a href="mailto:rasul.kapash@invisionu.education" className="flex-1 flex items-center justify-center gap-2.5 bg-card text-foreground border-2 border-foreground py-4 sm:py-3.5 font-bold text-xs sm:text-sm tracking-normal uppercase hover:bg-muted transition-all shadow-[4px_4px_0_var(--foreground)] hover:shadow-none hover:translate-y-1 hover:translate-x-1">
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5" /> Email
                    </a>

                    <a href="tel:+77080781410" className="flex-1 flex items-center justify-center gap-2.5 bg-card text-foreground border-2 border-foreground py-4 sm:py-3.5 font-bold text-xs sm:text-sm tracking-normal uppercase hover:bg-muted transition-all shadow-[4px_4px_0_var(--foreground)] hover:shadow-none hover:translate-y-1 hover:translate-x-1">
                      <Phone className="w-4 h-4 sm:w-5 sm:h-5" /> Phone
                    </a>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <div className="inline-block border-2 border-foreground px-3 py-1 font-bold text-xs tracking-normal uppercase bg-landing-action text-primary-foreground shadow-[4px_4px_0_var(--foreground)]">
      {text}
    </div>
  );
}

function PerkCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex flex-col">
      <div className="w-16 h-16 bg-background border-4 border-foreground flex items-center justify-center mb-6 shadow-[4px_4px_0_var(--primary)]">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h4 className="text-2xl font-black uppercase tracking-normal text-foreground mb-3">{title}</h4>
      <p className="text-muted-foreground font-medium leading-relaxed">{desc}</p>
    </div>
  );
}