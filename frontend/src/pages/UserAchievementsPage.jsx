// src/pages/UserAchievementsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge'; // Mevcut Badge bileşenini kullanıyoruz
import { FaAward, FaSpinner, FaInfoCircle, FaArrowLeft, FaExclamationCircle, FaUserCircle, FaCheckCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

// İlerleme Çubuğu Bileşeni
const ProgressBar = ({ current, target, label }) => {
    const percentage = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
    return (
        <div className="w-full">
            {label && <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">{label}</span>}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={current}
                    aria-valuemin="0"
                    aria-valuemax={target}
                ></div>
            </div>
        </div>
    );
};

// Yüklenme ve Hata Göstergeleri
const LoadingIndicator = ({ text }) => ( <div className="flex justify-center items-center py-10 text-gray-500 dark:text-gray-400"><FaSpinner className="animate-spin text-xl mr-2" /> {text}</div> );
const ErrorDisplay = ({ message }) => ( <div className="text-center p-6 border border-red-300 dark:border-red-700 rounded-md bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300"><FaInfoCircle className="inline mr-2" /> {message}</div> );

const UserAchievementsPage = () => {
    const { t, i18n } = useTranslation();
    const { userId: profileUserId } = useParams();
    const { user: loggedInUser } = useAuth();
    const navigate = useNavigate();

    // State variables
    const [profileUser, setProfileUser] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch profile data and achievements
                const [profileRes, achievementsRes] = await Promise.all([
                    api.get(`/api/users/public/${profileUserId}`),
                    api.get(`/api/users/${profileUserId}/achievements`)
                ]);

                setProfileUser(profileRes.data.user);
                setAchievements(achievementsRes.data.achievements);
            } catch (err) {
                console.error('Error fetching profile data:', err);
                setError(err.response?.status === 404 ? t('profile.notFound') : t('common.error'));
                if (err.response?.status === 404) {
                    navigate('/404');
                }
            } finally {
                setIsLoading(false);
            }
        };

        if (profileUserId) {
            fetchProfileData();
        }
    }, [profileUserId, t, navigate]);

    // Kazanılan ve Kazanılmayan Rozetleri Hesapla
    const { earnedBadges, unearnedBadges } = useMemo(() => {
        if (isLoading) return { earnedBadges: [], unearnedBadges: [] };
        const earnedIds = new Set(achievements.map(a => a.achievementId));
        const earned = allAchievements
            .filter(def => earnedIds.has(def.id))
            .map(def => {
                const earnedData = achievements.find(e => e.achievementId === def.id);
                return { ...def, earnedAt: earnedData?.earnedAt };
            })
            .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt)); // En yeni kazanılan başa
        const unearned = allAchievements.filter(def => !earnedIds.has(def.id));
        return { earnedBadges: earned, unearnedBadges: unearned };
    }, [achievements, isLoading]);

    // Sıradaki Rozet ve İlerleme Hesaplama
    const nextAchievementInfo = useMemo(() => {
        if (isLoading || !profileUser || unearnedBadges.length === 0) {
            return { nextBadge: null, progress: 0, target: 0, needed: 0 };
        }
        const nextBadge = unearnedBadges[0]; // En basit: listelenen ilk kazanılmamış rozet
        let currentProgress = 0;
        let targetValue = nextBadge.targetValue || 1; // Varsayılan hedef 1
        let progressLabel = '';

        // Rozet türüne göre ilerlemeyi hesapla (backend/config/achievements.js'e göre genişletilmeli)
        switch (nextBadge.type) {
            case 'LOG_COUNT':
                currentProgress = profileUser.logCount || 0;
                progressLabel = t('badge_type_log_count', { target: targetValue });
                break;
            case 'MOVIE_LOG_COUNT':
                currentProgress = profileUser.movieLogCount || 0;
                progressLabel = t('badge_type_movie_log_count', { target: targetValue });
                break;
            case 'TV_LOG_COUNT':
                currentProgress = profileUser.tvLogCount || 0;
                progressLabel = t('badge_type_tv_log_count', { target: targetValue });
                break;
            case 'RATING_COUNT':
                currentProgress = userStats.ratingCount || 0; // Varsayım: stats'ta ratingCount var
                progressLabel = t('badge_type_rating_count', { target: targetValue });
                break;
             case 'REVIEW_COUNT':
                 currentProgress = userStats.reviewCount || 0; // Varsayım: stats'ta reviewCount var
                 progressLabel = t('badge_type_review_count', { target: targetValue });
                 break;
             case 'LIST_COUNT':
                 currentProgress = userStats.listCount || 0; // Varsayım: stats'ta listCount var
                 progressLabel = t('badge_type_list_count', { target: targetValue });
                 break;
             case 'FOLLOWING_COUNT': // Takip edilen sayısı
                 currentProgress = userStats.followingCount || 0; // Varsayım: stats'ta followingCount var
                 progressLabel = t('badge_type_follow_count', { target: targetValue }); // 'follow' değil 'following' olmalı
                 break;
             case 'WATCHLIST_COUNT':
                 currentProgress = userStats.watchlistCount || 0; // Varsayım: stats'ta watchlistCount var
                 progressLabel = t('badge_type_watchlist_count', { target: targetValue });
                 break;
            case 'GENRE_MOVIE_COUNT':
                currentProgress = userStats.genreMovieCounts?.[nextBadge.criteria?.genre] || 0; // Varsayım: stats'ta genreMovieCounts var
                progressLabel = t('badge_type_genre_movie_count', { target: targetValue, genre: nextBadge.criteria?.genre || '?' });
                break;
            case 'GENRE_TV_COUNT':
                currentProgress = userStats.genreTvCounts?.[nextBadge.criteria?.genre] || 0; // Varsayım: stats'ta genreTvCounts var
                progressLabel = t('badge_type_genre_tv_count', { target: targetValue, genre: nextBadge.criteria?.genre || '?' });
                break;
            case 'WATCH_TIME_MOVIE_HOURS':
                currentProgress = Math.floor((userStats.totalMovieWatchTimeMinutes || 0) / 60);
                progressLabel = t('badge_type_watch_time_movie', { target: targetValue });
                break;
            case 'WATCH_TIME_TV_HOURS':
                currentProgress = Math.floor((userStats.totalTvWatchTimeMinutes || 0) / 60);
                progressLabel = t('badge_type_watch_time_tv', { target: targetValue });
                break;
            // Diğer türler için case'ler eklenebilir...
            default:
                progressLabel = t('badge_type_unknown');
                targetValue = 1; // Bilinmeyen için hedef 1
                currentProgress = 0; // Bilinmeyen için ilerleme 0
        }

        const needed = Math.max(0, targetValue - currentProgress);
        return { nextBadge, progress: currentProgress, target: targetValue, needed, progressLabel };
    }, [unearnedBadges, userStats, loading, t]); // t eklendi

    // Yüklenme Durumu Kontrolü
    const isAnythingLoading = loading.profile || loading.earned || loading.allDefs || loading.stats;

    return (
        <div className="space-y-8">
            {/* Sayfa Başlığı ve Geri Butonu */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                    <FaAward className="mr-3 text-yellow-500" />
                    {/* *** Başlık çevirisi (değişken ile) *** */}
                    {isOwnProfile ? t('achievements_page_title_your') : t('achievements_page_title', { username: username })}
                </h1>
                <Link to={`/user/${profileUserId}`} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center">
                    <FaArrowLeft className="mr-1.5" /> Profili Gör
                </Link>
            </div>

            {/* Hata Gösterimi */}
            {error && <ErrorDisplay message={error} />}

            {/* Yükleniyor Göstergesi */}
            {isAnythingLoading && !error && <LoadingIndicator text={t('achievements_loading')} />}

            {/* İçerik (Yüklenme bittiğinde ve hata yoksa) */}
            {!isAnythingLoading && !error && profileUser && (
                <div className="space-y-10">
                    {/* Sıradaki Rozet Bölümü */}
                    <section>
                        {/* *** Başlık çevirisi *** */}
                        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">{t('achievements_next_badge_title')}</h2>
                        {nextAchievementInfo.nextBadge ? (
                            <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 rounded-lg shadow-md p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                                <div className="flex-shrink-0">
                                    <Badge achievement={nextAchievementInfo.nextBadge} isEarned={false} />
                                </div>
                                <div className="flex-1 w-full text-center sm:text-left">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{nextAchievementInfo.nextBadge.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{nextAchievementInfo.nextBadge.description}</p>
                                    <ProgressBar
                                        current={nextAchievementInfo.progress}
                                        target={nextAchievementInfo.target}
                                        label={`${nextAchievementInfo.progressLabel} (${t('achievements_progress', { current: nextAchievementInfo.progress, target: nextAchievementInfo.target })})`}
                                    />
                                    {/* *** Kalan miktar çevirisi (değişken ile) *** */}
                                    {nextAchievementInfo.needed > 0 && (
                                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('badge_progress_need', { needed: nextAchievementInfo.needed })}</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // *** Tüm rozetler kazanıldı mesajı çevirisi ***
                            <p className="text-center text-green-600 dark:text-green-400 font-semibold p-4 bg-green-50 dark:bg-green-900/30 rounded-md border border-green-200 dark:border-green-700">
                                {t('achievements_next_badge_all_earned')}
                            </p>
                        )}
                    </section>

                    {/* Kazanılan Rozetler Bölümü */}
                    <section>
                        {/* *** Başlık çevirisi (değişken ile) *** */}
                        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">{t('achievements_earned_title', { count: earnedBadges.length })}</h2>
                        {earnedBadges.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                {earnedBadges.map(badge => (
                                    <Badge key={badge.id} achievement={badge} isEarned={true} />
                                ))}
                            </div>
                        ) : (
                             // *** Boş durum metni çevirisi ***
                             <p className="text-gray-500 dark:text-gray-400 italic text-center py-6 border border-dashed dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/30">{t('achievements_no_earned')}</p>
                        )}
                    </section>

                    {/* Kazanılmayan Rozetler Bölümü */}
                    {unearnedBadges.length > 0 && (
                        <section>
                            {/* *** Başlık çevirisi *** */}
                            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">{t('achievements_unearned_title')}</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                {unearnedBadges.map(badge => (
                                    <Badge key={badge.id} achievement={badge} isEarned={false} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

export default UserAchievementsPage;
