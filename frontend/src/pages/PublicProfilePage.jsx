// frontend/src/pages/PublicProfilePage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LogItem from '../components/LogItem';
import PostItem from '../components/PostItem';
import Badge from '../components/Badge';
import ListPreviewCard from '../components/ListPreviewCard';
import { useTranslation } from 'react-i18next';
import { FaCalendarAlt, FaCog, FaUserCheck, FaUserPlus, FaUsers, FaUserCircle, FaSpinner, FaCheckCircle, FaAward, FaStream, FaExclamationCircle, FaListUl, FaRegClock, FaArrowRight, FaChartBar, FaFilm, FaTv, FaHourglassHalf } from 'react-icons/fa';

const DEFAULT_AVATAR_URL = 'https://journal-app-avatars.s3.eu-north-1.amazonaws.com/avatars/SPRK_default_preset_name_custom+%E2%80%93+1.svg';
const DefaultLargeAvatar = () => (
    <img src={DEFAULT_AVATAR_URL} alt="Varsayılan Profil" className="w-24 h-24 rounded-full object-cover bg-gray-100 dark:bg-gray-800" />
);

// Yüklenme Göstergesi
const LoadingIndicator = ({ text }) => (
    <div className="flex justify-center items-center min-h-[100px] text-gray-500 dark:text-gray-400">
        <FaSpinner className="animate-spin text-brand text-xl mr-2" />
        {text}
    </div>
);

// Hata Göstergesi
const ErrorDisplay = ({ message }) => (
    <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm">
        <FaExclamationCircle className="w-4 h-4 mx-auto mb-1" />
        {message || "Bir hata oluştu."}
    </div>
);

