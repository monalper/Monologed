// src/components/HomepageHero.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { FaInfoCircle, FaSpinner, FaPlay, FaCalendarAlt, FaFilm, FaTv, FaStar, FaClock, FaRegClock } from 'react-icons/fa';
import api from '../utils/api';

// Sabitler
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const PLACEHOLDER_BACKDROP = 'https://via.placeholder.com/1280x720.png?text=Gunun+Ogesi';
const PLACEHOLDER_POSTER = 'https://via.placeholder.com/500x750.png?text=Poster+Yok';
const SLIDESHOW_INTERVAL = 10000; // 10 saniye

function HomepageHero() {
    const { t } = useTranslation();
    const [featuredItems, setFeaturedItems] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFading, setIsFading] = useState(false);
    const intervalRef = useRef(null);
    const { token } = useAuth();

    // İzleme Listesi State'leri
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [watchlistItemId, setWatchlistItemId] = useState(null);
    const [watchlistStatusLoading, setWatchlistStatusLoading] = useState(false);
    const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
    const [watchlistActionError, setWatchlistActionError] = useState(null);

    // Veri Çekme
    useEffect(() => {
        const fetchFeatured = async () => {
            setLoading(true); setError(null); setFeaturedItems([]); setCurrentIndex(0);
            try {
                const response = await api.get('/api/main/featured');
                if (response.data && Array.isArray(response.data.items)) {
                    setFeaturedItems(response.data.items);
                } else { setFeaturedItems([]); }
            } catch (err) {
                setError("Öne çıkan içerik yüklenirken bir hata oluştu.");
                setFeaturedItems([]);
            } finally { setLoading(false); }
        };
        fetchFeatured();
    }, []);

    const currentItem = featuredItems[currentIndex];

    // İzleme Listesi Durumunu Çekme
    const fetchWatchlistStatus = useCallback(async () => {
        if (!token || !currentItem?.id || !currentItem?.media_type) {
            setIsInWatchlist(false); setWatchlistItemId(null); setWatchlistStatusLoading(false); return;
        }
        setWatchlistStatusLoading(true); setWatchlistActionError(null);
        try {
            const response = await api.get(`/api/watchlist/status/${currentItem.media_type}/${currentItem.id}`);
            setIsInWatchlist(response.data.isInWatchlist);
            setWatchlistItemId(response.data.itemId || null);
        } catch (error) {
            console.error(`Hero Watchlist Status Error (${currentItem.media_type}/${currentItem.id}):`, error.response?.data || error.message);
            setIsInWatchlist(false); setWatchlistItemId(null);
        } finally { setWatchlistStatusLoading(false); }
    }, [token, currentItem?.id, currentItem?.media_type]);

    useEffect(() => { fetchWatchlistStatus(); }, [fetchWatchlistStatus]);

    // Slayt Geçişi
    useEffect(() => {
        if (featuredItems.length > 1) {
            intervalRef.current = setInterval(() => {
                setIsFading(true);
                setTimeout(() => {
                    setCurrentIndex((prevIndex) => (prevIndex + 1) % featuredItems.length);
                    setIsFading(false);
                }, 500); // Fade süresi
            }, SLIDESHOW_INTERVAL);
        }
        return () => { if (intervalRef.current) { clearInterval(intervalRef.current); } };
    }, [featuredItems.length]);

    // İzleme Listesine Ekle/Çıkar
    const handleToggleWatchlist = useCallback(async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!token || !currentItem?.id || !currentItem?.media_type || isTogglingWatchlist || watchlistStatusLoading) return;
        setIsTogglingWatchlist(true); setWatchlistActionError(null);
        const currentStatus = isInWatchlist; const currentItemId = watchlistItemId;
        try {
            if (currentStatus && currentItemId) {
                await api.delete(`/api/watchlist/${currentItemId}`);
                setIsInWatchlist(false); setWatchlistItemId(null);
            } else if (!currentStatus) {
                const response = await api.post(`/api/watchlist`, {
                    contentId: currentItem.id, contentType: currentItem.media_type
                });
                setIsInWatchlist(true); setWatchlistItemId(response.data.item?.itemId || response.data.itemId || null);
            }
        } catch (error) {
            console.error("Hero Watchlist Toggle Error:", error.response?.data || error.message);
            setWatchlistActionError(t('hero_watchlist_error'));
            setIsInWatchlist(currentStatus); setWatchlistItemId(currentItemId);
            setTimeout(() => setWatchlistActionError(null), 3000);
        } finally { setIsTogglingWatchlist(false); }
    }, [token, currentItem?.id, currentItem?.media_type, isInWatchlist, watchlistItemId, isTogglingWatchlist, watchlistStatusLoading, t]);

    // Yüklenme, Hata, Boş Liste Durumları
    if (loading) { /* ... iskelet görünümü ... */
         return (
            <div className="relative w-full h-80 md:h-[55vh] lg:h-[70vh] bg-gray-700/50 rounded-lg shadow-lg overflow-hidden animate-pulse mb-12 md:mb-16 lg:mb-20">
                <div className="absolute bottom-0 left-0 p-6 md:p-10 lg:p-12 h-full flex items-end">
                    <div className="w-32 h-48 md:w-40 md:h-60 lg:w-48 lg:h-72 bg-gray-600/50 rounded-md"></div>
                </div>
                <div className="absolute bottom-0 left-40 md:left-52 lg:left-60 right-0 p-6 md:p-10 lg:p-12 space-y-3 md:space-y-4">
                    <div className="h-4 bg-gray-600/50 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-600/50 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-600/50 rounded w-full"></div>
                    <div className="h-4 bg-gray-600/50 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-600/50 rounded w-1/3"></div>
                    <div className="h-10 bg-gray-600/50 rounded w-32 mt-2"></div>
                </div>
            </div>
        );
    }
    if (error || featuredItems.length === 0) { /* ... hata/boş mesajı ... */
         return (
            <div className="relative w-full h-80 md:h-[55vh] lg:h-[70vh] flex flex-col items-center justify-center bg-gray-800/50 rounded-lg shadow-lg overflow-hidden text-center p-4 mb-12 md:mb-16 lg:mb-20">
                <FaInfoCircle className="w-10 h-10 text-gray-500 mb-3" />
                <p className="text-gray-400">
                    {error ? error : t('error_no_featured', "Şu anda öne çıkan bir içerik bulunamadı.")} {/* Çeviri eklendi */}
                </p>
                {error && <p className="text-sm text-gray-500 mt-1">{t('error_try_again', 'Lütfen daha sonra tekrar deneyin.')}</p>} {/* Çeviri eklendi */}
            </div>
        );
     }

    // Verileri formatla
    const backdropUrl = currentItem?.backdrop_path ? `${BACKDROP_BASE_URL}${currentItem.backdrop_path}` : PLACEHOLDER_BACKDROP;
    const posterUrl = currentItem?.poster_path ? `${POSTER_BASE_URL}${currentItem.poster_path}` : PLACEHOLDER_POSTER;
    const title = currentItem?.title || t('no_title', 'Başlık Yok'); // Varsayılan çeviri
    const overview = currentItem?.overview || t('no_overview', 'Açıklama bulunamadı.'); // Varsayılan çeviri
    const detailLink = currentItem?.media_type === 'movie' ? `/movie/${currentItem.id}` : currentItem?.media_type === 'tv' ? `/tv/${currentItem.id}` : '/';
    const year = currentItem?.release_date?.substring(0, 4) || currentItem?.first_air_date?.substring(0, 4);
    const vote = currentItem?.vote_average;

    return (
        // Ana Hero Konteyneri
        <div className="relative w-full h-80 md:h-[55vh] lg:h-[70vh] rounded-xl shadow-2xl overflow-hidden mb-12 md:mb-16 lg:mb-20">
            {/* Backdrop Resmi */}
            <img
                src={backdropUrl}
                alt={`${title} backdrop`}
                className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
                key={currentItem?.id || currentIndex} // Animasyon için key
            />
            {/* Gradient Overlay'ler */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none"></div>
            <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-black/80 via-black/50 to-transparent pointer-events-none"></div>

            {/* İçerik Alanı */}
            <div className={`absolute inset-0 flex items-end p-6 md:p-10 lg:p-12 text-white z-10 transition-opacity duration-500 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                {/* Poster Alanı */}
                <div className="hidden md:block flex-shrink-0 w-40 lg:w-48 mr-6 lg:mr-8">
                    <img
                        src={posterUrl}
                        alt={`${title} posteri`}
                        className="w-full h-auto object-contain rounded-lg shadow-lg border-2 border-white/10"
                        key={`poster-${currentItem?.id || currentIndex}`} // Animasyon için key
                    />
                </div>

                {/* Metin Alanı */}
                <div className="flex-1">
                    {/* Metadata */}
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm text-gray-300 mb-2 opacity-90">
                         {year && (
                            <span className="flex items-center">
                                <FaCalendarAlt className="w-3 h-3 mr-1.5" />
                                {year}
                            </span>
                        )}
                        {currentItem?.media_type && (
                            <span className="flex items-center bg-white/10 px-2 py-0.5 rounded-full">
                                {currentItem.media_type === 'movie' ? <FaFilm className="w-3 h-3 mr-1.5" /> : <FaTv className="w-3 h-3 mr-1.5" />}
                                {/* *** Tip çevirisi *** */}
                                {currentItem.media_type === 'movie' ? t('hero_type_movie', 'Film') : t('hero_type_tv', 'Dizi')}
                            </span>
                        )}
                        {vote && parseFloat(vote) > 0 && (
                            <span className="flex items-center font-semibold text-yellow-400">
                                <FaStar className="w-3 h-3 mr-1" />
                                {vote}/10
                            </span>
                        )}
                    </div>

                    {/* Başlık */}
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 text-shadow-md leading-tight">
                        {title}
                    </h2>

                    {/* Özet */}
                    <p className="text-sm md:text-base text-gray-200 mb-4 md:mb-5 line-clamp-2 md:line-clamp-3 max-w-xl lg:max-w-2xl leading-relaxed text-shadow-sm">
                        {overview}
                    </p>

                    {/* Butonlar */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Detay Butonu */}
                        <Link
                            to={detailLink}
                            className="inline-flex items-center px-4 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-full text-sm transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black"
                        >
                            <FaPlay className="w-4 h-4 mr-2" />
                            {/* *** Buton çevirisi *** */}
                            {t('hero_details_button')}
                        </Link>

                        {/* İzleme Listesi Butonu */}
                        {token && currentItem && (
                            <button
                                onClick={handleToggleWatchlist}
                                disabled={watchlistStatusLoading || isTogglingWatchlist}
                                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-60 ${
                                    isInWatchlist
                                    ? 'bg-gray-600/70 hover:bg-gray-500/70 text-gray-200 focus:ring-gray-500'
                                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white focus:ring-white'
                                }`}
                                title={isInWatchlist ? t('tooltip_remove_watchlist', 'İzleme Listesinden Çıkar') : t('tooltip_add_watchlist', 'İzleme Listesine Ekle')}
                            >
                                {watchlistStatusLoading || isTogglingWatchlist ? (
                                    <FaSpinner className="animate-spin w-4 h-4 mr-2" />
                                ) : isInWatchlist ? (
                                    <FaClock className="w-4 h-4 mr-2" />
                                ) : (
                                    <FaRegClock className="w-4 h-4 mr-2" />
                                )}
                                {/* *** Buton çevirisi *** */}
                                {isInWatchlist ? t('hero_in_watchlist') : t('hero_add_watchlist')}
                            </button>
                        )}
                    </div>
                    {/* Watchlist Hata Mesajı */}
                    {watchlistActionError && (
                        <p className="text-xs text-red-400 mt-2">{watchlistActionError}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default HomepageHero;
