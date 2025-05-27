// src/pages/PublicUserStatsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSpinner, FaExclamationCircle, FaChartBar, FaFilm, FaTv, FaHourglassHalf, FaArrowLeft, FaUserCircle, FaCheckCircle, FaStar, FaRegStar, FaStarHalfAlt, FaCalendarAlt } from 'react-icons/fa'; // Yeni ikonlar
import PageLayout from '../components/PageLayout';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

// --- Yardımcı Bileşenler ---

// Yüklenme Göstergesi
const LoadingIndicator = ({ text = "Yükleniyor..." }) => (
    <div className="flex justify-center items-center min-h-[200px] text-gray-500 dark:text-gray-400">
        <FaSpinner className="animate-spin text-brand text-3xl mr-3" />
        {text}
    </div>
);

// Hata Göstergesi
const ErrorDisplay = ({ message }) => (
    <div className="text-center p-6 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300">
        <FaExclamationCircle className="w-6 h-6 mx-auto mb-2" />
        {message || "Bir hata oluştu."}
    </div>
);

// Varsayılan Avatar
const DefaultAvatar = () => (
    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
        <FaUserCircle className="w-7 h-7 text-gray-400 dark:text-gray-500" />
    </div>
);

// Puan Yıldızlarını Gösteren Bileşen
const RatingStars = ({ rating }) => {
    if (rating === null || rating === undefined) return <span className="text-xs text-gray-400 italic">Puan Yok</span>;
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 10 - fullStars - (halfStar ? 1 : 0);
    return (
        <div className="flex items-center text-yellow-400">
            {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} className="w-3 h-3"/>)}
            {halfStar && <FaStarHalfAlt key="half" className="w-3 h-3"/>}
            {[...Array(emptyStars)].map((_, i) => <FaRegStar key={`empty-${i}`} className="w-3 h-3 text-gray-300 dark:text-gray-600"/>)}
            <span className="ml-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">({rating.toFixed(1)})</span>
        </div>
    );
};

// --- Ana Sayfa Bileşeni ---

