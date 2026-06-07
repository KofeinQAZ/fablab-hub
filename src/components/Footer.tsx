import { Wrench, Phone, Mail, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
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
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-slate-600 font-bold tracking-widest uppercase text-xs border-t-2 border-slate-800 pt-8">
        <div>
          © {new Date().getFullYear()} FABLAB SATBAYEV.
        </div>
        <div>
          MADE BY ASIR
        </div>
      </div>
    </footer>
  );
}