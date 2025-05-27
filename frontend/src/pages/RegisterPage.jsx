// src/pages/RegisterPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';
// FaUserPlus ikonu kaldırıldı, logo eklenecek
import { useTranslation } from 'react-i18next';
// Logo import edildi
import siteLogo from '../assets/logedelements/logo.png';

function RegisterPage() {
  const { t } = useTranslation();

  return (
    // Sayfayı dikeyde ortala, siyah arka plan
    <div className="flex min-h-[calc(100vh-150px)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* İçerik Konteyneri */}
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
            <img src={siteLogo} alt="Monologed Logo" className="h-12 w-auto" /> {/* Yüksekliği ayarlayabilirsiniz */}
        </div>

        {/* Başlık ve Giriş Linki */}
        <div>
          <h2 className="text-center text-2xl font-bold text-white">
            {t('register_title', 'Create a new account')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            {t('register_or', 'Or')}{' '}
            <Link to="/login" className="font-medium text-blue-500 hover:text-blue-400">
              {t('register_login_link', 'sign in to your existing account')}
            </Link>
          </p>
        </div>

        {/* Kayıt Formu */}
        {/* Kart yapısı kaldırıldı */}
        <RegisterForm />

      </div>
    </div>
  );
}

export default RegisterPage;
