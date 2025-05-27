// src/pages/AuthOptionsPage.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaGithub } from 'react-icons/fa';
import siteLogo from '../assets/logedelements/logo.png';
// <<< YENİ: useTranslation import edildi >>>
import { useTranslation } from 'react-i18next';

// GitHub OAuth için gerekli ortam değişkenlerini import et
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
const GITHUB_CALLBACK_URL = import.meta.env.VITE_GITHUB_CALLBACK_URL || 'http://localhost:5000/api/users/auth/github/callback';

function AuthOptionsPage() {
    // <<< YENİ: t fonksiyonu alındı >>>
    const { t } = useTranslation();
    const navigate = useNavigate();

    // GitHub ile giriş fonksiyonu
    const handleGitHubLogin = () => {
        if (!GITHUB_CLIENT_ID || !GITHUB_CALLBACK_URL) {
            console.error("GitHub OAuth yapılandırması eksik.");
            // <<< GÜNCELLEME: Alert metni çevrildi >>>
            alert(t('auth_options_github_error_alert'));
            return;
        }
        const scopes = 'user:email read:user';
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_CALLBACK_URL)}&scope=${encodeURIComponent(scopes)}`;
        window.location.href = authUrl;
    };

    return (
        <div className="flex items-center justify-center py-12">
            <div className="w-full max-w-sm space-y-8">
                <div>
                    {/* <<< GÜNCELLEME: Başlık çevrildi >>> */}
                    <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        {t('auth_options_title')}
                    </h2>
                </div>

                {/* Butonlar */}
                <div className="space-y-4">
                    {/* Monologed ile Giriş Yap */}
                    <Link
                        to="/login"
                        className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-colors duration-150"
                    >
                        <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                             <img src={siteLogo} alt="" className="h-5 w-auto opacity-75 group-hover:opacity-100" />
                        </span>
                        {/* <<< GÜNCELLEME: Buton metni çevrildi >>> */}
                        {t('auth_options_login_button')}
                    </Link>

                    {/* GitHub ile Giriş Yap */}
                    <button
                        type="button"
                        onClick={handleGitHubLogin}
                        disabled={!GITHUB_CLIENT_ID || !GITHUB_CALLBACK_URL}
                        className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150"
                    >
                        <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                             <FaGithub className="h-5 w-5 text-gray-400 group-hover:text-gray-300" aria-hidden="true" />
                         </span>
                        {/* <<< GÜNCELLEME: Buton metni çevrildi >>> */}
                        {t('auth_options_github_button')}
                         {/* <<< GÜNCELLEME: Hata metni çevrildi >>> */}
                         {!GITHUB_CLIENT_ID && <span className="text-xs text-red-400 ml-2">{t('auth_options_github_error_config')}</span>}
                    </button>
                </div>

                {/* Ayırıcı */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-300 dark:border-gray-700" />
                    </div>
                    <div className="relative flex justify-center">
                        {/* <<< GÜNCELLEME: Metin çevrildi >>> */}
                        <span className="px-2 bg-gray-100 dark:bg-black text-sm text-gray-500 dark:text-gray-400">
                            {t('auth_options_or')}
                        </span>
                    </div>
                </div>

                {/* Yeni Hesap Oluştur */}
                <div>
                    <Link
                        to="/register"
                        className="group relative w-full flex justify-center items-center py-3 px-4 border border-gray-500 dark:border-gray-600 text-sm font-medium rounded-md text-gray-300 hover:text-white bg-transparent hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition-colors duration-150"
                    >
                        {/* <<< GÜNCELLEME: Buton metni çevrildi >>> */}
                        {t('auth_options_register_button')}
                    </Link>
                </div>

                 {/* Alt Metin */}
                 <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
                     {/* <<< GÜNCELLEME: Metin çevrildi (linkler ayrı ele alınmalı) >>> */}
                     {t('auth_options_terms_agree_prefix')}{' '}
                     <Link to="/terms" className="underline hover:text-gray-300">{t('footer_terms')}</Link>
                     {' '}{t('auth_options_terms_agree_and')}{' '}
                     <Link to="/privacy" className="underline hover:text-gray-300">{t('footer_privacy')}</Link>.
                 </p>
            </div>
        </div>
    );
}

export default AuthOptionsPage;
