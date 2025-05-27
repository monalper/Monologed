// src/pages/SeasonDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import LogEntryModal from '../components/LogEntryModal';
import { FaSpinner, FaInfoCircle, FaArrowLeft, FaCheckCircle, FaRegCheckCircle, FaPencilAlt, FaImage } from 'react-icons/fa';
import { useTranslation } from 'react-i18next'; // *** useTranslation import edildi ***

// Sabitler
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
const SEASON_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const MAIN_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const STILL_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const PLACEHOLDER_BACKDROP = 'https://via.placeholder.com/1280x720.png?text=Sezon+Detayı';
const PLACEHOLDER_SEASON_POSTER = 'https://via.placeholder.com/500x750.png?text=Sezon+Posteri+Yok';

function SeasonDetailPage() {
    const { t, i18n } = useTranslation(); // *** t ve i18n alındı ***
    const { tvId, seasonNumber } = useParams();
    const { token, user } = useAuth();
    const navigate = useNavigate();

    // State'ler
    const [seasonData, setSeasonData] = useState(null);
    const [tvShowInfo, setTvShowInfo] = useState({ name: '', poster_path: null });
    const [episodes, setEpisodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userLogs, setUserLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const [markingEpisode, setMarkingEpisode] = useState(null);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [logModalData, setLogModalData] = useState({ episode: null, existingLog: null });

    // Veri Çekme Fonksiyonu
    const fetchData = useCallback(async () => {
        setLoading(true); setLogsLoading(true); setError(null);
        setSeasonData(null); setEpisodes([]); setUserLogs([]); setTvShowInfo({ name: '', poster_path: null });

        if (!tvId || !seasonNumber) { setError(t('season_page_error_missing_info')); setLoading(false); setLogsLoading(false); return; }

        const fetchSeasonAndEpisodesPromise = api.get(`/api/tv/${tvId}/season/${seasonNumber}/episodes`);
        const fetchTvInfoPromise = api.get(`/api/tv/${tvId}?language=en-US`); // Ana dizi adı İngilizce
        let fetchLogsPromise = Promise.resolve({ data: { logs: [] } });
        if (token) { fetchLogsPromise = api.get(`/api/logs`, { params: { contentId: tvId, contentType: 'tv' } }); }

        try {
            const [seasonRes, tvRes, logRes] = await Promise.allSettled([
                fetchSeasonAndEpisodesPromise, fetchTvInfoPromise, fetchLogsPromise
            ]);

            if (seasonRes.status === 'fulfilled' && seasonRes.value.data) {
                setSeasonData(seasonRes.value.data);
                setEpisodes(seasonRes.value.data.episodes || []);
            } else {
                setSeasonData({ name: `${t('season_page_season_prefix')} ${seasonNumber}`, poster_path: null }); setEpisodes([]);
                console.error("Sezon/Bölüm bilgileri alınamadı:", seasonRes.reason?.response?.data?.message || seasonRes.reason);
            }
            if (tvRes.status === 'fulfilled' && tvRes.value.data) {
                setTvShowInfo({ name: tvRes.value.data.name || '', poster_path: tvRes.value.data.poster_path || null });
            } else { console.warn("Dizi adı ve ana posteri alınamadı:", tvRes.reason?.response?.data?.message || tvRes.reason); }
            if (logRes.status === 'fulfilled' && logRes.value.data) { setUserLogs(logRes.value.data.logs || []); }
            else if (token) { console.error("Kullanıcı logları çekilirken hata:", logRes.reason); }
            setLogsLoading(false);
        } catch (err) {
            console.error("Sezon sayfası veri çekme genel hatası:", err);
            setError(err.message || t('season_page_error_load'));
            setSeasonData(prev => prev || { name: `${t('season_page_season_prefix')} ${seasonNumber}`, poster_path: null });
            setEpisodes([]); setUserLogs([]); setLogsLoading(false);
        } finally { setLoading(false); }
    }, [tvId, seasonNumber, token, t]); // t eklendi

    useEffect(() => { fetchData(); }, [fetchData]);

    // Yardımcı Fonksiyonlar
    const isEpisodeWatched = useCallback((episodeNum) => {
        if (logsLoading || !userLogs) return false;
        return userLogs.some(log => log.seasonNumber === Number(seasonNumber) && log.episodeNumber === episodeNum);
    }, [userLogs, seasonNumber, logsLoading]);

    const handleMarkEpisodeAsWatched = useCallback(async (episodeNum) => {
        if (!token || markingEpisode) return;
        setMarkingEpisode({ episode_number: episodeNum });
        try {
            await api.post('/api/logs', {
                contentId: Number(tvId), contentType: 'tv',
                watchedDate: new Date().toISOString().split('T')[0],
                seasonNumber: Number(seasonNumber), episodeNumber: episodeNum,
            }, { headers: { Authorization: `Bearer ${token}` } }); // Token ekle
            await fetchData();
        } catch (error) {
            console.error(`Bölüm S${seasonNumber}E${episodeNum} işaretlenirken hata:`, error.response?.data || error.message);
            alert(`Bölüm işaretlenirken bir hata oluştu: ${error.response?.data?.message || 'Tekrar deneyin.'}`);
        } finally {
            setMarkingEpisode(null);
        }
    }, [token, tvId, seasonNumber, markingEpisode, fetchData]);

    const openLogModal = useCallback((episodeNum) => {
        const existingLog = userLogs.find(log => log.seasonNumber === Number(seasonNumber) && log.episodeNumber === episodeNum);
        setLogModalData({ season: String(seasonNumber), episode: String(episodeNum), existingLog: existingLog });
        setIsLogModalOpen(true);
    }, [userLogs, seasonNumber]);

    const handleLogSavedOrDeleted = useCallback(() => { fetchData(); }, [fetchData]);

    // Render
    if (loading) return <div className="container mx-auto px-4 py-8 text-center"><FaSpinner className="animate-spin text-2xl inline-block mr-2" /> {t('season_page_loading')}</div>;
    if (error) return <div className="container mx-auto px-4 py-8 text-center text-red-500"><FaInfoCircle className="inline mr-2"/> {error}</div>;
    if (!seasonData && !loading) return <div className="container mx-auto px-4 py-8 text-center text-gray-500">{t('season_page_not_found')}</div>;

    const seriesName = tvShowInfo.name || t('season_page_back_button_default');
    const seasonName = seasonData?.name || `${t('season_page_season_prefix')} ${seasonNumber}`;

    return (
        <>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Geri Dön Butonu */}
                <button onClick={() => navigate(`/tv/${tvId}`)} className="mb-6 inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-md border dark:border-gray-700 shadow-sm transition-colors">
                    <FaArrowLeft className="mr-2" /> {t('season_page_back_button', { seriesName: seriesName })}
                </button>

                {/* Sezon Başlığı, Posteri ve Özeti */}
                <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 pb-6 border-b dark:border-gray-700">
                     <div className="flex-shrink-0 w-32 sm:w-40 md:w-48">
                         <img
                             src={seasonData?.poster_path ? `${SEASON_POSTER_BASE_URL}${seasonData.poster_path}` : (tvShowInfo.poster_path ? `${MAIN_POSTER_BASE_URL}${tvShowInfo.poster_path}` : PLACEHOLDER_SEASON_POSTER)}
                             alt={`${tvShowInfo.name || 'Dizi'} - ${seasonName} Posteri`}
                             className="w-full h-auto object-cover rounded-lg shadow-md border dark:border-gray-600"
                         />
                     </div>
                     <div className="flex-1">
                         <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                             {tvShowInfo.name || t('loading')}
                         </h1>
                         <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                             {seasonName}
                         </h2>
                         {seasonData?.air_date && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                {t('season_page_air_date_prefix')} {new Date(seasonData.air_date).toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                         )}
                         {seasonData?.overview && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{seasonData.overview}</p>
                         )}
                     </div>
                </div>

                {/* Bölüm Listesi */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('season_page_episodes_title', { count: episodes.length })}</h3>
                    {logsLoading && <p className="text-gray-500 italic text-center py-4">{t('season_page_log_status_loading')}</p>}
                    {episodes.length === 0 && !loading && !logsLoading && <p className="text-gray-500 italic text-center py-4">{t('season_page_no_episodes')}</p>}

                    {episodes.map(episode => {
                        const watched = isEpisodeWatched(episode.episode_number);
                        const isMarkingThis = markingEpisode?.episode_number === episode.episode_number;
                        const episodeLog = userLogs.find(log => log.seasonNumber === Number(seasonNumber) && log.episodeNumber === episode.episode_number);
                        const episodeName = episode.name || t('season_page_no_episode_name');

                        return (
                            <div key={episode.id} className={`flex flex-col sm:flex-row items-start gap-4 p-4 border rounded-lg dark:border-gray-700 transition-opacity duration-300 ${watched ? 'bg-gray-100 dark:bg-gray-800/30 opacity-70' : 'bg-white dark:bg-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                <div className="flex-shrink-0 w-full sm:w-40 md:w-48">
                                    {episode.still_path ? (
                                        <img src={`${STILL_BASE_URL}${episode.still_path}`} alt={t('season_page_image_alt', { number: episode.episode_number })} className="w-full h-auto object-cover rounded-md aspect-video bg-gray-300 dark:bg-gray-700" loading="lazy" />
                                    ) : (
                                        <div className="w-full aspect-video bg-gray-200 dark:bg-gray-700/50 rounded-md flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                            <FaImage className="w-8 h-8 opacity-60 mb-1" />
                                            <span className="text-xs font-medium">{t('season_page_no_image_text')}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between min-h-[100px]">
                                    <div>
                                        <h4 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">
                                            {t('season_page_episode_prefix')}{episode.episode_number}. {episodeName}
                                        </h4>
                                        {episode.air_date && <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{new Date(episode.air_date).toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
                                        {episode.overview && <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">{episode.overview}</p>}
                                    </div>
                                    <div className="flex items-center justify-between flex-wrap gap-2 mt-auto pt-2 border-t border-gray-200 dark:border-gray-700/50">
                                        <StarRating rating={episodeLog?.rating ? Number(episodeLog.rating) : null} interactive={false} size="text-lg" />
                                        {token && (
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => openLogModal(episode.episode_number)} className="p-1.5 text-gray-500 hover:text-cyan-500 dark:text-gray-400 dark:hover:text-cyan-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title={t('season_page_edit_log_tooltip')} aria-label={t('season_page_edit_log_aria', { number: episode.episode_number })}> <FaPencilAlt className="w-4 h-4" /> </button>
                                                <button onClick={() => handleMarkEpisodeAsWatched(episode.episode_number)} disabled={isMarkingThis || watched} className={`p-1.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${watched ? 'text-green-500 cursor-default' : 'text-gray-400 hover:text-white hover:bg-green-600'}`} title={watched ? t('season_page_mark_unwatched_tooltip') : t('season_page_mark_watched_tooltip')} aria-label={watched ? t('season_page_mark_unwatched_aria', { number: episode.episode_number }) : t('season_page_mark_watched_aria', { number: episode.episode_number })}>
                                                    {isMarkingThis ? <FaSpinner className="animate-spin w-5 h-5" /> : watched ? <FaCheckCircle className="w-5 h-5" /> : <FaRegCheckCircle className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                 {/* Log Modalı */}
                 {token && (
                     <LogEntryModal
                         isOpen={isLogModalOpen}
                         onClose={() => setIsLogModalOpen(false)}
                         contentId={Number(tvId)}
                         contentType="tv"
                         existingLogData={logModalData.existingLog}
                         onLogSaved={handleLogSavedOrDeleted}
                         onLogDeleted={handleLogSavedOrDeleted}
                         initialSeason={logModalData.season}
                         initialEpisode={logModalData.episode}
                     />
                 )}
            </div>
        </>
    );
}

export default SeasonDetailPage;
