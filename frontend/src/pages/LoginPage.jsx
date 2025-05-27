// src/pages/LoginPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { useTranslation } from 'react-i18next';
// <<< YENİ: Logo import edildi >>>
import siteLogo from '../assets/logedelements/logo.png';

// Logo için placeholder bileşeni kaldırıldı
// const SiteLogoPlaceholder = () => (
//     <div className="mx-auto h-20 w-40 bg-gray-700 flex items-center justify-center text-gray-400 text-sm font-semibold rounded mb-8">
//         SİTE LOGOSU
//     </div>
// );

function LoginPage() {
  const { t } = useTranslation();

  return (
    // Sayfayı dikeyde ortala, siyah arka plan (body'den gelir varsayımı)
    <div className="flex min-h-[calc(100vh-150px)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* İçerik Konteyneri */}
      <div className="w-full max-w-sm space-y-8">
        {/* <<< GÜNCELLEME: Gerçek logo eklendi >>> */}
        <div className="flex justify-center mb-8">
            <img src={siteLogo} alt="Monologed Logo" className="h-12 w-auto" /> {/* Yüksekliği ayarlayabilirsiniz */}
        </div>
        {/* <<< GÜNCELLEME SONU >>> */}

        {/* Başlık ve Kayıt Linki */}
        <div>
          <h2 className="text-center text-2xl font-bold text-white">
            {t('login_title', 'Sign in to your account')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            {t('login_or', 'Or')}{' '}
            <Link to="/register" className="font-medium text-blue-500 hover:text-blue-400">
              {t('login_register_link', 'create a new account')}
            </Link>
          </p>
        </div>

        {/* Giriş Formu */}
        <LoginForm />

      </div>
    </div>
  );
}
export default LoginPage;
