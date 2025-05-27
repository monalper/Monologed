// src/pages/PrivacyPage.jsx
import React from 'react';
import { FaShieldAlt } from 'react-icons/fa';
// <<< YENİ: useTranslation import edildi (i18n kullanımı için) >>>
import { useTranslation } from 'react-i18next';

function PrivacyPage() {
  // <<< YENİ: i18n eklendi >>>
  const { t, i18n } = useTranslation();
  // <<< GÜNCELLEME: i18n.language kullanıldı >>>
  const lastUpdatedDate = new Date().toLocaleDateString(i18n.language);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-gray-800 dark:text-gray-200">
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg shadow-md p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-center mb-4 flex items-center justify-center">
          <FaShieldAlt className="mr-3 text-cyan-500" /> {t('privacy_page_title')}
        </h1>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">
          {t('privacy_page_last_updated', { date: lastUpdatedDate })}
        </p>

        <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
          <p>{t('privacy_page_content_placeholder')}</p>
          {/* Örnek Başlıklar */}
          {/* <h2>1. Topladığımız Bilgiler</h2> <p>...</p> */}
          {/* <h2>2. Bilgileri Nasıl Kullanıyoruz</h2> <p>...</p> */}
          {/* <h2>3. Veri Güvenliği</h2> <p>...</p> */}
          {/* ... diğer bölümler ... */}
        </div>
      </div>
    </div>
  );
}

export default PrivacyPage;
