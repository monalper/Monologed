// src/components/TvShowList.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import ContentCard from './ContentCard';
import { useTranslation } from 'react-i18next'; // *** useTranslation import edildi ***

// İkonlar
const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);
const ChevronRightNavIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

function TvShowList() {
    const { t } = useTranslation(); // *** t fonksiyonu alındı ***
    const [tvShows, setTvShows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const MAX_ITEMS_TO_SHOW = 12;
    const scrollContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        const fetchPopularTvShows = async () => {
            setLoading(true); setError(null);
            try {
                const response = await axios.get('/api/tv/popular');
                const results = (response.data?.results || []).slice(0, MAX_ITEMS_TO_SHOW);
                setTvShows(results);
                checkScrollability();
            } catch (err) {
                console.error("Popüler dizileri çekerken hata:", err);
                setError('Popüler diziler yüklenirken bir sorun oluştu.'); setTvShows([]);
            } finally { setLoading(false); }
        };
        fetchPopularTvShows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkScrollability = useCallback(() => {
        const container = scrollContainerRef.current;
        if (container) {
            const canScrollRightCheck = container.scrollWidth > container.clientWidth && container.scrollLeft < container.scrollWidth - container.clientWidth - 5;
            setCanScrollRight(canScrollRightCheck);
            const canScrollLeftCheck = container.scrollLeft > 5;
            setCanScrollLeft(canScrollLeftCheck);
        } else {
            setCanScrollLeft(false);
            setCanScrollRight(false);
        }
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScrollability, { passive: true });
            const resizeObserver = new ResizeObserver(checkScrollability);
            resizeObserver.observe(container);
            checkScrollability();
            return () => {
                container.removeEventListener('scroll', checkScrollability);
                resizeObserver.unobserve(container);
            };
        }
    }, [checkScrollability, loading]);

    const scroll = (scrollOffset) => {
        if (scrollContainerRef.current) {
            const cardWidthEstimate = 180;
            scrollContainerRef.current.scrollBy({ left: scrollOffset * cardWidthEstimate, behavior: 'smooth' });
        }
    };

    return (
        <section className="relative group/section" aria-labelledby="popular-tvshows-heading">
             {/* Bölüm Başlığı */}
             <div className="flex items-center justify-between mb-4">
                 {/* *** Başlık t() ile değiştirildi *** */}
                 <h2 id="popular-tvshows-heading" className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {t('homepage_popular_tv_title')}
                 </h2>
             </div>

             {/* İçerik Alanı ve Kaydırma Container'ı */}
             {loading && <div className="h-56 flex items-center justify-center text-gray-500 dark:text-gray-400 italic">{t('homepage_loading')}</div>}
             {error && <div className="h-56 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 p-4 text-center text-red-600 dark:text-red-300">{error}</div>}

            {!loading && !error && tvShows.length > 0 && (
                 <div className="relative">
                    <div
                        ref={scrollContainerRef}
                        className="flex space-x-4 overflow-x-auto scroll-smooth pb-4 -mb-4 hide-scrollbar"
                    >
                        {tvShows.map(show => (
                           <ContentCard key={show.id} item={{...show, type: 'tv'}} />
                        ))}
                        <div className="flex-shrink-0 w-1"></div>
                    </div>
                    {/* Kaydırma Okları */}
                     <>
                         {canScrollLeft && (
                             <button onClick={() => scroll(-2)} className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white dark:bg-gray-800/80 backdrop-blur-sm hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white rounded-full shadow-md transition-all duration-200 opacity-0 group-hover/section:opacity-100 focus:opacity-100" aria-label="Geri Kaydır"> <ChevronLeftIcon /> </button>
                          )}
                         {canScrollRight && (
                             <button onClick={() => scroll(2)} className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white dark:bg-gray-800/80 backdrop-blur-sm hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white rounded-full shadow-md transition-all duration-200 opacity-0 group-hover/section:opacity-100 focus:opacity-100" aria-label="İleri Kaydır"> <ChevronRightNavIcon /> </button>
                         )}
                     </>
                 </div>
            )}
             {!loading && !error && tvShows.length === 0 && (
                 <div className="h-56 flex items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                     {/* *** Metin t() ile değiştirildi *** */}
                     {t('error_no_popular_tv')}
                 </div>
             )}
        </section>
    );
}

export default TvShowList;
