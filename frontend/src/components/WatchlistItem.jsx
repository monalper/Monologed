// frontend/src/components/WatchlistItem.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FaRegClock, FaTrash, FaFilm, FaTv, FaSpinner, FaExclamationCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next'; // useTranslation import edildi
import { useAuth } from '../context/AuthContext'; // Token almak için

// Sabitler
const IMAGE_BASE_URL_W92 = 'https://image.tmdb.org/t/p/w92';
const PLACEHOLDER_IMAGE_W92 = 'https://via.placeholder.com/92x138.png?text=N/A';

function WatchlistItem({ item, onRemove }) {
    // *** DÜZELTME: i18n nesnesi de alındı ***
    const { t, i18n } = useTranslation();
    const { token } = useAuth(); // Token'ı al
    const [contentData, setContentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [removeError, setRemoveError] = useState(null);

    // Film veya Dizi detaylarını çekme
    useEffect(() => {
        if (!item || !item.contentId || !item.contentType) {
            setError(t('watchlist_item_invalid_data'));
            setLoading(false); return;
        }
        const fetchContentData = async () => {
            setLoading(true); setError(null); setContentData(null); setRemoveError(null);
            const detailUrl = item.contentType === 'movie'
                ? `/api/movies/${item.contentId}`
                : `/api/tv/${item.contentId}`;
            try {
                const response = await axios.get(detailUrl);
                setContentData(response.data);
            } catch (err) {
                console.error(`WatchlistItem: İçerik detayı çekme hatası (${item.contentType}/${item.contentId}):`, err.response?.data || err.message);
                setError(t('watchlist_item_error_fetch'));
            } finally { setLoading(false); }
        };
        fetchContentData();
    }, [item, t]); // t bağımlılıklara eklendi

    // Kaldırma işlemi
    const handleRemove = async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (isRemoving || !item || !item.itemId || !token) return;
        setIsRemoving(true); setRemoveError(null);
        try {
            await axios.delete(`/api/watchlist/${item.itemId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (onRemove) onRemove(item.itemId);
        } catch (err) {
            console.error(`WatchlistItem: Öğe kaldırma hatası (ItemId: ${item.itemId}):`, err.response?.data || err.message);
            setRemoveError(t('watchlist_item_error_remove', { message: err.response?.data?.message || 'Hata' }));
            setTimeout(() => setRemoveError(null), 3000);
        } finally {
            setIsRemoving(false);
        }
    };

    // Tarih formatlama
    const formattedAddedDate = item.addedAt
        // *** DÜZELTME: i18n artık tanımlı ***
        ? new Date(item.addedAt).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' })
        : t('watchlist_item_date_unknown');

    // Render edilecek başlık ve yılı belirle
    const title = contentData ? (item.contentType === 'movie' ? contentData.title : contentData.name) : (error ? t('watchlist_item_error_title') : t('watchlist_item_loading_title'));
    const year = contentData ? (item.contentType === 'movie' ? contentData.release_date : contentData.first_air_date)?.substring(0, 4) : '';
    const detailLink = item ? (item.contentType === 'movie' ? `/movie/${item.contentId}` : `/tv/${item.contentId}`) : '#';

    return (
        <div className="relative group bg-white dark:bg-gray-800/50 rounded-md transition-colors duration-200 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 overflow-hidden">
            <Link to={detailLink} className="flex items-center space-x-3 p-3 relative z-10">
                {/* Poster Alanı */}
                <div className="flex-shrink-0 w-12">
                    {loading && (
                        <div className="w-full aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse flex items-center justify-center">
                            <FaSpinner className="animate-spin text-gray-400 w-4 h-4" />
                        </div>
                    )}
                    {!loading && contentData && (
                        <img
                            src={contentData.poster_path ? `${IMAGE_BASE_URL_W92}${contentData.poster_path}` : PLACEHOLDER_IMAGE_W92}
                            alt=""
                            className="w-full h-auto rounded-sm object-cover"
                            loading="lazy"
                        />
                    )}
                    {!loading && error && (
                         <div className="w-full aspect-[2/3] bg-red-100 dark:bg-red-900/20 rounded-sm flex items-center justify-center text-red-500" title={error}>
                            <FaExclamationCircle className="w-4 h-4"/>
                         </div>
                    )}
                </div>

                {/* İçerik Bilgileri Alanı */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" title={title}>
                        {title}
                    </h4>
                    {year && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            ({year})
                        </p>
                    )}
                    <span className={`text-[10px] mt-1 inline-block ${item.contentType === 'movie' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                        {item.contentType === 'movie' ? <FaFilm title={t('type_movie')}/> : <FaTv title={t('type_tv')}/>}
                    </span>
                </div>

                {/* Eklenme Tarihi */}
                <div className="flex-shrink-0 text-right ml-2">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap" title={t('watchlist_item_tooltip_added', { date: formattedAddedDate })}>
                        <FaRegClock className="inline mr-1 opacity-70" />
                        {formattedAddedDate}
                    </p>
                </div>
            </Link>

            {/* Kırmızı Fade Efekti Overlay */}
            <div
                className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-gray-800/100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out pointer-events-none z-10"
                aria-hidden="true"
            />

            {/* Kaldır Butonu */}
            <button
                onClick={handleRemove}
                disabled={isRemoving || !token}
                className={`absolute top-1/2 right-2 transform -translate-y-1/2 z-20 p-1 rounded-full bg-gray-200 dark:bg-gray-700/80 text-gray-500 dark:text-gray-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed`}
                title={t('watchlist_item_remove_button_title')}
                aria-label={t('watchlist_item_remove_button_aria', { title: title })}
            >
                {isRemoving ? <FaSpinner className="animate-spin w-3.5 h-3.5" /> : <FaTrash className="w-3 h-3" />}
            </button>

             {/* Hata Mesajı */}
             {removeError && (
                 <div className="absolute bottom-1 right-1 bg-red-500/80 text-white text-[10px] px-1.5 py-0.5 rounded-sm opacity-90 z-10" title={removeError}>
                     {t('watchlist_item_error_badge')}
                 </div>
             )}
        </div>
    );
}

export default WatchlistItem;
