import React, { useState, useEffect, useCallback } from 'react';
import { FaEye, FaListUl, FaCheck, FaSpinner, FaRegEye, FaClock } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

/**
 * TopCard - Editöryel Top List kartı
 * @param {object} props
 * @param {number} index - Sıra numarası (1'den başlar)
 * @param {string} poster - Poster görseli URL
 * @param {string} title - Başlık
 * @param {string|number} year - Yıl
 * @param {string} overview - Açıklama (opsiyonel)
 * @param {string} runtime - Süre (saat:dakika veya dk)
 * @param {number} vote - Puan (opsiyonel)
 * @param {string} director - Yönetmen (opsiyonel)
 * @param {function} onMarkWatched - İzledi olarak işaretle
 * @param {function} onAddToList - Listeye ekle
 * @param {number} contentId - İçeriğin ID'si
 * @param {string} contentType - İçeriğin tipi ('movie' veya 'tv')
 */
function TopCard({
  index,
  poster,
  title,
  year,
  overview,
  runtime,
  vote,
  director,
  onMarkWatched,
  onAddToList,
  contentId,
  contentType
}) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [watchlistItemId, setWatchlistItemId] = useState(null);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
  const [watchlistStatusLoading, setWatchlistStatusLoading] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [watchedStatusLoading, setWatchedStatusLoading] = useState(false);

  // Watchlist durumunu kontrol et
  const fetchWatchlistStatus = useCallback(async () => {
    if (!token || !contentId || !contentType) {
      setWatchlistStatusLoading(false);
      setIsInWatchlist(false);
      setWatchlistItemId(null);
      return;
    }
    setWatchlistStatusLoading(true);
    try {
      const response = await axios.get(`/api/watchlist/status/${contentType}/${contentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsInWatchlist(response.data.isInWatchlist);
      setWatchlistItemId(response.data.itemId || null);
    } catch (error) {
      console.error(`Watchlist durumu kontrol hatası (${contentType}/${contentId}):`, error);
      setIsInWatchlist(false);
      setWatchlistItemId(null);
    } finally {
      setWatchlistStatusLoading(false);
    }
  }, [token, contentId, contentType]);

  // İzlenme durumunu kontrol et
  const fetchWatchedStatus = useCallback(async () => {
    if (!token || !contentId || !contentType) {
      setWatchedStatusLoading(false);
      setIsWatched(false);
      return;
    }
    setWatchedStatusLoading(true);
    try {
      const response = await axios.get(`/api/logs`, {
        params: { contentId, contentType },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (contentType === 'movie') {
        setIsWatched((response.data.logs || []).length > 0);
      } else {
        // Dizi için genel log var mı kontrol et
        const logs = response.data.logs || [];
        const hasGeneralLog = logs.some(log => log.seasonNumber === undefined || log.seasonNumber === null);
        setIsWatched(hasGeneralLog);
      }
    } catch (error) {
      setIsWatched(false);
    } finally {
      setWatchedStatusLoading(false);
    }
  }, [token, contentId, contentType]);

  // Bileşen mount olduğunda ve bağımlılıklar değiştiğinde watchlist ve izlenme durumunu kontrol et
  useEffect(() => {
    fetchWatchlistStatus();
    fetchWatchedStatus();
  }, [fetchWatchlistStatus, fetchWatchedStatus]);

  // İzledi olarak işaretle/kaldır
  const handleToggleWatched = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || watchedStatusLoading) return;
    setWatchedStatusLoading(true);
    const currentStatus = isWatched;
    try {
      if (currentStatus) {
        // İzlenmişse, ilk logu sil
        const response = await axios.get(`/api/logs`, {
          params: { contentId, contentType },
          headers: { Authorization: `Bearer ${token}` }
        });
        let logId = null;
        if (contentType === 'movie') {
          logId = (response.data.logs || [])[0]?.logId;
        } else {
          const logs = response.data.logs || [];
          const generalLog = logs.find(log => log.seasonNumber === undefined || log.seasonNumber === null);
          logId = generalLog?.logId;
        }
        if (logId) {
          await axios.delete(`/api/logs/${logId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        setIsWatched(false);
      } else {
        // İzlenmemişse, yeni log ekle
        await axios.post(`/api/logs`, {
          contentId,
          contentType,
          watchedDate: new Date().toISOString().split('T')[0]
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsWatched(true);
      }
    } catch (error) {
      setIsWatched(currentStatus);
    } finally {
      setWatchedStatusLoading(false);
    }
  };

  // Watchlist ekleme/kaldırma işlemi
  const handleToggleWatchlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || isTogglingWatchlist || watchlistStatusLoading) return;
    setIsTogglingWatchlist(true);
    const currentStatus = isInWatchlist;
    const currentItemId = watchlistItemId;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (currentStatus && currentItemId) {
        await axios.delete(`/api/watchlist/${currentItemId}`, { headers });
        setIsInWatchlist(false);
        setWatchlistItemId(null);
      } else if (!currentStatus) {
        const response = await axios.post(`/api/watchlist`, 
          { contentId, contentType }, 
          { headers }
        );
        setIsInWatchlist(true);
        setWatchlistItemId(response.data.item?.itemId || response.data.itemId || null);
      }
    } catch (error) {
      console.error(`Watchlist işlemi hatası (${contentType}/${contentId}):`, error);
      setIsInWatchlist(currentStatus);
      setWatchlistItemId(currentItemId);
    } finally {
      setIsTogglingWatchlist(false);
    }
  };

  return (
    <div className="flex items-stretch bg-black rounded-2xl shadow-xl overflow-hidden relative min-h-[180px]">
      {/* Sıra numarası */}
      <div className="flex flex-col justify-center items-center px-4 select-none">
        <span className="text-white text-4xl font-extrabold leading-none drop-shadow-lg">{index}</span>
      </div>
      {/* Poster */}
      <div className="flex-shrink-0 flex items-center">
        <img
          src={poster}
          alt={title}
          className="w-28 h-40 object-cover rounded-xl bg-white shadow"
        />
      </div>
      {/* Sağ taraf */}
      <div className="flex-1 flex flex-col justify-center pl-6 pr-6 py-5">
        <div className="mb-1">
          <h2 className="text-2xl font-extrabold text-white leading-tight mb-1">
            {title} {year && <span className="text-lg text-gray-400 font-light">({year})</span>}
          </h2>
        </div>
        {overview && <p className="text-base text-white font-semibold leading-snug mb-4 max-w-2xl whitespace-pre-line" style={{lineHeight:'1.35'}}>{overview}</p>}
        <div className="flex items-center gap-5 text-base text-gray-300 font-medium mb-4">
          {year && <span>{year}</span>}
          {runtime && <span>{runtime}</span>}
          {vote && <span className="flex items-center gap-1 text-yellow-400"><span className="text-lg">★</span> {vote}</span>}
          {director && <span className="text-gray-300">Director: {director}</span>}
        </div>
        <div className="flex items-center gap-4 mt-1">
          <button type="button" onClick={handleToggleWatched} disabled={watchedStatusLoading} className={`flex items-center gap-2 px-5 py-2.5 rounded-full ${isWatched ? 'bg-white text-black font-bold' : 'bg-gray-800 text-white'} text-base shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed`}>
            {watchedStatusLoading ? (
              <FaSpinner className="animate-spin text-base"/>
            ) : (
              <FaEye className="text-base"/>
            )}
            {isWatched ? 'Watched' : 'Mark as Watched'}
          </button>
          <button type="button" onClick={onAddToList} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-800 text-white text-base shadow-lg transition"><FaListUl className="text-base"/>List</button>
          <button 
            type="button" 
            onClick={handleToggleWatchlist}
            disabled={isTogglingWatchlist || watchlistStatusLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full ${isInWatchlist ? 'bg-white text-black font-bold ring-2 ring-blue-400' : 'bg-gray-800 text-white'} text-base shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {watchlistStatusLoading || isTogglingWatchlist ? (
              <FaSpinner className="animate-spin text-base"/>
            ) : (
              <FaClock className="text-base"/>
            )}
            {isInWatchlist ? 'Watchlist' : 'Add to Watchlist'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TopCard; 