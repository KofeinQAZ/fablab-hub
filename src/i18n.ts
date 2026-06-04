import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ru from './locales/ru.json';
import kz from './locales/kz.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector) // Автоматически определяет язык браузера пользователя
  .use(initReactI18next) // Передает инстанс i18n в react-i18next
  .init({
    resources: {
      ru: { translation: ru },
      kz: { translation: kz },
      en: { translation: en }
    },
    fallbackLng: 'ru', // Язык, который включится, если что-то пойдет не так
    interpolation: {
      escapeValue: false // React уже сам защищает от XSS, так что отключаем
    }
  });

export default i18n;