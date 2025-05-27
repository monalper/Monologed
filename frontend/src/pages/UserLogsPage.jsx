// src/pages/UserLogsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaSpinner, FaInfoCircle, FaExclamationCircle, FaPlayCircle } from 'react-icons/fa';
import StarRating from '../components/StarRating';
import { useTranslation } from 'react-i18next';
import ContentCard from '../components/ContentCard';

// Sabitler
const IMAGE_BASE_URL_W185 = 'https://image.tmdb.org/t/p/w185';
const PLACEHOLDER_IMAGE_W185 = 'https://placehold.co/185x278/1a1a1a/ffffff?text=N/A';

// --- Bileşenler ---

const LogPosterCard = ({ log, contentDetails, status }) => {
    const { t } = useTranslation();

    if (!contentDetails) {
        return (
            <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg shadow-md animate-pulse flex items-center justify-center">
                <FaSpinner className="animate-spin text-gray-400" />
            </div>
        );
    }
    if (contentDetails.error) {
         return (
            <div className="aspect-[2/3] bg-red-100 dark:bg-red-900/30 rounded-lg shadow-md flex flex-col items-center justify-center text-center p-2">
                 <FaExclamationCircle className="w-6 h-6 text-red-500 mb-2" />
                 <p className="text-xs text-red-600 dark:text-red-300">{t('log_poster_card_error')}</p>
                 <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{t('log_poster_card_id', { id: log.contentId, type: log.contentType })}</p>
            </div>
         );
    }

    const detailLink = log.contentType === 'movie' ? `/movie/${log.contentId}` : `/tv/${log.contentId}`;
    const title = log.contentType === 'movie' ? contentDetails.title : contentDetails.name;
    const year = (log.contentType === 'movie' ? contentDetails.release_date : contentDetails.first_air_date)?.substring(0, 4);
    const displayRating = (log.rating !== undefined && log.rating !== null && log.rating !== '') ? Number(log.rating) : null;

    return (
        <Link to={detailLink} className="block group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-cyan-500 rounded-lg relative">
            {status === 'watching' && (
                <>
                    <div className="absolute inset-0 rounded-lg ring-2 ring-orange-500 ring-offset-2 ring-offset-black pointer-events-none z-10"></div>
                    <div className="absolute top-1.5 right-1.5 z-20 bg-black/60 rounded-full p-1 shadow-lg">
                        <FaPlayCircle className="w-4 h-4 text-orange-400" title={t('log_poster_card_watching_tooltip')} />
                    </div>
                </>
            )}
            <div className="flex flex-col">
                <div className="aspect-[2/3] bg-gray-700 rounded-lg overflow-hidden shadow-md mb-1.5">
                    <img
                        src={contentDetails.poster_path ? `${IMAGE_BASE_URL_W185}${contentDetails.poster_path}` : PLACEHOLDER_IMAGE_W185}
                        alt={`${title} Posteri`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                </div>
                {displayRating !== null && (
                    <div className="flex justify-center mt-0.5">
                        <StarRating
                            rating={displayRating}
                            interactive={false}
                            size="text-xs text-yellow-400"
                        />
                    </div>
                )}
            </div>
        </Link>
    );
};

// Ana Sayfa Bileşeni
function UserLogsPage() {
    const { t } = useTranslation();
    const { token } = useAuth();
    const [allLogs, setAllLogs] = useState([]);
    const [displayLogs, setDisplayLogs] = useState([]);
    const [contentDetailsMap, setContentDetailsMap] = useState(new Map());
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('createdAt_desc');
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 18;

    // Tüm Logları Çekme
    useEffect(() => {
        if (token) {
            const fetchAllLogs = async () => {
                setLoadingLogs(true); setError(null); setAllLogs([]); setDisplayLogs([]); setContentDetailsMap(new Map());
                try {
                    const response = await axios.get('/api/logs', { headers: { Authorization: `Bearer ${token}` } });
                    const fetchedLogs = (response.data.logs || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setAllLogs(fetchedLogs);
                } catch (error) {
                    console.error("UserLogsPage: Kullanıcı logları çekme hatası:", error.response?.data || error.message);
                    setError(t('user_logs_error_generic'));
                } finally { setLoadingLogs(false); }
            };
            fetchAllLogs();
        } else {
            setLoadingLogs(false); setError(t('user_logs_error_auth'));
        }
    }, [token, t]);

    // Gösterilecek Logları Filtreleme ve Durum Hesaplama
    useEffect(() => {
        if (allLogs.length > 0) {
            const logsByContent = allLogs.reduce((acc, log) => {
                const key = `${log.contentType}-${log.contentId}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(log);
                return acc;
            }, {});

            const processedContent = {};
            for (const contentKey in logsByContent) {
                const logsForThisContent = logsByContent[contentKey];
                if (!logsForThisContent || logsForThisContent.length === 0) continue;
                const firstLog = logsForThisContent[0];
                const contentType = firstLog.contentType;
                let status = 'unwatched'; let representativeLog = null;
                if (contentType === 'movie') {
                    status = 'watched';
                    representativeLog = logsForThisContent.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                } else if (contentType === 'tv') {
                    const hasGeneralLog = logsForThisContent.some(log => log.seasonNumber === undefined || log.seasonNumber === null);
                    const hasSeasonLog = logsForThisContent.some(log => log.seasonNumber !== undefined && log.seasonNumber !== null);
                    if (hasGeneralLog) {
                        status = 'watched';
                        representativeLog = logsForThisContent.find(log => log.seasonNumber === undefined || log.seasonNumber === null) || logsForThisContent.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                    } else if (hasSeasonLog) {
                        status = 'watching';
                        representativeLog = logsForThisContent.filter(log => log.seasonNumber !== undefined && log.seasonNumber !== null).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                    }
                }
                if ((status === 'watched' || status === 'watching') && representativeLog) {
                    processedContent[contentKey] = { ...representativeLog, status: status };
                }
            }
            const finalDisplayLogs = Object.values(processedContent);
            finalDisplayLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setDisplayLogs(finalDisplayLogs);
        } else { setDisplayLogs([]); }
    }, [allLogs]);

    // İçerik Detaylarını Batch Halinde Çekme
    const fetchAllDetails = useCallback(async () => {
        if (displayLogs.length === 0) { setLoadingDetails(false); return; }
        setLoadingDetails(true);
        const uniqueContent = new Map();
        displayLogs.forEach(log => { if (log.contentId && log.contentType) { uniqueContent.set(`${log.contentType}-${log.contentId}`, { id: log.contentId, type: log.contentType }); } });
        if (uniqueContent.size === 0) { setLoadingDetails(false); return; }
        const items = Array.from(uniqueContent.values());
        const batchSize = 20;
        const newDetailsMap = new Map();
        try {
            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                const detailPromises = batch.map(item => {
                    const detailUrl = item.type === 'movie' ? `/api/movies/${item.id}` : `/api/tv/${item.id}`;
                    return axios.get(detailUrl)
                        .then(res => ({ key: `${item.type}-${item.id}`, data: res.data }))
                        .catch(err => { console.warn(`UserLogsPage: İçerik detayı çekilemedi (${item.type}/${item.id}): ${err.message}`); return { key: `${item.type}-${item.id}`, data: { error: true, id: item.id, type: item.type } }; });
                });
                const results = await Promise.all(detailPromises);
                results.forEach(result => { newDetailsMap.set(result.key, result.data); });
            }
            setContentDetailsMap(newDetailsMap);
        } catch (error) { console.error("UserLogsPage: İçerik detayları toplu çekilirken genel hata:", error); setError("İçerik detayları yüklenirken bir sorun oluştu."); }
        finally { setLoadingDetails(false); }
    }, [displayLogs]);

    useEffect(() => { if (!loadingLogs && displayLogs.length > 0) { fetchAllDetails(); } }, [loadingLogs, displayLogs, fetchAllDetails]);

    // Sıralama fonksiyonu
    const sortedLogs = useMemo(() => {
        if (!displayLogs || displayLogs.length === 0) return [];
        const logs = [...displayLogs];
        switch (sortBy) {
            case 'my_rating_desc':
                return logs.sort((a, b) => (Number(b.rating || 0) - Number(a.rating || 0)));
            case 'my_rating_asc':
                return logs.sort((a, b) => (Number(a.rating || 0) - Number(b.rating || 0)));
            case 'release_desc':
                return logs.sort((a, b) => {
                    const detailsA = contentDetailsMap.get(`${a.contentType}-${a.contentId}`);
                    const detailsB = contentDetailsMap.get(`${b.contentType}-${b.contentId}`);
                    const dateA = detailsA ? (a.contentType === 'movie' ? detailsA.release_date : detailsA.first_air_date) : '';
                    const dateB = detailsB ? (b.contentType === 'movie' ? detailsB.release_date : detailsB.first_air_date) : '';
                    return (dateB || '').localeCompare(dateA || '');
                });
            case 'release_asc':
                return logs.sort((a, b) => {
                    const detailsA = contentDetailsMap.get(`${a.contentType}-${a.contentId}`);
                    const detailsB = contentDetailsMap.get(`${b.contentType}-${b.contentId}`);
                    const dateA = detailsA ? (a.contentType === 'movie' ? detailsA.release_date : detailsA.first_air_date) : '';
                    const dateB = detailsB ? (b.contentType === 'movie' ? detailsB.release_date : detailsB.first_air_date) : '';
                    return (dateA || '').localeCompare(dateB || '');
                });
            case 'tmdb_rating_desc':
                return logs.sort((a, b) => {
                    const detailsA = contentDetailsMap.get(`${a.contentType}-${a.contentId}`);
                    const detailsB = contentDetailsMap.get(`${b.contentType}-${b.contentId}`);
                    return (Number(detailsB?.vote_average || 0) - Number(detailsA?.vote_average || 0));
                });
            case 'tmdb_rating_asc':
                return logs.sort((a, b) => {
                    const detailsA = contentDetailsMap.get(`${a.contentType}-${a.contentId}`);
                    const detailsB = contentDetailsMap.get(`${b.contentType}-${b.contentId}`);
                    return (Number(detailsA?.vote_average || 0) - Number(detailsB?.vote_average || 0));
                });
            case 'createdAt_asc':
                return logs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            case 'createdAt_desc':
            default:
                return logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
    }, [displayLogs, contentDetailsMap, sortBy]);

    // Sayfalama için slice
    const pagedLogs = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return sortedLogs.slice(start, start + ITEMS_PER_PAGE);
    }, [sortedLogs, page]);
    const totalPages = Math.ceil(sortedLogs.length / ITEMS_PER_PAGE);

    // Render Mantığı
    if (loadingLogs) return <div className="flex justify-center items-center py-10"><FaSpinner className="animate-spin text-cyan-500 text-3xl mr-3" /> {t('user_logs_loading_logs')}</div>;
    if (error && !token) return <div className="text-center p-6 border border-yellow-700 rounded-md bg-yellow-900/30 text-yellow-300"><FaInfoCircle className="inline mr-2" /> {t('user_logs_error_auth')} <Link to="/auth/options" className="font-semibold underline">giriş yapmalısınız</Link>.</div>;
    if (error) return <div className="text-center p-6 border border-red-700 rounded-md bg-red-900/30 text-red-300"><FaInfoCircle className="inline mr-2" /> {error}</div>;
    if (!loadingLogs && displayLogs.length === 0) return (
        <div className="text-center p-8 border-2 border-dashed border-gray-700 rounded-lg bg-gray-800/30">
            <FaInfoCircle className="w-10 h-10 text-gray-500 mx-auto mb-4" />
            <p className="text-lg text-gray-400 mb-3">{t('user_logs_empty_title')}</p>
            <Link to="/" className="text-cyan-400 hover:underline font-semibold">{t('user_logs_empty_link')}</Link>
        </div>
    );

    return (
        <div>
            {/* Sıralama Dropdown */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-2">
                <div></div>
                <select
                    className="bg-gray-800 text-gray-100 border border-gray-700 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    value={sortBy}
                    onChange={e => { setSortBy(e.target.value); setPage(1); }}
                >
                    <option value="createdAt_desc">{t('Sıralama: Son eklenenler')}</option>
                    <option value="createdAt_asc">{t('Sıralama: İlk eklenenler')}</option>
                    <option value="my_rating_desc">{t('Sıralama: Kendi puanım (yüksekten düşüğe)')}</option>
                    <option value="my_rating_asc">{t('Sıralama: Kendi puanım (düşükten yükseğe)')}</option>
                    <option value="release_desc">{t('Sıralama: Yayın yılı (yeni → eski)')}</option>
                    <option value="release_asc">{t('Sıralama: Yayın yılı (eski → yeni)')}</option>
                    <option value="tmdb_rating_desc">{t('Sıralama: TMDB puanı (yüksekten düşüğe)')}</option>
                    <option value="tmdb_rating_asc">{t('Sıralama: TMDB puanı (düşükten yükseğe)')}</option>
                </select>
            </div>
            {/* Başlık */}
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-4">
                {t('user_logs_page_title')} {t('user_logs_content_count', { count: displayLogs.length })}
            </h1>
            {loadingDetails && <p className="text-center text-sm text-gray-400 italic mb-4">{t('user_logs_loading_posters')}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                {pagedLogs.map(log => {
                    const details = contentDetailsMap.get(`${log.contentType}-${log.contentId}`);
                    if (!details) return null;
                    return (
                        <ContentCard
                            key={log.logId}
                            item={{
                                ...details,
                                id: log.contentId,
                                type: log.contentType,
                                itemId: log.itemId,
                            }}
                        />
                    );
                })}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                    <button
                        className="px-3 py-1 rounded bg-gray-700 text-gray-200 disabled:opacity-50"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                    >
                        {t('Önceki')}
                    </button>
                    <span className="text-gray-300 text-sm">{page} / {totalPages}</span>
                    <button
                        className="px-3 py-1 rounded bg-gray-700 text-gray-200 disabled:opacity-50"
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                    >
                        {t('Sonraki')}
                    </button>
                </div>
            )}
        </div>
    );
}

export default UserLogsPage;
