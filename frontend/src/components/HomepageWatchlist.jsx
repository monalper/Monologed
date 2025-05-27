// src/components/HomepageWatchlist.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

function HomepageWatchlist() {
    const { t } = useTranslation(); // *** t fonksiyonu alındı ***
    const { token } = useAuth();
    const [watchlistItems, setWatchlistItems] = useState([]);
    const [detailedItems, setDetailedItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const MAX_ITEMS_TO_SHOW = 12;
    const scrollContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Watchlist ID'lerini çekme
    useEffect(() => {
        if (token) {
            const fetchWatchlistIds = async () => {
                setLoading(true); setError(null); setWatchlistItems([]); setDetailedItems([]);
                try {
                    const response = await axios.get('/api/watchlist', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const items = (response.data.watchlist || []).reverse().slice(0, MAX_ITEMS_TO_SHOW);
                    setWatchlistItems(items);
                } catch (err) {
                    console.error("HomepageWatchlist: Watchlist ID'leri çekme hatası:", err.response?.data || err.message);
                    if (err.response?.status === 401) {
                         setError(t('error_session_expired', "Oturumunuz zaman aşımına uğramış olabilir. Lütfen tekrar giriş yapın."));
                    } else {
                        setError(t('error_watchlist_load_ids')); // *** Çeviri kullanıldı ***
                    }
                    setLoading(false);
                }
            };
            fetchWatchlistIds();
        } else { setLoading(false); }
    }, [token, t]); // t bağımlılıklara eklendi

    // Watchlist öğelerinin detaylarını çekme
    useEffect(() => {
        if (!token || watchlistItems.length === 0) {
            if(token && !loading) setLoading(false);
            return;
        }
        const fetchDetailsForItems = async () => {
            try {
                const detailPromises = watchlistItems.map(item => {
                    const detailUrl = item.contentType === 'movie' ? `/api/movies/${item.contentId}` : `/api/tv/${item.contentId}`;
                    return axios.get(detailUrl)
                        .then(res => ({ ...res.data, type: item.contentType, itemId: item.itemId }))
                        .catch(err => {
                            console.error(`HomepageWatchlist: İçerik ${item.contentType}/${item.contentId} detayı alınamadı:`, err.message);
                            return null;
                        });
                });
                const detailedResults = await Promise.all(detailPromises);
                setDetailedItems(detailedResults.filter(item => item !== null));
                checkScrollability();
            } catch (err) {
                console.error("HomepageWatchlist: Detay çekme genel hata:", err);
                setError(t('error_watchlist_load_details')); // *** Çeviri kullanıldı ***
                setDetailedItems([]);
            } finally {
                setLoading(false);
            }
        };
        fetchDetailsForItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [watchlistItems, token, t]); // t bağımlılıklara eklendi

     // Kaydırma Durumunu Kontrol Etme Fonksiyonu
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

    // Scroll Olayını Dinleme ve Boyut Değişikliğini Dinleme
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScrollability, { passive: true });
            const resizeObserver = new ResizeObserver(checkScrollability);
            resizeObserver.observe(container);
            // Detaylar yüklendiğinde zaten kontrol ediliyor
            return () => {
                container.removeEventListener('scroll', checkScrollability);
                resizeObserver.unobserve(container);
            };
        }
    }, [checkScrollability, loading]);

    // Giriş yapılmamışsa bileşeni render etme
    if (!token) return null;

    // Kaydırma Fonksiyonları
    const scroll = (scrollOffset) => {
        if (scrollContainerRef.current) {
            const cardWidthEstimate = 180;
            scrollContainerRef.current.scrollBy({ left: scrollOffset * cardWidthEstimate, behavior: 'smooth' });
        }
    };

    return (
        <section className="relative group/section" aria-labelledby="watchlist-heading">
            {/* Bölüm Başlığı */}
            <div className="flex items-center justify-between mb-4">
                {/* *** Başlık t() ile değiştirildi *** */}
                <h2 id="watchlist-heading" className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {t('homepage_watchlist_title')}
                </h2>
                 {detailedItems.length > 0 && (
                    // *** Link metni t() ile değiştirildi ***
                    <Link to="/watchlist" className="text-sm font-medium text-brand-yazi dark:text-brand-yazi hover:underline">
                        {t('homepage_see_all')}
                    </Link>
                 )}
            </div>

            {/* İçerik Alanı */}
            {loading && <div className="h-56 flex items-center justify-center text-gray-500 dark:text-gray-400 italic">{t('homepage_loading')}</div>}
            {error && <div className="h-56 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 p-4 text-center text-red-600 dark:text-red-300">{error}</div>}

            {!loading && !error && detailedItems.length > 0 && (
                <div className="relative">
                    <div
                        ref={scrollContainerRef}
                        className="flex space-x-4 overflow-x-auto scroll-smooth pb-4 -mb-4 hide-scrollbar"
                    >
                        {detailedItems.map(item => (
                            <ContentCard key={item.itemId || `${item.type}-${item.id}`} item={item} />
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

            {/* Boş Liste Durumu */}
            {!loading && !error && detailedItems.length === 0 && (
                <div className="h-56 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-6">
                     {/* *** Metinler t() ile değiştirildi *** */}
                     <p className="mb-3 text-base">{t('homepage_watchlist_empty_title')}</p>
                     <p className="text-sm mb-5">{t('homepage_watchlist_empty_desc')}</p>
                     <Link to="/" className="text-sm font-medium text-brand-yazi dark:brand-yazi hover:underline">
                         {t('homepage_watchlist_empty_link')}
                     </Link>
                 </div>
            )}
        </section>
    );
}

export default HomepageWatchlist;
