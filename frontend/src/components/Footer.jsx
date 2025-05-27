// src/components/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import siteLogo from '../assets/logedelements/logo.png'; // Logo import edildi
// <<< DEĞİŞİKLİK: FaRedditAlien kaldırıldı >>>
import { FaXTwitter, FaInstagram, FaTiktok, FaSpotify } from 'react-icons/fa6';
// <<< YENİ: PiRedditLogoFill ikonu 'pi' paketinden eklendi >>>
import { PiRedditLogoFill } from "react-icons/pi";
import { SiBuymeacoffee } from 'react-icons/si';
import { useTranslation } from 'react-i18next'; // Çeviri hook'u import edildi

function Footer() {
  const { t } = useTranslation(); // t fonksiyonu alındı
  const currentYear = new Date().getFullYear(); // Mevcut yılı al

  return (
    // Footer ana konteyneri: Orijinal koyu arka plan, üst kenarlık ve margin
    <footer className="bg-[#090909] border-t border-gray-700/50 mt-12 md:mt-16">
      {/* İçerik konteyneri: Orijinal maksimum genişlik, padding */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Flex layout: Orijinal mobil dikey, md ve üzeri yatay düzen */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">

          {/* Sol Taraf: Logo ve Copyright */}
          <div className="flex items-center justify-center md:justify-start gap-x-3">
            {/* Site Logosu */}
            <img src={siteLogo} alt="Monologed Logo" className="h-6 w-auto flex-shrink-0" />
            {/* Copyright Metni */}
            <div className="text-xs">
              <p className="text-gray-400">
                {/* Copyright metni çevirisi (değişken ile) */}
                {t('footer_copyright', { year: currentYear })}
              </p>
            </div>
          </div>

          {/* Sağ Taraf: Linkler ve Simgeler */}
          <div className="flex items-center gap-x-4">
            {/* Navigasyon Linkleri */}
            <nav className="flex flex-wrap justify-center md:justify-end gap-x-4 gap-y-1">
              {/* Hakkımızda Linki */}
              <Link to="/about" className="text-xs text-gray-400 hover:text-gray-200 transition-colors">
                {t('footer_about')} {/* Çeviri anahtarı */}
              </Link>
              {/* Koşullar Linki */}
              <Link to="/terms" className="text-xs text-gray-400 hover:text-gray-200 transition-colors">
                {t('footer_terms')} {/* Çeviri anahtarı */}
              </Link>
              {/* Gizlilik Linki */}
              <Link to="/privacy" className="text-xs text-gray-400 hover:text-gray-200 transition-colors">
                {t('footer_privacy')} {/* Çeviri anahtarı */}
              </Link>
            </nav>
            {/* Sosyal ve Destek İkonları */}
            <div className="flex items-center gap-x-3">
              {/* Twitter ikonu */}
              <a
                href="https://x.com/itsMonologed"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="Monologed X (Twitter) Profili"
              >
                <FaXTwitter className="w-4 h-4" />
              </a>
              {/* Instagram ikonu */}
              <a
                href="https://instagram.com/itsmonologed"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-pink-500 transition-colors"
                aria-label="Monologed Instagram Profili"
              >
                <FaInstagram className="w-4 h-4" />
              </a>
              {/* TikTok ikonu */}
              <a
                href="https://www.tiktok.com/@monologed"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Monologed TikTok Profili"
              >
                <FaTiktok className="w-4 h-4" />
              </a>
              {/* Spotify ikonu */}
              <a
                href="https://open.spotify.com/user/3146wgakbwj4kmr2yienxpjm4yve" // Dikkat: Bu URL geçersiz görünüyor!
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-green-500 transition-colors"
                aria-label="Monologed Spotify Profili"
              >
                <FaSpotify className="w-4 h-4" />
              </a>
              {/* <<< DEĞİŞİKLİK: Reddit ikonu >>> */}
              <a
                href="https://www.reddit.com/r/Monologed/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-orange-500 transition-colors" // Reddit turuncusu
                aria-label="Monologed Reddit Sayfası"
              >
                {/* <<< FaRedditAlien yerine PiRedditLogoFill kullanıldı >>> */}
                <PiRedditLogoFill className="w-4 h-4" />
              </a>
              {/* Buy Me a Coffee ikonu */}
              <a
                href="https://buymeacoffee.com/monologed"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-yellow-500 transition-colors"
                aria-label="Monologed'a Kahve Ismarla"
              >
                <SiBuymeacoffee className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
