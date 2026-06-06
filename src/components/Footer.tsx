import { useState } from "react";
import { Wrench, Phone, Mail, MapPin, X, Send, Code2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <footer className="bg-slate-900 border-t-8 border-blue-600 pt-20 pb-10 relative mt-auto shrink-0">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          
          {/* Колонка 1: Логотип и описание */}
          <div>
            <div className="flex items-center gap-3 text-2xl font-black uppercase text-white mb-6 tracking-tighter">
              <div className="w-10 h-10 bg-blue-600 flex items-center justify-center border-2 border-white">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              FABLAB
            </div>
            <p className="text-slate-400 text-sm font-bold tracking-widest uppercase leading-relaxed max-w-xs">
              {t('landing.footer.desc', 'Платформа для бронирования оборудования и поиска проектов.')}
            </p>
          </div>
          
          {/* Колонка 2: Контакты */}
          <div className="flex flex-col gap-4 text-sm font-bold tracking-widest uppercase text-slate-400">
            <h4 className="text-white mb-2">{t('landing.footer.contacts', 'КОНТАКТЫ')}</h4>
            <a href="#" className="hover:text-blue-400 flex items-center gap-3 transition-colors">
              <Phone className="w-5 h-5 text-slate-600" /> +7 (700) 000-00-00
            </a>
            <a href="mailto:fablab@satbayev.university" className="hover:text-blue-400 flex items-center gap-3 transition-colors">
              <Mail className="w-5 h-5 text-slate-600" /> fablab@satbayev.university
            </a>
          </div>
          
          {/* Колонка 3: Адрес */}
          <div className="flex flex-col gap-4 text-sm font-bold tracking-widest uppercase text-slate-400">
            <h4 className="text-white mb-2">{t('landing.footer.address', 'АДРЕС')}</h4>
            <p className="flex items-start gap-3">
              <MapPin className="w-5 h-5 shrink-0 mt-1 text-slate-600" /> 
              <span>{t('landing.footer.addressValue1', 'Ул. Сатпаева 22, Алматы')}<br/>{t('landing.footer.addressValue2', 'Главный учебный корпус')}</span>
            </p>
          </div>

        </div>
        
        {/* Нижняя панель */}
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-600 font-bold tracking-widest uppercase text-xs border-t-2 border-slate-800 pt-8">
          
          <div className="text-center md:text-left mb-2 md:mb-0 text-sm md:text-xs">
            © {new Date().getFullYear()} FABLAB SATBAYEV.
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="group w-full md:w-auto flex items-center justify-center md:justify-start gap-4 bg-slate-800 border-2 border-slate-700 p-3 sm:p-4 pr-6 sm:pr-8 hover:border-blue-500 transition-all shadow-[4px_4px_0_#0f172a] hover:shadow-[4px_4px_0_#3b82f6] hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-y-0 active:translate-x-0 active:shadow-none"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 flex items-center justify-center border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] shrink-0 group-hover:scale-105 transition-transform duration-300">
              <Code2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="text-left flex flex-col justify-center">
              <span className="block text-[10px] sm:text-xs text-slate-400 mb-1 uppercase tracking-widest leading-none">
                {t('creators.btnPre', 'Разработка платформы')}
              </span>
              <span className="block text-xs sm:text-sm text-white font-black uppercase tracking-widest leading-none">
                {t('creators.btnMain', 'О создателях проекта')}
              </span>
            </div>
          </button>

        </div>
      </footer>

      {/* МОДАЛЬНОЕ ОКНО */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
          
          <div className="bg-white border-4 border-slate-900 shadow-[12px_12px_0_#2563eb] max-w-3xl w-full relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-5 md:p-6 border-b-4 border-slate-900 bg-[#FAFAFA] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 flex items-center justify-center border-2 border-slate-900 shadow-[2px_2px_0_#0f172a]">
                  <Code2 className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-black text-xl md:text-2xl uppercase tracking-tighter text-slate-900 leading-none mt-1">
                  {t('creators.modalTitle', 'О создателях')}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-10 h-10 flex items-center justify-center border-2 border-transparent hover:border-slate-900 hover:bg-slate-100 transition-all text-slate-500 hover:text-slate-900"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 md:p-10 overflow-y-auto bg-white">
              <div className="border-4 border-slate-900 p-5 sm:p-6 md:p-10 bg-[#FAFAFA] shadow-[4px_4px_0_#2563eb] sm:shadow-[6px_6px_0_#2563eb] relative">
                
                <div className="absolute -top-6 -left-6 w-12 h-12 md:w-14 md:h-14 bg-blue-600 border-4 border-slate-900 flex items-center justify-center shadow-[4px_4px_0_#0f172a] hidden sm:flex">
                  <Users className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>

                <h4 className="font-black text-2xl sm:text-3xl md:text-4xl uppercase tracking-tighter text-slate-900 mb-6 sm:mb-8 mt-1 sm:mt-2">
                  {t('creators.heading', 'Мы — Амира и Расул')}
                </h4>
                
                <div className="space-y-6 text-lg sm:text-xl font-medium text-slate-900 leading-[1.6] sm:leading-[1.7]">
                  <p>
                    {t('creators.p1', 'Создатели')} <span className="font-black text-blue-600 uppercase tracking-wide">«ASIR»</span>.
                  </p>
                  <p>
                    {t('creators.p2', 'Наша цель — разрабатывать удобные системы бронирования и цифровые решения для самых разных сфер. Мы изучаем, как пользователи взаимодействуют с сервисами, и создаём инструменты, которые делают процесс простым, быстрым и понятным.')}
                  </p>
                  <p>
                    {t('creators.p3_start', 'Система бронирования')} <span className="font-bold border-b-2 border-blue-600">Satbayev FabLab</span> {t('creators.p3_middle', 'является одним из примеров нашей работы. Проект появился как студенческая инициатива во время обучения в')} <span className="font-black">inVision U</span> {t('creators.p3_end', 'и со временем превратился в полноценный продукт.')}
                  </p>
                  <p>
                    <span className="font-black text-blue-600 uppercase tracking-wide">«ASIR»</span> {t('creators.p4', '— независимый проект, который был полностью придуман и разработан нашей командой.')}
                  </p>
                </div>

                <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t-4 border-slate-900">
                  <h5 className="font-black text-sm sm:text-base uppercase tracking-widest text-slate-900 mb-5 sm:mb-6 text-center sm:text-left">
                    {t('creators.contacts', 'Связаться с нами')}
                  </h5>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <a href="https://t.me/iamkofein" target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2.5 bg-blue-600 text-white border-2 border-slate-900 py-4 sm:py-3.5 font-bold text-xs sm:text-sm tracking-widest uppercase hover:bg-slate-900 transition-all shadow-[4px_4px_0_#0f172a] hover:shadow-none hover:translate-y-1 hover:translate-x-1">
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" /> Telegram
                    </a>
                    
                    <a href="mailto:rasul.kapash@invisionu.education" className="flex-1 flex items-center justify-center gap-2.5 bg-white text-slate-900 border-2 border-slate-900 py-4 sm:py-3.5 font-bold text-xs sm:text-sm tracking-widest uppercase hover:bg-slate-100 transition-all shadow-[4px_4px_0_#0f172a] hover:shadow-none hover:translate-y-1 hover:translate-x-1">
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5" /> Email
                    </a>

                    <a href="tel:+77080781410" className="flex-1 flex items-center justify-center gap-2.5 bg-white text-slate-900 border-2 border-slate-900 py-4 sm:py-3.5 font-bold text-xs sm:text-sm tracking-widest uppercase hover:bg-slate-100 transition-all shadow-[4px_4px_0_#0f172a] hover:shadow-none hover:translate-y-1 hover:translate-x-1">
                      <Phone className="w-4 h-4 sm:w-5 sm:h-5" /> Phone
                    </a>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}