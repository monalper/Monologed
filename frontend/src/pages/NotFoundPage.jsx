// src/pages/NotFoundPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

function NotFoundPage() {
  const { t } = useTranslation();

  // Matrix backdrop ve kod yağmuru görseli
  const matrixBackdrop = 'https://image.tmdb.org/t/p/original/icmmSD4vTTDKOq2vvdulafOGw93.jpg';
  // Kod yağmuru overlay kaldırıldı

  return (
    <div
      className="fixed inset-0 w-full h-full flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url(${matrixBackdrop})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: 0
      }}
    >
      {/* Koyu ve blur overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-80 backdrop-blur-sm z-10" />
      {/* Matrix kod yağmuru overlay kaldırıldı */}
      {/* İçerik */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center px-4 py-12">
        <div className="text-[7rem] md:text-[10rem] font-extrabold text-green-400 drop-shadow-[0_2px_32px_rgba(0,255,128,0.7)] tracking-widest leading-none mb-2 select-none" style={{fontFamily:'monospace'}}>404</div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-wide" style={{fontFamily:'monospace'}}>
          {t('not_found_page_title') || 'Sayfa Bulunamadı'}
        </h1>
        <p className="text-lg md:text-xl text-green-200 mb-8 max-w-xl mx-auto" style={{fontFamily:'monospace'}}>
          {t('not_found_page_message') || 'Aradığınız sayfa Matrix&apos;in derinliklerinde kaybolmuş olabilir.'}
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-8 py-3 bg-green-500 hover:bg-green-600 text-black font-bold rounded-full shadow-lg text-lg transition duration-150 ease-in-out"
        >
          <FaHome className="mr-3 text-xl" />
          {t('not_found_page_link_home') || 'Ana Sayfa'}
        </Link>
      </div>
      {/* Hafif vinyet efekti */}
      <div className="pointer-events-none select-none absolute inset-0 z-30" style={{boxShadow:'inset 0 0 200px 40px #000'}} />
    </div>
  );
}

export default NotFoundPage;
