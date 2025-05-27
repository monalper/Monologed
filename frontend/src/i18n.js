// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Dil çeviri dosyalarını import et (şimdilik boş olabilirler)
import translationEN from './locales/en/translation.json';
import translationTR from './locales/tr/translation.json';

const resources = {
  en: {
    translation: translationEN
  },
  tr: {
    translation: translationTR
  }
};

i18n
  // Tarayıcı dilini algılama eklentisini kullan
  .use(LanguageDetector)
  // i18n örneğini react-i18next'e geçir
  .use(initReactI18next)
  // i18n'i başlat
  .init({
    resources, // Çeviri kaynakları
    fallbackLng: 'en', // Eğer algılanan dil yoksa varsayılan dil
    debug: true, // Geliştirme sırasında konsola log basar (production'da false yapın)
    interpolation: {
      escapeValue: false, // React zaten XSS'e karşı koruduğu için gereksiz
    },
    detection: {
      // Dil algılama sırası ve yöntemleri
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'], // Algılanan dili localStorage'da sakla
    }
  });

export default i18n;
