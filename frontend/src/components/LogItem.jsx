// frontend/src/components/LogItem.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// <<< YENİ: FaCheckCircle kaldırıldı, VerifiedIcon import edildi >>>
import { FaRedo, FaUserCircle, FaEllipsisV, FaSpinner } from 'react-icons/fa';
import { MdFavoriteBorder, MdFavorite } from 'react-icons/md';
import { HiOutlineChatBubbleLeft } from 'react-icons/hi2';
import VerifiedIcon from '../assets/logedelements/Verified.svg'; // SVG ikonu
import StarRating from './StarRating';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

const IMAGE_BASE_URL_W185 = 'https://image.tmdb.org/t/p/w185';
const PLACEHOLDER_IMAGE_W185 = 'https://via.placeholder.com/185x278.png?text=N/A';
const DEFAULT_AVATAR_URL = 'https://journal-app-avatars.s3.eu-north-1.amazonaws.com/avatars/SPRK_default_preset_name_custom+%E2%80%93+1.svg';

const DefaultAvatar = () => (
    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
        <FaUserCircle className="w-6 h-6 text-gray-400" />
    </div>
);


function LogItem({ log, isPinned, onPin, onUnpin, isOwnProfile, onDelete }) {
    const { t, i18n } = useTranslation();
    const [contentData, setContentData] = useState(null);
    const [loadingContent, setLoadingContent] = useState(true);
    const [errorContent, setErrorContent] = useState(null);
    const { token, user: loggedInUser } = useAuth();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(log.likeCount || 0);
    const [likeStatusLoading, setLikeStatusLoading] = useState(true);
    const [likeActionLoading, setLikeActionLoading] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const dropdownRef = React.useRef(null);

    useEffect(() => {
        if (!log || !log.contentId || !log.contentType) {
            setErrorContent("Geçersiz log verisi."); setLoadingContent(false); return;
        }
        const fetchContentData = async () => {
            setLoadingContent(true); setErrorContent(null); setContentData(null);
            const detailUrl = log.contentType === 'movie' ? `/api/movies/${log.contentId}` : `/api/tv/${log.contentId}`;
            try {
                const response = await axios.get(detailUrl); setContentData(response.data);
            } catch (err) { console.error(`LogItem: İçerik detayı çekme hatası (${log.contentType}/${log.contentId}):`, err.response?.data || err.message); setErrorContent(t('log_item_content_error')); }
            finally { setLoadingContent(false); }
        };
        fetchContentData();
    }, [log.contentId, log.contentType, t]);

     useEffect(() => {
         let isMounted = true;
         if (token && log?.logId) {
             const checkStatus = async () => {
                 setLikeStatusLoading(true);
                 try {
                     const response = await axios.get(`/api/logs/${log.logId}/like/status`, { headers: { Authorization: `Bearer ${token}` } });
                      if (isMounted) setIsLiked(response.data.isLiked);
                 } catch (err) { console.error("Like status check error:", err); if (isMounted) setIsLiked(false); }
                 finally { if (isMounted) setLikeStatusLoading(false); }
             };
              const fetchLikeCount = async () => {
                  try {
                      const response = await axios.get(`/api/logs/${log.logId}/likes`);
                      if (isMounted) setLikeCount(response.data.likeCount || 0);
                  } catch(err) {
                      console.error("Like count fetch error:", err);
                      if (isMounted) setLikeCount(log.likeCount || 0);
                  }
              };
             checkStatus();
             fetchLikeCount();
         } else {
             setIsLiked(false);
             setLikeCount(log.likeCount || 0);
             setLikeStatusLoading(false);
         }
          return () => { isMounted = false; };
     }, [log?.logId, log?.likeCount, token]);

    const handleLikeToggle = async () => {
         if (!token || likeActionLoading || likeStatusLoading || !log?.logId) return;
         setLikeActionLoading(true);
         const currentLikedStatus = isLiked;
         setIsLiked(!currentLikedStatus);
         setLikeCount(prev => currentLikedStatus ? Math.max(0, prev - 1) : prev + 1);
         try {
             const headers = { Authorization: `Bearer ${token}` };
             let response;
             if (currentLikedStatus) { response = await axios.delete(`/api/logs/${log.logId}/like`, { headers }); }
             else { response = await axios.post(`/api/logs/${log.logId}/like`, {}, { headers }); }
             if (response.data && response.data.likeCount !== undefined) {
                setLikeCount(response.data.likeCount);
             }
         } catch (error) {
             console.error("Like toggle error:", error);
             setIsLiked(currentLikedStatus);
             setLikeCount(prev => currentLikedStatus ? prev + 1 : Math.max(0, prev - 1));
         } finally { setLikeActionLoading(false); }
    };

    const handleDeleteLog = useCallback(async () => {
        if (!token || !log?.logId || isDeleting) return;
        if (!window.confirm(t('log_item_delete_confirm', 'Bu kaydı silmek istediğinizden emin misiniz?'))) {
            return;
        }
        setIsDeleting(true);
        try {
            await axios.delete(`/api/logs/${log.logId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (onDelete) {
                onDelete(log.logId);
            }
            // Silme işlemi başarılı olduğunda dropdown'u kapat
            setDropdownOpen(false);
        } catch (error) {
            console.error("Log silme hatası:", error);
            alert(t('log_item_delete_error', 'Kayıt silinirken bir hata oluştu.'));
        } finally {
            setIsDeleting(false);
        }
    }, [token, log?.logId, isDeleting, t, onDelete]);

    const title = contentData ? (log.contentType === 'movie' ? contentData.title : contentData.name) : (errorContent ? t('log_item_content_error') : t('homepage_loading'));
    const year = contentData ? (log.contentType === 'movie' ? contentData.release_date : contentData.first_air_date)?.substring(0, 4) : '';
    const detailLink = log ? (log.contentType === 'movie' ? `/movie/${log.contentId}` : `/tv/${log.contentId}`) : '#';
    const userProfileLink = log.userId ? `/user/${log.userId}` : '#';

    let timeAgo = t('log_item_time_unknown');
    if (log.createdAt) {
        try {
            const locale = i18n.language === 'tr' ? tr : enUS;
            timeAgo = formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: locale });
        } catch (e) { console.error("createdAt tarih formatı hatası:", e); }
    }

    let avatarToShow = log.userInfo?.avatarUrl || (loggedInUser?.userId === log.userId ? loggedInUser?.avatarUrl : null);
    // DisplayName ve username ayırımı
    const displayName = log.userInfo?.name || log.userInfo?.username || (loggedInUser?.userId === log.userId ? (loggedInUser?.name || loggedInUser?.username) : t('log_item_unknown_user'));
    const logUsername = log.userInfo?.username || (loggedInUser?.userId === log.userId ? loggedInUser?.username : t('log_item_unknown_user'));
    // <<< YENİ: isLogUserVerified userInfo'dan veya loggedInUser'dan alınır >>>
    const isLogUserVerified = log.userInfo?.isVerified ?? (loggedInUser?.userId === log.userId ? (loggedInUser?.isVerified ?? false) : false);

    const seasonText = log.contentType === 'tv' && log.seasonNumber !== undefined && log.seasonNumber !== null
        ? t('log_item_season_short', { season: log.seasonNumber })
        : null;

    // Dışarı tıklanınca dropdown'u kapat
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownOpen]);

    return (
        <div className="bg-neutral-900 rounded-3xl shadow-xl px-8 py-7 sm:px-10 sm:py-8 w-full max-w-3xl relative group my-1 mx-auto min-h-[180px]">
            <div className="flex items-center mb-2">
                <Link to={userProfileLink}>
                    <img src={avatarToShow || DEFAULT_AVATAR_URL} alt={`${logUsername} Avatar`} className="w-12 h-12 rounded-full mr-3 border-neutral-800 object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                        <span className="font-bold text-white text-[17px] mr-2 truncate leading-tight">{displayName}</span>
                        {isLogUserVerified && (
                            <img src={VerifiedIcon} alt={t('verified_account')} className="w-4 h-4 ml-1 align-baseline inline-block" title={t('verified_account')} />
                        )}
                    </div>
                    <div className="text-gray-400 text-sm truncate leading-tight">
                        @{logUsername} · {timeAgo}
                    </div>
                </div>
                {/* Dropdown Menü */}
                {isOwnProfile && (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            className="text-gray-400 hover:text-gray-200 p-2 ml-2 focus:outline-none"
                            onClick={() => setDropdownOpen((v) => !v)}
                            aria-haspopup="true"
                            aria-expanded={dropdownOpen}
                            aria-label="Daha fazla seçenek"
                        >
                            <FaEllipsisV className="w-5 h-5" />
                        </button>
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-36 bg-neutral-800 border border-gray-700 rounded-xl shadow-lg z-20 animate-fadeIn">
                                {/* Pinle/Sabit Kaldır */}
                                {!isPinned && (
                                    <button
                                        onClick={() => { setDropdownOpen(false); onPin && onPin(log.logId); }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-yellow-900/20 transition-colors"
                                    >
                                        📌 {t('dropdown_pin', 'Pinle')}
                                    </button>
                                )}
                                {isPinned && (
                                    <button
                                        onClick={() => { setDropdownOpen(false); onUnpin && onUnpin(log.logId); }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-yellow-900/20 transition-colors"
                                    >
                                        📌 {t('dropdown_unpin', 'Sabit Kaldır')}
                                    </button>
                                )}
                                {/* Silme butonu */}
                                <button
                                    onClick={() => { setDropdownOpen(false); handleDeleteLog(); }}
                                    disabled={isDeleting}
                                    className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                >
                                    {isDeleting ? <FaSpinner className="animate-spin w-4 h-4 mr-2" /> : '🗑️'}
                                    {t('dropdown_delete_log', 'Kaydı Sil')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {log.isRewatch && ( <span title={t('log_item_rewatch_tooltip')} className="text-blue-400 ml-2"> <FaRedo className="inline w-4 h-4" /> </span> )}
            </div>
            {/* Log metni */}
            {log.review && (
                <div className="text-white text-[15px] mb-3 leading-relaxed">
                    {log.review}
                </div>
            )}
            {/* İçerik kartı */}
            {loadingContent && <div className="h-24 bg-gray-700 rounded animate-pulse w-full mb-3"></div>}
            {errorContent && !loadingContent && <div className="text-xs text-red-400 italic mb-3">{errorContent}</div>}
            {contentData && !loadingContent && (
                <Link to={detailLink} className="block border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors mb-3">
                    <div className="flex bg-black/15">
                        <img src={contentData.poster_path ? `${IMAGE_BASE_URL_W185}${contentData.poster_path}` : PLACEHOLDER_IMAGE_W185} alt={`${title} Posteri`} className="w-20 h-auto object-cover flex-shrink-0" loading="lazy" />
                        <div className="p-3 flex flex-col justify-between">
                            <div>
                                <h5 className="font-semibold text-sm text-gray-100 line-clamp-2">{title}</h5>
                                {year && <p className="text-xs text-gray-400">({year})</p>}
                            </div>
                            {(log.rating !== undefined && log.rating !== null && log.rating !== '') && (
                                <div className="mt-1 flex items-center space-x-1">
                                    <StarRating rating={Number(log.rating)} interactive={false} size="text-base text-yellow-400" />
                                    {seasonText && (
                                        <span className="text-xs font-medium text-gray-400 bg-gray-700 px-1 rounded-sm">
                                            {seasonText}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </Link>
            )}
            {/* Alt butonlar */}
            <div className="flex items-center space-x-4 mt-1">
                {/* Yorum butonu */}
                <button className="flex items-center" title={t('log_item_comment_tooltip')}>
                    <HiOutlineChatBubbleLeft className="w-5 h-5 text-gray-400" />
                </button>
                {/* Beğen butonu */}
                <button onClick={handleLikeToggle} disabled={!token || likeActionLoading || likeStatusLoading} className={`flex items-center disabled:opacity-60`} title={isLiked ? t('log_item_unlike_tooltip') : t('log_item_like_tooltip')} >
                    {isLiked ? <MdFavorite className="w-5 h-5 text-pink-500" /> : <MdFavoriteBorder className="w-5 h-5 text-gray-400" />}
                    <span className={`text-[15px] ml-1 font-normal ${isLiked ? 'text-pink-500' : 'text-gray-400'}`}>
                        {likeStatusLoading ? t('log_item_like_loading') : likeCount}
                    </span>
                </button>
            </div>
        </div>
    );
}

export default LogItem;
