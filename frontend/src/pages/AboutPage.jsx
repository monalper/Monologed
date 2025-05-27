// src/pages/AboutPage.jsx
import React from 'react';
// <<< YENİ: Eksik ikonlar import edildi >>>
import { FaInfoCircle, FaList, FaEye, FaUsers, FaFileImport, FaEnvelope, FaStar, FaRegClock } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-gray-800 dark:text-gray-200">
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg shadow-md p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-center mb-6 flex items-center justify-center">
          <FaInfoCircle className="mr-3 text-cyan-500" /> {t('about_page_title')}
        </h1>

        <p className="text-lg text-center text-gray-600 dark:text-gray-400 mb-8">
          {t('about_page_description')}
        </p>

        <h2 className="text-2xl font-semibold mb-4">{t('about_page_features_title')}</h2>
        {/* Özellikler listesi */}
        <ul className="list-disc list-inside space-y-2 mb-8 text-gray-700 dark:text-gray-300">
          {/* <<< Hata Düzeltildi: FaStar artık import edildi >>> */}
          <li className="flex items-start"><FaEye className="w-4 h-4 mr-2 mt-1 text-green-500 flex-shrink-0"/> {t('about_page_feature_log')}</li>
          <li className="flex items-start"><FaStar className="w-4 h-4 mr-2 mt-1 text-yellow-500 flex-shrink-0"/> {t('about_page_feature_rate')}</li>
          <li className="flex items-start"><FaList className="w-4 h-4 mr-2 mt-1 text-blue-500 flex-shrink-0"/> {t('about_page_feature_lists')}</li>
          <li className="flex items-start"><FaRegClock className="w-4 h-4 mr-2 mt-1 text-purple-500 flex-shrink-0"/> {t('about_page_feature_watchlist')}</li>
          <li className="flex items-start"><FaUsers className="w-4 h-4 mr-2 mt-1 text-pink-500 flex-shrink-0"/> {t('about_page_feature_follow')}</li>
          <li className="flex items-start"><FaFileImport className="w-4 h-4 mr-2 mt-1 text-orange-500 flex-shrink-0"/> {t('about_page_feature_import')}</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4">{t('about_page_contact_title')}</h2>
        <p className="text-gray-700 dark:text-gray-300 flex items-center">
          <FaEnvelope className="w-4 h-4 mr-2 mt-0.5 text-gray-500" /> {t('about_page_contact_text')}
        </p>
        {/* <a href="mailto:info@monologed.com" className="text-blue-600 dark:text-blue-400 hover:underline">info@monologed.com</a> */}
      </div>
    </div>
  );
}

export default AboutPage;
