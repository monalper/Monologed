// src/pages/WatchlistPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { FaListUl, FaInfoCircle, FaSpinner, FaEye, FaRegEye, FaClock, FaRegClock, FaPlayCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

// Sabitler
const IMAGE_BASE_URL_W342 = 'https://image.tmdb.org/t/p/w342';
const PLACEHOLDER_IMAGE_W342 = 'https://placehold.co/342x513/1a1a1a/ffffff?text=N/A';

function WatchlistPage() {
    const { t } = useTranslation();
    const { token } = useAuth();
    const [watchlistItems, setWatchlistItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [contentDetails, setContentDetails] = useState({});
    const [userLogs, setUserLogs] = useState({});
    const [isTogglingLog, setIsTogglingLog] = useState({});
    const [isTogglingWatchlist, setIsTogglingWatchlist] = useState({});

    useEffect(() => {
        if (token) {
            const fetchWatchlist = async () => {
                setLoading(true);
                setError(null);
                setWatchlistItems([]);
                try {
                    const response = await api.get('/api/watchlist');
                    setWatchlistItems(response.data.watchlist || []);
                } catch (error) {
                    console.error("Watchlist çekme hatası (WatchlistPage):", error.response?.data || error.message);
                    if (error.response?.status === 401) {
                         setError(t('error_session_expired'));
                    } else {
                        setError(t('watchlist_error_load'));
                    }
                    setWatchlistItems([]);
                } finally {
                    setLoading(false);
                }
            };
            fetchWatchlist();
        } else {
             setLoading(false);
            setError(t('watchlist_error_auth'));
             setWatchlistItems([]);
        }
    }, [token, t]);

    // İçerik detaylarını çekme
    useEffect(() => {
        const fetchContentDetails = async () => {
            if (watchlistItems.length === 0) return;

            const details = {};
            for (const item of watchlistItems) {
                try {
                    const endpoint = item.contentType === 'movie' ? `/api/movies/${item.contentId}` : `/api/tv/${item.contentId}`;
                    const response = await api.get(endpoint);
                    details[item.itemId] = response.data;
                } catch (error) {
                    console.error(`İçerik detayı çekme hatası (${item.contentType}/${item.contentId}):`, error);
                }
            }
            setContentDetails(details);
        };

        fetchContentDetails();
    }, [watchlistItems]);

    // İzleme durumlarını çekme
    useEffect(() => {
        const fetchLogs = async () => {
            if (!token || watchlistItems.length === 0) return;

            const logs = {};
            for (const item of watchlistItems) {
                try {
                    const response = await api.get(`/api/logs`, {
                        params: { contentId: item.contentId, contentType: item.contentType }
                    });
                    logs[item.itemId] = response.data.logs || [];
                } catch (error) {
                    console.error(`İzleme durumu çekme hatası (${item.contentType}/${item.contentId}):`, error);
                    logs[item.itemId] = [];
                }
            }
            setUserLogs(logs);
        };

        fetchLogs();
    }, [token, watchlistItems]);

    const handleToggleLog = async (e, itemId, contentId, contentType) => {
        e.preventDefault();
        e.stopPropagation();
        if (!token || isTogglingLog[itemId] || isTogglingWatchlist[itemId]) return;

        setIsTogglingLog(prev => ({ ...prev, [itemId]: true }));
        const logs = userLogs[itemId] || [];
        const generalLog = contentType === 'movie'
            ? logs[0]
            : logs.find(log => log.seasonNumber === undefined || log.seasonNumber === null);

        try {
            if (generalLog) {
                await api.delete(`/api/logs/${generalLog.logId}`);
                setUserLogs(prev => ({
                    ...prev,
                    [itemId]: logs.filter(log => log.logId !== generalLog.logId)
                }));
            } else {
                const response = await api.post(`/api/logs`, {
                    contentId,
                    contentType,
                    watchedDate: new Date().toISOString().split('T')[0]
                });
                setUserLogs(prev => ({
                    ...prev,
                    [itemId]: [...logs, response.data]
                }));
            }
        } catch (error) {
            console.error("İzleme durumu güncelleme hatası:", error);
        } finally {
            setIsTogglingLog(prev => ({ ...prev, [itemId]: false }));
        }
    };

    const handleRemoveItem = async (itemId) => {
        if (!token || isTogglingWatchlist[itemId] || isTogglingLog[itemId]) return;

        setIsTogglingWatchlist(prev => ({ ...prev, [itemId]: true }));
        try {
            await api.delete(`/api/watchlist/${itemId}`);
            setWatchlistItems(prevItems => prevItems.filter(item => item.itemId !== itemId));
            setContentDetails(prev => {
                const newDetails = { ...prev };
                delete newDetails[itemId];
                return newDetails;
            });
            setUserLogs(prev => {
                const newLogs = { ...prev };
                delete newLogs[itemId];
                return newLogs;
            });
        } catch (error) {
            console.error("Öğe silme hatası:", error);
        } finally {
            setIsTogglingWatchlist(prev => ({ ...prev, [itemId]: false }));
        }
    };

    const getLogStatus = (itemId, contentType) => {
        const logs = userLogs[itemId] || [];
        if (contentType === 'movie') {
            return logs.length > 0 ? 'watched' : 'unwatched';
        } else {
            const hasGeneralLog = logs.some(log => log.seasonNumber === undefined || log.seasonNumber === null);
            const hasSeasonLog = logs.some(log => log.seasonNumber !== undefined && log.seasonNumber !== null);
            if (hasGeneralLog) return 'watched';
            if (hasSeasonLog) return 'watching';
            return 'unwatched';
        }
    };

    return (
        <div className="space-y-8">
            {/* Sayfa Başlığı */}
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
                    {t('watchlist_page_title')}
                </h1>
                {!loading && !error && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {watchlistItems.length === 0 ? t('item_count_0') :
                         watchlistItems.length === 1 ? t('item_count_1') :
                         t('item_count_plural', { count: watchlistItems.length })}
                    </span>
                )}
            </div>

            {/* Yüklenme ve Hata Durumları */}
            {loading && (
                 <div className="flex justify-center items-center py-10">
                    <FaSpinner className="animate-spin h-8 w-8 text-cyan-500" />
                    <p className="ml-3 text-gray-500 dark:text-gray-400">{t('watchlist_loading')}</p>
                </div>
            )}
            {error && (
                 <div className="text-center p-6 border border-red-300 dark:border-red-700 rounded-md bg-red-50 dark:bg-red-900/30">
                    <FaInfoCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                    <p className="text-red-600 dark:text-red-300">{error}</p>
                    {!token && (
                        <Link to="/auth/options" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                            {t('watchlist_login_button')}
                        </Link>
                    )}
                </div>
            )}

            {/* İzleme Listesi Grid */}
            {!loading && !error && (
                watchlistItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                        {watchlistItems.map(item => {
                            const details = contentDetails[item.itemId];
                            const title = details?.title || details?.name || t('watchlist_item_loading_title');
                            const posterPath = details?.poster_path;
                            const year = details?.release_date?.split('-')[0] || details?.first_air_date?.split('-')[0];
                            const logStatus = getLogStatus(item.itemId, item.contentType);

                            // Log butonu için stil ve ikon belirleme
                            let logButtonClass = 'bg-black/70 backdrop-blur-sm hover:bg-white/20 text-gray-200';
                            let logButtonIcon = <FaRegEye className="w-5 h-5" />;
                            let logButtonTitle = t('content_card_log_watched');

                            if (logStatus === 'watched') {
                                logButtonClass = 'bg-green-600 hover:bg-green-500 text-white';
                                logButtonIcon = <FaEye className="w-5 h-5" />;
                                logButtonTitle = t('content_card_log_remove');
                            } else if (logStatus === 'watching') {
                                logButtonClass = 'bg-orange-500 hover:bg-orange-400 text-white';
                                logButtonIcon = <FaPlayCircle className="w-5 h-5" />;
                                logButtonTitle = t('content_card_log_tv_watched');
                            }

                            return (
                                <div key={item.itemId} className="group relative">
                                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                        <Link 
                                            to={`/${item.contentType}/${item.contentId}`}
                                            className="block w-full h-full"
                                        >
                                            <img
                                                src={posterPath ? `${IMAGE_BASE_URL_W342}${posterPath}` : PLACEHOLDER_IMAGE_W342}
                                                alt={title}
                                                className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-75"
                                                loading="lazy"
                                            />
                                        </Link>
                                        {token && (
                                            <div className="absolute bottom-2 right-2 flex flex-col space-y-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 delay-100 z-20">
                                                {/* İzleme Durumu Butonu */}
                                                <button
                                                    onClick={(e) => handleToggleLog(e, item.itemId, item.contentId, item.contentType)}
                                                    disabled={isTogglingLog[item.itemId] || isTogglingWatchlist[item.itemId]}
                                                    className={`p-2 rounded-full transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg ${logButtonClass}`}
                                                    title={logButtonTitle}
                                                    aria-label={logButtonTitle}
                                                >
                                                    {isTogglingLog[item.itemId] ? (
                                                        <FaSpinner className="animate-spin w-5 h-5" />
                                                    ) : logButtonIcon}
                                                </button>
                                                {/* Watchlist'ten Kaldır Butonu */}
                                                <button
                                                    onClick={() => handleRemoveItem(item.itemId)}
                                                    disabled={isTogglingWatchlist[item.itemId] || isTogglingLog[item.itemId]}
                                                    className="p-2 rounded-full bg-brand hover:bg-opacity-80 text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                                                    title={t('watchlist_item_remove_button_title')}
                                                    aria-label={t('watchlist_item_remove_button_aria', { title })}
                                                >
                                                    {isTogglingWatchlist[item.itemId] ? (
                                                        <FaSpinner className="animate-spin w-5 h-5" />
                                                    ) : (
                                                        <FaClock className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2">
                                        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                            {title}
                                        </h3>
                                        {year && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {year}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                     <div className="text-center p-8 md:p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                        <FaInfoCircle className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-3">{t('watchlist_empty_title')}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                            {t('watchlist_empty_desc')}
                        </p>
                        <Link to="/" className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-5 rounded-md transition duration-150 ease-in-out text-sm shadow-sm">
                            {t('watchlist_empty_button')}
                        </Link>
                    </div>
                )
            )}
        </div>
    );
}

export default WatchlistPage;