const PublicUserStatsPage = () => {
    const { t, i18n } = useTranslation();
    const { userId: profileUserId } = useParams();
    const { user: loggedInUser } = useAuth();
    const navigate = useNavigate();

    // State variables
    const [profileUser, setProfileUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const DEFAULT_AVATAR_URL = 'https://journal-app-avatars.s3.eu-north-1.amazonaws.com/avatars/SPRK_default_preset_name_custom+%E2%80%93+1.svg';

    // Grafik hesaplamaları için useMemo
    const { maxGenreCount, maxRatingCount, maxMonthlyCount } = useMemo(() => {
        let maxGenre = 0;
        let maxRating = 0;
        let maxMonthly = 0;

        if (stats?.topGenres) {
            const validCounts = stats.topGenres.map(g => g.count).filter(c => typeof c === 'number' && !isNaN(c));
            if (validCounts.length > 0) maxGenre = Math.max(...validCounts);
        }
        if (stats?.ratingDistribution) {
            const validCounts = Object.values(stats.ratingDistribution).filter(c => typeof c === 'number' && !isNaN(c));
            if (validCounts.length > 0) maxRating = Math.max(...validCounts);
        }
        if (stats?.monthlyActivity) {
            const validCounts = stats.monthlyActivity.map(m => m.count).filter(c => typeof c === 'number' && !isNaN(c));
            if (validCounts.length > 0) maxMonthly = Math.max(...validCounts);
        }
        return { maxGenreCount: maxGenre, maxRatingCount: maxRating, maxMonthlyCount: maxMonthly };
    }, [stats]);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch profile data and stats
                const [profileRes, statsRes] = await Promise.all([
                    axios.get(`/api/users/public/${profileUserId}`),
                    axios.get(`/api/users/${profileUserId}/stats`)
                ]);

                setProfileUser(profileRes.data.user);
                setStats(statsRes.data);
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

    // --- Render ---
    if (isLoading) return <LoadingIndicator text="Kullanıcı bilgileri yükleniyor..." />;
    if (error) return <ErrorDisplay message={error} />;
    if (!profileUser) return <ErrorDisplay message="Kullanıcı bilgileri yüklenemedi." />;

    const displayName = profileUser.name || profileUser.username;

    // Ay isimleri (Türkçe)
    const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 md:space-y-8">
            {/* Sayfa Başlığı ve Geri Dönüş Linki */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
                {/* ... (Başlık kısmı aynı) ... */}
                <div className="flex items-center space-x-3">
                    {profileUser.avatarUrl ? (
                        <img src={profileUser.avatarUrl} alt={`${displayName} avatar`} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <img src={DEFAULT_AVATAR_URL} alt="Varsayılan Profil" className="w-10 h-10 rounded-full object-cover" />
                    )}
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center"> {displayName} İstatistikleri {profileUser.isVerified && <FaCheckCircle className="w-4 h-4 text-blue-400 ml-2" title="Onaylanmış Hesap" />} </h1>
                         <Link to={`/user/${profileUser.userId}`} className="text-xs text-gray-500 dark:text-gray-400 hover:underline"> @{profileUser.username} profiline dön </Link>
                    </div>
                </div>
                 <button onClick={() => navigate(`/user/${profileUser.userId}`)} className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"> <FaArrowLeft className="mr-1.5 h-3 w-3" /> Geri </button>
            </div>

            {/* İstatistik İçeriği */}
            {isLoading && <LoadingIndicator text="İstatistikler hesaplanıyor..." />}
            {!isLoading && error && <ErrorDisplay message={error} />}
            {!isLoading && !error && stats && (
                <div className="space-y-8"> {/* Ana kapsayıcı */}

                    {/* Genel Bakış ve Ortalama Puanlar */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                        <div className="bg-white dark:bg-gray-800/50 p-5 rounded-lg border dark:border-gray-700 shadow-sm">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2">Genel Bakış</h3>
                            <dl className="space-y-3 text-sm">
                                <div className="flex justify-between items-center"> <dt className="text-gray-600 dark:text-gray-400">Toplam Log Sayısı:</dt> <dd className="font-semibold text-gray-900 dark:text-gray-100">{stats.totalLogs ?? 0}</dd> </div>
                                <div className="flex justify-between items-center"> <dt className="text-gray-600 dark:text-gray-400">Toplam Film İzleme Süresi:</dt> <dd className="font-semibold text-gray-900 dark:text-gray-100">{stats.totalMovieWatchTimeMinutes ?? 0} dakika</dd> </div>
                                <div className="flex justify-between items-center"> <dt className="text-gray-600 dark:text-gray-400">Toplam Dizi İzleme Süresi:</dt> <dd className="font-semibold text-gray-900 dark:text-gray-100">{stats.totalTvWatchTimeMinutes ?? 0} dakika</dd> </div>
                                <div className="flex justify-between items-center border-t dark:border-gray-600 pt-3 mt-3"> <dt className="text-gray-600 dark:text-gray-400 font-medium">Toplam İzleme Süresi:</dt> <dd className="font-bold text-lg text-gray-900 dark:text-gray-100">{(stats.totalMovieWatchTimeMinutes ?? 0) + (stats.totalTvWatchTimeMinutes ?? 0)} dakika</dd> </div>
                            </dl>
                        </div>
                         {/* <<< YENİ: Ortalama Puanlar >>> */}
                         <div className="bg-white dark:bg-gray-800/50 p-5 rounded-lg border dark:border-gray-700 shadow-sm">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2">Ortalama Puanlar</h3>
                            <dl className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <dt className="text-gray-600 dark:text-gray-400 flex items-center"><FaFilm className="mr-2"/> Film Ortalaması:</dt>
                                    <dd><RatingStars rating={stats.averageMovieRating} /></dd>
                                </div>
                                <div className="flex justify-between items-center">
                                    <dt className="text-gray-600 dark:text-gray-400 flex items-center"><FaTv className="mr-2"/> Dizi Ortalaması:</dt>
                                    <dd><RatingStars rating={stats.averageTvRating} /></dd>
                                </div>
                                <div className="flex justify-between items-center border-t dark:border-gray-600 pt-3 mt-3">
                                    <dt className="text-gray-600 dark:text-gray-400 font-medium">Genel Ortalama:</dt>
                                    {/* Genel ortalama hesaplanabilir ama basitlik adına ayrı gösterelim */}
                                    <dd className="text-gray-500 dark:text-gray-400 italic text-xs">(Film ve dizi ayrı)</dd>
                                </div>
                            </dl>
                        </div>
                         {/* <<< YENİ SONU >>> */}
                    </div>

                    {/* Puan Dağılımı ve Favori Türler */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                         {/* <<< YENİ: Puan Dağılımı Grafiği >>> */}
                         <div className="bg-white dark:bg-gray-800/50 p-5 rounded-lg border dark:border-gray-700 shadow-sm">
                             <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2">Puan Dağılımı</h3>
                             {stats.ratingDistribution && Object.keys(stats.ratingDistribution).length > 0 && maxRatingCount > 0 ? (
                                 <div className="space-y-1.5">
                                     {/* 0.5'ten 10'a kadar tüm olası puanları göster */}
                                     {Array.from({ length: 20 }, (_, i) => (i + 1) / 2).map(ratingValue => {
                                         const ratingKey = ratingValue.toFixed(1);
                                         const count = stats.ratingDistribution[ratingKey] || 0;
                                         const barHeightPercentage = maxRatingCount > 0 ? Math.max(2, (count / maxRatingCount) * 100) : 2; // Min %2 yükseklik
                                         return (
                                             <div key={ratingKey} className="flex items-end text-xs group" title={`${count} kez ${ratingKey} puanı verildi`}>
                                                 {/* Bar */}
                                                 <div className="w-4 bg-gradient-to-t from-yellow-400 to-amber-500 dark:from-yellow-500 dark:to-amber-600 rounded-t-sm transition-all duration-300 ease-out hover:opacity-80"
                                                      style={{ height: `${barHeightPercentage}%`, minHeight: '2px' }}>
                                                 </div>
                                                 {/* Etiket */}
                                                 <span className="ml-2 text-gray-500 dark:text-gray-400 w-6 text-right">{ratingKey}</span>
                                                 {/* Sayı (isteğe bağlı) */}
                                                 {/* <span className="ml-1 text-gray-400 dark:text-gray-500">({count})</span> */}
                                             </div>
                                         );
                                     })}
                                     {/* X ekseni için boşluk */}
                                     <div className="h-4"></div>
                                 </div>
                             ) : (
                                 <p className="text-sm text-gray-500 dark:text-gray-400 italic">Henüz puan verisi yok.</p>
                             )}
                         </div>
                         {/* <<< YENİ SONU >>> */}

                        {/* Favori Türler Grafiği */}
                        <div className="bg-white dark:bg-gray-800/50 p-5 rounded-lg border dark:border-gray-700 shadow-sm">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2">Favori Türler</h3>
                            {stats.topGenres && stats.topGenres.length > 0 && maxGenreCount > 0 ? (
                                <div className="space-y-3">
                                    {stats.topGenres.map(genre => {
                                        const count = typeof genre.count === 'number' && !isNaN(genre.count) ? genre.count : 0;
                                        const barWidthPercentage = maxGenreCount > 0 ? Math.max(5, (count / maxGenreCount) * 100) : 5;
                                        return ( <div key={genre.id} className="flex items-center text-sm group"> <span className="w-2/5 truncate pr-2 text-gray-600 dark:text-gray-300" title={genre.name}>{genre.name}</span> <div className="w-3/5 flex items-center"> <div className="h-3 bg-gradient-to-r from-cyan-400 to-blue-500 dark:from-cyan-500 dark:to-blue-600 rounded-full transition-all duration-300 ease-out" style={{ width: `${barWidthPercentage}%` }} title={`${count} izleme`}></div> <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-medium">{count}</span> </div> </div> );
                                    })}
                                </div>
                            ) : ( <p className="text-sm text-gray-500 dark:text-gray-400 italic">Henüz favori türleri belirlemek için yeterli veri yok.</p> )}
                        </div>
                    </div>

                    {/* Aylara Göre İzleme Aktivitesi */}
                    <div className="bg-white dark:bg-gray-800/50 p-5 rounded-lg border dark:border-gray-700 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2">Aylık Aktivite</h3>
                        {stats.monthlyActivity && stats.monthlyActivity.length > 0 && maxMonthlyCount > 0 ? (
                             <div className="flex space-x-2 overflow-x-auto pb-4 custom-scrollbar-thin"> {/* Yatay kaydırma */}
                                {stats.monthlyActivity.map(({ yearMonth, count }) => {
                                    const [year, month] = yearMonth.split('-');
                                    const monthName = monthNames[parseInt(month) - 1] || '';
                                    const barHeightPercentage = maxMonthlyCount > 0 ? Math.max(5, (count / maxMonthlyCount) * 100) : 5; // Min %5 yükseklik
                                    return (
                                        <div key={yearMonth} className="flex flex-col items-center flex-shrink-0 w-12 group" title={`${count} log (${monthName} ${year})`}>
                                            {/* Bar */}
                                            <div className="w-4 h-32 bg-gray-200 dark:bg-gray-700 rounded-t-md overflow-hidden flex flex-col justify-end">
                                                 <div className="bg-gradient-to-t from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 transition-all duration-300 ease-out group-hover:opacity-80"
                                                      style={{ height: `${barHeightPercentage}%`, minHeight: '3px' }}>
                                                 </div>
                                            </div>
                                            {/* Etiket */}
                                            <span className="mt-1.5 text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight">{monthName}<br/>'{year.slice(-2)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Henüz aylık aktivite verisi yok.</p>
                        )}
                    </div>

                </div>
            )}
            {!isLoading && !error && !stats && (
                <p className="text-gray-500 dark:text-gray-400 italic text-center py-10">Bu kullanıcı için istatistik verisi bulunamadı.</p>
            )}
        </div>
    );
}

export default PublicUserStatsPage;
