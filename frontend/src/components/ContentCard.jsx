// src/components/ContentCard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next'; // *** useTranslation import edildi ***
import { FaEye, FaRegEye, FaClock, FaRegClock, FaSpinner, FaInfoCircle, FaPlayCircle, FaStar, FaFilm, FaTv } from 'react-icons/fa';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/342x513.png?text=Poster+Yok';

function ContentCard({ item }) {
    const { t } = useTranslation(); // *** t fonksiyonu alındı ***
    const { token } = useAuth();
    const id = item?.id;
    const type = item?.type; // 'movie' veya 'tv'
    const title = item?.title;
    const name = item?.name;
    const poster_path = item?.poster_path;
    const release_date = item?.release_date;
    const first_air_date = item?.first_air_date;
    const vote_average = item?.vote_average;
    const initialItemId = item?.itemId; // HomepageWatchlist'ten gelebilir

    // State'ler
    const [userLogsForItem, setUserLogsForItem] = useState([]);
    const [logStatusLoading, setLogStatusLoading] = useState(!!token);
    const [isTogglingLog, setIsTogglingLog] = useState(false);
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [watchlistItemId, setWatchlistItemId] = useState(initialItemId || null);
    const [watchlistStatusLoading, setWatchlistStatusLoading] = useState(!!token);
    const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
    const [actionError, setActionError] = useState(null);

    // Türetilmiş Değerler
    const contentTitle = type === 'movie' ? title : name;
    const contentYear = type === 'movie'
        ? (release_date ? release_date.substring(0, 4) : '')
        : (first_air_date ? first_air_date.substring(0, 4) : '');
    const detailLink = type === 'movie' ? `/movie/${id}` : `/tv/${id}`;

    // Memoized Durum Hesaplamaları
    const hasGeneralLog = useMemo(() => {
        if (!userLogsForItem) return false;
        if (type === 'movie') return userLogsForItem.length > 0;
        return userLogsForItem.some(log => log.seasonNumber === undefined || log.seasonNumber === null);
    }, [userLogsForItem, type]);

    const isWatching = useMemo(() => {
        if (type !== 'tv' || !userLogsForItem) return false;
        const hasSeasonLog = userLogsForItem.some(log => log.seasonNumber !== undefined && log.seasonNumber !== null);
        return !hasGeneralLog && hasSeasonLog;
    }, [userLogsForItem, hasGeneralLog, type]);

    const logStatus = useMemo(() => {
        if (hasGeneralLog) return 'watched';
        if (isWatching) return 'watching';
        return 'unwatched';
    }, [hasGeneralLog, isWatching]);

    // Veri Çekme Fonksiyonları
    const fetchItemLogs = useCallback(async () => {
        if (!token || !id || !type) {
            setLogStatusLoading(false); setUserLogsForItem([]); return;
        }
        setLogStatusLoading(true); setActionError(null);
        try {
            const response = await axios.get(`/api/logs`, {
                params: { contentId: id, contentType: type },
                headers: { Authorization: `Bearer ${token}` } // Token ekle
            });
            setUserLogsForItem(response.data.logs || []);
        } catch (error) { setUserLogsForItem([]); }
        finally { setLogStatusLoading(false); }
    }, [token, id, type]);

    const fetchWatchlistStatus = useCallback(async () => {
        if (!token || !id || !type) {
            setWatchlistStatusLoading(false); setIsInWatchlist(false); setWatchlistItemId(null); return;
        }
        setWatchlistStatusLoading(true); setActionError(null);
        try {
            const response = await axios.get(`/api/watchlist/status/${type}/${id}`, {
                headers: { Authorization: `Bearer ${token}` } // Token ekle
            });
            setIsInWatchlist(response.data.isInWatchlist);
            setWatchlistItemId(response.data.itemId || null);
        } catch (error) { setIsInWatchlist(false); setWatchlistItemId(null); }
        finally { setWatchlistStatusLoading(false); }
    }, [token, id, type]);

    useEffect(() => { fetchItemLogs(); fetchWatchlistStatus(); }, [fetchItemLogs, fetchWatchlistStatus]);

    // Aksiyon Fonksiyonları
    const handleToggleLog = useCallback(async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!token || isTogglingLog || isTogglingWatchlist || logStatusLoading) return;
        setIsTogglingLog(true); setActionError(null);
        const apiPrefix = '/api';
        const generalLog = (type === 'movie')
            ? userLogsForItem[0]
            : userLogsForItem.find(log => log.seasonNumber === undefined || log.seasonNumber === null);
        try {
            const headers = { Authorization: `Bearer ${token}` }; // Token ekle
            if (generalLog) {
                await axios.delete(`${apiPrefix}/logs/${generalLog.logId}`, { headers });
            } else {
                await axios.post(`${apiPrefix}/logs`, { contentId: id, contentType: type, watchedDate: new Date().toISOString().split('T')[0] }, { headers });
            }
            await fetchItemLogs(); // Durumu yenilemek için logları tekrar çek
        } catch (error) {
            setActionError(t('content_card_error')); // *** Çeviri kullanıldı ***
        } finally { setIsTogglingLog(false); }
    }, [token, id, type, isTogglingLog, isTogglingWatchlist, logStatusLoading, userLogsForItem, fetchItemLogs, t]); // t eklendi

    const handleToggleWatchlist = useCallback(async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!token || isTogglingLog || isTogglingWatchlist || watchlistStatusLoading) return;
        setIsTogglingWatchlist(true); setActionError(null);
        const apiPrefix = '/api';
        const currentStatus = isInWatchlist;
        const currentItemId = watchlistItemId;
        try {
            const headers = { Authorization: `Bearer ${token}` }; // Token ekle
            if (currentStatus && currentItemId) {
                await axios.delete(`${apiPrefix}/watchlist/${currentItemId}`, { headers });
                setIsInWatchlist(false); setWatchlistItemId(null);
            } else if (!currentStatus) {
                const response = await axios.post(`${apiPrefix}/watchlist`, { contentId: id, contentType: type }, { headers });
                setIsInWatchlist(true); setWatchlistItemId(response.data.item?.itemId || response.data.itemId || null);
            }
        } catch (error) {
            setActionError(t('content_card_error')); // *** Çeviri kullanıldı ***
            setIsInWatchlist(currentStatus); setWatchlistItemId(currentItemId);
        } finally { setIsTogglingWatchlist(false); }
    }, [token, id, type, isTogglingLog, isTogglingWatchlist, watchlistStatusLoading, isInWatchlist, watchlistItemId, t]); // t eklendi

    useEffect(() => {
        let timer;
        if (actionError) { timer = setTimeout(() => setActionError(null), 3000); }
        return () => clearTimeout(timer);
    }, [actionError]);

    // Buton Stil ve Metin Belirleme
    let logButtonClass = 'bg-black/70 backdrop-blur-sm hover:bg-white/20 text-gray-200';
    let logButtonIcon = <FaRegEye className="w-5 h-5" />;
    let logButtonTitle = t('content_card_log_watched'); // *** Çeviri kullanıldı ***
    if (logStatus === 'watched') {
        logButtonClass = 'bg-green-600 hover:bg-green-500 text-white';
        logButtonIcon = <FaEye className="w-5 h-5" />;
        logButtonTitle = t('content_card_log_remove'); // *** Çeviri kullanıldı ***
    } else if (logStatus === 'watching') {
        logButtonClass = 'bg-orange-500 hover:bg-orange-400 text-white';
        logButtonIcon = <FaPlayCircle className="w-5 h-5" />;
        logButtonTitle = t('content_card_log_tv_watched'); // *** Çeviri kullanıldı ***
    }

    const watchlistButtonTitle = isInWatchlist ? t('content_card_watchlist_remove') : t('content_card_watchlist_add'); // *** Çeviri kullanıldı ***

    // Yardımcı Fonksiyonlar
    const getImageUrl = (path) => (path ? `${IMAGE_BASE_URL}${path}` : PLACEHOLDER_IMAGE);
    const LoadingSpinner = ({ size = "w-4 h-4" }) => <FaSpinner className={`animate-spin inline-block ${size}`} role="status" aria-label={t('content_card_loading')} />; // *** Çeviri kullanıldı ***

    if (!id || !type) return null;

    return (
        <Link
            to={detailLink}
            className={`
                block group/card relative flex-shrink-0 w-40 sm:w-44 md:w-48
                focus:outline-none rounded-lg overflow-hidden
                transition-all duration-200 ease-in-out
                focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-brand
            `}
        >
            {/* Tip Etiketi */}
            <span
                className={`absolute top-1.5 left-1.5 z-10 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-md ${
                    type === 'movie' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                }`}
            >
                {/* *** Tip çevirisi *** */}
                {type === 'movie' ? t('type_movie') : t('type_tv')}
            </span>

            {/* İzliyorum Göstergesi */}
            {type === 'tv' && logStatus === 'watching' && (
                <div className="absolute top-1.5 right-1.5 z-20 bg-black/60 rounded-full p-1 shadow-lg pointer-events-none">
                    <FaPlayCircle className="w-4 h-4 text-orange-400" title="İzleniyor" />
                </div>
            )}
            {/* Poster Alanı */}
            <div className={`relative aspect-[2/3] bg-gray-700 rounded-lg overflow-hidden transition-all duration-200 ease-in-out`}>
                 <img
                    src={getImageUrl(poster_path)}
                    alt={`${contentTitle || 'Poster'} Posteri`}
                    className="w-full h-full object-cover transition-opacity duration-300 group-hover/card:opacity-75"
                    loading="lazy"
                />
                {/* Hover Butonlar Alanı */}
                 {token && (
                    <div className="absolute bottom-2 right-2 flex flex-col space-y-1.5 opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 transition-opacity duration-200 delay-100 z-20">
                        {/* Watchlist Butonu */}
                        <button
                            onClick={handleToggleWatchlist}
                            disabled={isTogglingWatchlist || isTogglingLog || watchlistStatusLoading}
                            className={`p-2 rounded-full transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg ${
                                 isInWatchlist ? 'bg-brand hover:bg-opacity-80 text-white' : 'bg-black/70 backdrop-blur-sm hover:bg-white/20 text-gray-200'
                             }`}
                            title={watchlistButtonTitle} // *** Çeviri kullanıldı ***
                            aria-label={watchlistButtonTitle} // *** Çeviri kullanıldı ***
                        >
                            {watchlistStatusLoading || isTogglingWatchlist ? <LoadingSpinner size="w-5 h-5" /> : ( isInWatchlist ? <FaClock className="w-5 h-5" /> : <FaRegClock className="w-5 h-5" /> )}
                        </button>
                         {/* Log Butonu */}
                         <button
                            onClick={handleToggleLog}
                            disabled={isTogglingLog || isTogglingWatchlist || logStatusLoading}
                            className={`p-2 rounded-full transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg ${logButtonClass}`}
                            title={logButtonTitle} // *** Çeviri kullanıldı ***
                            aria-label={logButtonTitle} // *** Çeviri kullanıldı ***
                        >
                             {logStatusLoading || isTogglingLog ? <LoadingSpinner size="w-5 h-5" /> : logButtonIcon}
                         </button>
                     </div>
                )}
                 {/* Hata Mesajı */}
                 {actionError && (
                     <div className="absolute bottom-1 left-1 right-1 bg-red-700/90 text-white text-xs p-1 rounded-sm text-center z-20 flex items-center justify-center" role="alert">
                         <FaInfoCircle className="w-3 h-3 mr-1" />
                         {actionError}
                     </div>
                 )}
            </div>
            {/* Kart Alt Bilgi */}
            <div className="pt-2 px-1 bg-transparent space-y-0.5">
                {/* Puan */}
                {vote_average && vote_average > 0 && (
                    <div className="flex items-center text-xs font-semibold text-yellow-500">
                        <FaStar className="w-3 h-3 mr-1" />
                        {vote_average.toFixed(1)}
                    </div>
                )}
                {/* Başlık ve Yıl */}
                <h4 className="font-bold text-base text-gray-300 dark:text-gray-200 leading-tight" title={contentTitle || ''}>
                    <span>{contentTitle || t('no_title')}</span> {/* *** Çeviri kullanıldı *** */}
                    {contentYear && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 font-medium">
                            ({contentYear})
                        </span>
                    )}
                </h4>
            </div>
        </Link>
    );
}

export default ContentCard;