// İzleme Listesi Öğesi Posterlerini Çekme Hook'u
const useFetchWatchlistPosters = (watchlistItems) => {
    const [posters, setPosters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const MAX_POSTERS_TO_FETCH = 5;

    useEffect(() => {
        const itemsToFetch = (watchlistItems || []).slice(0, MAX_POSTERS_TO_FETCH);
        if (itemsToFetch.length === 0) { setPosters([]); setLoading(false); setError(null); return; }
        const fetchPosters = async () => {
            setLoading(true); setError(null); setPosters([]);
            try {
                const posterPromises = itemsToFetch.map(item => {
                    if (!item.contentId || !item.contentType) return Promise.resolve(null);
                    const detailUrl = item.contentType === 'movie' ? `/api/movies/${item.contentId}` : `/api/tv/${item.contentId}`;
                    return axios.get(detailUrl, { params: { language: 'en-US', append_to_response: '' } })
                        .then(res => res.data?.poster_path || null)
                        .catch(err => { console.warn(`PublicProfile: Watchlist poster çekme hatası (${item.contentType}/${item.contentId}):`, err.message); return null; });
                });
                const posterResults = await Promise.all(posterPromises);
                setPosters(posterResults.filter(p => p !== null));
            } catch (err) { console.error("PublicProfile: Watchlist poster çekme genel hata:", err); setError("İzleme listesi posterleri yüklenirken bir sorun oluştu."); setPosters([]); }
            finally { setLoading(false); }
        };
        fetchPosters();
    }, [watchlistItems]);
    return { posters, loading, error };
};

function PublicProfilePage() {
    const { t, i18n } = useTranslation();
    const { userId: profileUserId } = useParams();
    const { user: loggedInUser, token } = useAuth();
    const navigate = useNavigate();

    // State değişkenleri aynı kalacak...
    const [profileUser, setProfileUser] = useState(null);
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState(null);
    const [isFollowLoading, setIsFollowLoading] = useState(true);
    const [isTogglingFollow, setIsTogglingFollow] = useState(false);
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const [logsError, setLogsError] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [achievementsLoading, setAchievementsLoading] = useState(true);
    const [achievementsError, setAchievementsError] = useState(null);
    const [lists, setLists] = useState([]);
    const [listsLoading, setListsLoading] = useState(true);
    const [listsError, setListsError] = useState(null);
    const [watchlistItems, setWatchlistItems] = useState([]);
    const [watchlistFetchLoading, setWatchlistFetchLoading] = useState(true);
    const [watchlistFetchError, setWatchlistFetchError] = useState(null);
    const { posters: watchlistPosters, loading: watchlistPostersLoading, error: watchlistPostersError } = useFetchWatchlistPosters(watchlistItems);
    const [profileStats, setProfileStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState(null);
    const [activeTab, setActiveTab] = useState('logs');

    const isOwnProfile = loggedInUser?.userId === profileUserId;

    const latestAchievement = useMemo(() => {
        if (!achievements || achievements.length === 0) return null;
        const sortedAchievements = [...achievements].sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));
        return sortedAchievements[0];
    }, [achievements]);

    const maxGenreCount = useMemo(() => {
        if (!profileStats?.topGenres || profileStats.topGenres.length === 0) return 0;
        const validCounts = profileStats.topGenres.map(g => g.count).filter(count => typeof count === 'number' && !isNaN(count));
        if (validCounts.length === 0) return 0;
        return Math.max(...validCounts);
    }, [profileStats?.topGenres]);

    // Temel profil verilerini çekme
    useEffect(() => {
        const fetchProfileBaseData = async () => {
            if (!profileUserId) {
                setProfileError(t('error_user_id_missing'));
                setIsLoadingProfile(false);
                return;
            }

            try {
                const [profileRes, followersRes, followingRes, followStatusRes] = await Promise.allSettled([
                    axios.get(`/api/users/public/${profileUserId}`),
                    axios.get(`/api/users/${profileUserId}/followers`),
                    axios.get(`/api/users/${profileUserId}/following`),
                    token && !isOwnProfile 
                        ? axios.get(`/api/follow/status/${profileUserId}`, { 
                            headers: { Authorization: `Bearer ${token}` } 
                        })
                        : Promise.resolve({ data: { isFollowing: false } })
                ]);

                if (profileRes.status === 'fulfilled' && profileRes.value.data?.user) {
                    setProfileUser({
                        ...profileRes.value.data.user,
                        isVerified: profileRes.value.data.user.isVerified ?? false
                    });
                } else {
                    throw new Error(profileRes.reason?.response?.data?.message || "Kullanıcı verisi alınamadı.");
                }

                if (followersRes.status === 'fulfilled') {
                    setFollowers(followersRes.value.data.followers || []);
                }

                if (followingRes.status === 'fulfilled') {
                    setFollowing(followingRes.value.data.following || []);
                }

                if (followStatusRes.status === 'fulfilled' && !isOwnProfile) {
                    setIsFollowing(followStatusRes.value.data.isFollowing);
                }
            } catch (err) {
                console.error("PublicProfilePage Base Data Error:", err);
                setProfileError(
                    err.message.includes("404") || err.response?.status === 404
                        ? t('public_profile_not_found')
                        : t('public_profile_error')
                );
                setProfileUser(null);
            } finally {
                setIsLoadingProfile(false);
                setIsFollowLoading(false);
            }
        };

        fetchProfileBaseData();
    }, [profileUserId, token, isOwnProfile, t]);

    // Kullanıcı loglarını çekme
    useEffect(() => {
        const fetchUserLogs = async () => {
            if (!profileUserId || isLoadingProfile || !profileUser) {
                setLogsLoading(false);
                return;
            }

                try {
                    const response = await axios.get(`/api/logs/user/${profileUserId}`);
                    const itemsWithPostType = (response.data.logs || []).map(item => ({
                        ...item,
                        postType: item.postType || 'log'
                    }));
                    setLogs(itemsWithPostType);
                } catch (err) {
                console.error("PublicProfilePage Logs Error:", err);
                    setLogsError(t('public_profile_activity_error'));
                    setLogs([]);
                } finally {
                    setLogsLoading(false);
                }
            };

        fetchUserLogs();
    }, [profileUserId, isLoadingProfile, profileUser, t]);

    // Başarımları çekme
    useEffect(() => {
        const fetchAchievements = async () => {
            if (!profileUserId || isLoadingProfile || !profileUser) {
                setAchievementsLoading(false);
                return;
            }

            try {
                const response = await axios.get(`/api/achievements/user/${profileUserId}`, {
                    validateStatus: function (status) {
                        return status < 500; // 500'den küçük tüm status kodlarını kabul et
                    }
                });

                if (response.status === 200 && response.data?.achievements) {
                    setAchievements(response.data.achievements);
                } else {
                    console.warn("Başarımlar yüklenemedi:", response.status);
                    setAchievements([]);
                }
            } catch (err) {
                console.error("PublicProfilePage Achievements Error:", err);
                setAchievementsError(t('public_profile_badge_error'));
                setAchievements([]);
            } finally {
                setAchievementsLoading(false);
            }
        };

        fetchAchievements();
    }, [profileUserId, isLoadingProfile, profileUser, t]);

    // Listeleri çekme
    useEffect(() => {
        const fetchUserLists = async () => {
            if (!profileUserId || isLoadingProfile || !profileUser) {
                setListsLoading(false);
                return;
            }

            try {
                const response = await axios.get(`/api/lists/user/${profileUserId}`);
                setLists(response.data.lists || []);
            } catch (err) {
                console.error("PublicProfilePage Lists Error:", err);
                setListsError(t('public_profile_lists_error'));
                setLists([]);
            } finally {
                setListsLoading(false);
            }
        };

        fetchUserLists();
    }, [profileUserId, isLoadingProfile, profileUser, t]);

    // İzleme listesini çekme
    useEffect(() => {
        const fetchWatchlist = async () => {
            if (!profileUserId || isLoadingProfile || !profileUser) {
                setWatchlistFetchLoading(false);
                return;
            }

            try {
                const response = await axios.get(`/api/watchlist/user/${profileUserId}`);
                setWatchlistItems(response.data.watchlist || []);
            } catch (err) {
                console.error("PublicProfilePage Watchlist Error:", err);
                setWatchlistFetchError(t('public_profile_watchlist_error'));
                setWatchlistItems([]);
            } finally {
                setWatchlistFetchLoading(false);
            }
        };

        fetchWatchlist();
    }, [profileUserId, isLoadingProfile, profileUser, t]);

    // İstatistikleri çekme
    useEffect(() => {
        const fetchStats = async () => {
            if (!profileUserId || isLoadingProfile || !profileUser) {
                setStatsLoading(false);
                return;
            }

            try {
                const response = await axios.get(`/api/users/${profileUserId}/stats`);
                setProfileStats(response.data || null);
            } catch (err) {
                console.error("PublicProfilePage Stats Error:", err);
                setStatsError(t('public_profile_stats_error'));
                setProfileStats(null);
            } finally {
                setStatsLoading(false);
            }
        };

        fetchStats();
    }, [profileUserId, isLoadingProfile, profileUser, t]);

    // Post silme işlemi için handler
    const handleDeletePost = useCallback(async (postId) => {
        if (!token || !postId) return;
        
        try {
            await axios.delete(`/api/posts/${postId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Silinen postu listeden kaldır
            setLogs(prevLogs => prevLogs.filter(log => log.logId !== postId));
        } catch (err) {
            console.error("Post silme hatası:", err);
        }
    }, [token]);

    // Sabitlenmiş log/post'u bul
    const pinnedLogId = profileUser?.pinnedLogId;
    const pinnedLog = pinnedLogId ? logs.find(l => l.logId === pinnedLogId) : null;
    const otherLogs = pinnedLog ? logs.filter(l => l.logId !== pinnedLogId) : logs;

    // Pin/Unpin işlemleri için fonksiyonlar
    const handlePinLog = async (logId) => {
        if (!isOwnProfile || !token) return;
        try {
            await axios.post(`/api/users/${profileUserId}/pin`, { logId }, { headers: { Authorization: `Bearer ${token}` } });
            setProfileUser(prev => ({ ...prev, pinnedLogId: logId }));
        } catch (err) {
            alert('Pinleme işlemi başarısız.');
        }
    };
    const handleUnpinLog = async () => {
        if (!isOwnProfile || !token) return;
        try {
            await axios.post(`/api/users/${profileUserId}/pin`, { logId: null }, { headers: { Authorization: `Bearer ${token}` } });
            setProfileUser(prev => ({ ...prev, pinnedLogId: null }));
        } catch (err) {
            alert('Sabit kaldırma işlemi başarısız.');
        }
    };

    // Takip/Takipten Çık işlemi için fonksiyonlar
    const handleToggleFollow = async () => {
        if (!token || !profileUserId) return;
        const wasFollowing = isFollowing;
        setIsTogglingFollow(true);

        // Optimistic update: Takipçi listesini anlık güncelle
        setFollowers(prev =>
            wasFollowing
                ? prev.filter(f => f.followerUserId !== loggedInUser.userId)
                : [...prev, { followerUserId: loggedInUser.userId, followedAt: new Date().toISOString() }]
        );

        try {
            const response = await axios.post(`/api/follow/toggle/${profileUserId}`, null, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.status === 200 && typeof response.data.isFollowing === 'boolean') {
                setIsFollowing(response.data.isFollowing);
            } else {
                setIsFollowing(prev => !prev); // fallback
            }
        } catch (err) {
            // Hata olursa eski haline döndür
            setFollowers(prev =>
                wasFollowing
                    ? [...prev, { followerUserId: loggedInUser.userId, followedAt: new Date().toISOString() }]
                    : prev.filter(f => f.followerUserId !== loggedInUser.userId)
            );
            setIsFollowing(wasFollowing);
            console.error("Takip işlemi hatası:", err);
        } finally {
            setIsTogglingFollow(false);
            setIsFollowLoading(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    if (isLoadingProfile) { return <LoadingIndicator text={t('public_profile_loading')} />; }
    if (profileError) { return <ErrorDisplay message={profileError} />; }
    if (!profileUser) { return <ErrorDisplay message={t('public_profile_not_found')} />; }

    const displayName = profileUser.name || profileUser.username;
    const usernameHandle = profileUser.username ? `@${profileUser.username}` : '';
    const joinDate = profileUser.createdAt ? new Date(profileUser.createdAt).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' }) : t('unknown_date');

    return (
        <div className="min-h-screen bg-black w-full">
            {/* Twitter tarzı üst profil header */}
            <div className="max-w-7xl mx-auto px-4 pt-10 pb-8 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10 border-b border-gray-800 mb-8">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    {profileUser.avatarUrl ? (
                        <img src={profileUser.avatarUrl} alt="Profil Resmi" className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black object-cover shadow-xl" />
                    ) : (
                        <img src={DEFAULT_AVATAR_URL} alt="Varsayılan Profil" className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black object-cover shadow-xl" />
                    )}
                </div>
                {/* Bilgiler */}
                <div className="flex-1 min-w-0 flex flex-col gap-2 md:gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-3xl md:text-4xl font-bold text-white truncate">{displayName}</h2>
                        {profileUser.isVerified && <FaCheckCircle className="text-blue-400 w-6 h-6" title="Onaylı hesap" />}
                    </div>
                    {usernameHandle && <div className="text-gray-400 text-lg md:text-xl">{usernameHandle}</div>}
                    {profileUser.bio && (
                        <div className="text-gray-300 text-base md:text-lg whitespace-pre-line break-words max-w-2xl">
                            {profileUser.bio}
                        </div>
                    )}
                    <div className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                        <FaCalendarAlt className="mr-1" />
                        {t('public_profile_member_since', { date: joinDate })}
                    </div>
                </div>
                {/* Sayaçlar ve Butonlar */}
                <div className="flex flex-col items-end gap-3 min-w-[180px]">
                    <div className="flex gap-6 text-center">
                        <div>
                            <div className="text-white font-semibold text-xl">{followers.length}</div>
                            <div className="text-gray-400 text-xs">{t('public_profile_followers')}</div>
                        </div>
                        <div>
                            <div className="text-white font-semibold text-xl">{following.length}</div>
                            <div className="text-gray-400 text-xs">{t('public_profile_following')}</div>
                        </div>
                        <div>
                            <div className="text-white font-semibold text-xl">{logs.length}</div>
                            <div className="text-gray-400 text-xs">{t('public_profile_logs')}</div>
                        </div>
                        <div>
                            <div className="text-white font-semibold text-xl">{lists.length}</div>
                            <div className="text-gray-400 text-xs">{t('public_profile_lists')}</div>
                        </div>
                    </div>
                    {isOwnProfile ? (
                        <Link to="/profile" className="mt-2 px-6 py-2 rounded-xl bg-[#232323] text-gray-200 text-base font-medium border border-[#232323] hover:bg-[#2a2a2a] transition">{t('public_profile_edit_button')}</Link>
                    ) : token ? (
                        <button
                            onClick={handleToggleFollow}
                            disabled={isFollowLoading || isTogglingFollow}
                            className={`mt-2 px-6 py-2 rounded-full font-bold text-base transition-colors ${isFollowing
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-brand hover:bg-brand-dark text-white'}`}
                        >
                            {isFollowLoading || isTogglingFollow ? (
                                <span className="animate-spin mr-2 inline-block w-4 h-4 border-2 border-t-transparent border-gray-400 rounded-full align-middle"></span>
                            ) : isFollowing ? (
                                t('public_profile_unfollow_button')
                            ) : (
                                t('public_profile_follow_button')
                            )}
                        </button>
                    ) : (
                        <Link to="/auth/options"
                            className="mt-2 px-6 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-base font-medium transition">
                            {t('public_profile_follow_login_prompt')}
                        </Link>
                    )}
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Sol Kolon */}
                <div className="md:col-span-2"></div>
                {/* Orta Kolon */}
                <div className="flex flex-col gap-6 items-center md:col-span-7">
                    <div className="flex flex-col gap-1 w-full items-center">
                        {/* Sabitlenmiş log/post */}
                        {pinnedLog && (
                            <div className="w-full relative mb-4">
                                <div className="absolute top-0 left-0 z-10">
                                    <span className="bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full shadow">Sabitlenmiş</span>
                                </div>
                                {pinnedLog.postType === 'text' || pinnedLog.postType === 'quote'
                                    ? <PostItem post={{...pinnedLog, userInfo: profileUser}} onDelete={isOwnProfile ? handleDeletePost : null} isPinned={true} onPin={handlePinLog} onUnpin={handleUnpinLog} isOwnProfile={isOwnProfile} />
                                    : <LogItem log={{...pinnedLog, userInfo: profileUser}} isPinned={true} onPin={handlePinLog} onUnpin={handleUnpinLog} isOwnProfile={isOwnProfile} />
                                }
                            </div>
                        )}
                        {/* Diğer log/postlar */}
                        {otherLogs.map(item => (
                            item.postType === 'text' || item.postType === 'quote'
                                ? <PostItem key={item.logId} post={{...item, userInfo: profileUser}} onDelete={isOwnProfile ? handleDeletePost : null} isPinned={false} onPin={handlePinLog} onUnpin={handleUnpinLog} isOwnProfile={isOwnProfile} />
                                : <LogItem key={item.logId} log={{...item, userInfo: profileUser}} isPinned={false} onPin={handlePinLog} onUnpin={handleUnpinLog} isOwnProfile={isOwnProfile} />
                        ))}
                    </div>
                </div>
                {/* Sağ Kolon */}
                <div className="flex flex-col gap-6 md:col-span-3 sticky top-8 self-start">
                    <div className="bg-[#181818] rounded-2xl w-full flex flex-col items-center justify-center p-6 min-h-[250px] shadow">
                        {statsLoading ? (
                            <LoadingIndicator text={t('public_profile_stats_loading')} />
                        ) : statsError ? (
                            <ErrorDisplay message={statsError} />
                        ) : profileStats ? (
                            <div className="w-full flex flex-col items-center">
                                <div className="text-gray-300 text-base mb-2">{t('public_profile_stats_total_time')}</div>
                                <div className="text-white text-3xl font-bold mb-4">{t('public_profile_stats_minutes', { count: (profileStats.totalMovieWatchTimeMinutes ?? 0) + (profileStats.totalTvWatchTimeMinutes ?? 0) })}</div>
                                {profileStats.topGenres && profileStats.topGenres.length > 0 && (
                                    <div className="w-full">
                                        <div className="text-gray-400 text-sm mb-2">{t('public_profile_stats_fav_genres')}</div>
                                        <div className="flex flex-col gap-2">
                                            {profileStats.topGenres.map(genre => (
                                                <div key={genre.id} className="flex items-center gap-3">
                                                    <span className="text-gray-400 text-xs w-24 truncate">{genre.name}</span>
                                                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600" style={{ width: `${(genre.count / Math.max(...profileStats.topGenres.map(g => g.count))) * 100}%` }} />
                                                    </div>
                                                    <span className="text-white text-xs ml-2">{genre.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="text-gray-600">{t('public_profile_stats_error')}</span>
                        )}
                    </div>
                    {/* Watchlist */}
                    <Link to={`/watchlist/${profileUser.username}`} className="block">
                        <div className="bg-[#181818] rounded-2xl p-4 shadow cursor-pointer hover:bg-[#232323] transition">
                            <div className="text-white font-semibold text-base mb-2">{t('public_profile_tab_watchlist')}</div>
                            {watchlistFetchLoading || watchlistPostersLoading ? (
                                <LoadingIndicator text={t('public_profile_watchlist_loading')} />
                            ) : watchlistFetchError || watchlistPostersError ? (
                                <ErrorDisplay message={watchlistFetchError || watchlistPostersError} />
                            ) : watchlistItems.length > 0 ? (
                                <ListPreviewCard
                                    list={{
                                        listId: 'watchlist-preview',
                                        listName: t('public_profile_section_watchlist'),
                                        itemCount: watchlistItems.length,
                                        previewPosters: watchlistPosters
                                    }}
                                    onDelete={null}
                                    isDeleting={false}
                                />
                            ) : (
                                <div className="text-gray-500 text-sm">{t('public_profile_watchlist_empty')}</div>
                            )}
                        </div>
                    </Link>
                    {/* Lists */}
                    <div className="bg-[#181818] rounded-2xl p-4 shadow">
                        <div className="text-white font-semibold text-base mb-2">{t('public_profile_tab_lists')}</div>
                        {listsLoading ? (
                            <LoadingIndicator text={t('my_lists_loading')} />
                        ) : listsError ? (
                            <ErrorDisplay message={listsError} />
                        ) : lists.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {lists.map(list => (
                                    <ListPreviewCard key={list.listId} list={list} onDelete={null} isDeleting={false} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-sm">{t('public_profile_no_lists')}</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PublicProfilePage;