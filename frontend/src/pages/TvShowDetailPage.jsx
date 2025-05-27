// src/pages/TvShowDetailPage.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import LogEntryModal from '../components/LogEntryModal';
import AddToListModal from '../components/AddToListModal';
import LogItem from '../components/LogItem';
import CodeRainEffect from '../components/CodeRainEffect'; // Bu sayfa için kullanılmıyor ama import kalabilir
import { useTranslation } from 'react-i18next';

// İkonlar
// <<< GÜNCELLEME: FaPlayCircle ikonu eklendi >>>
import { FaEye, FaListUl, FaClock, FaRegEye, FaRegClock, FaPlus, FaStar, FaComments, FaArrowRight, FaUsers, FaUserEdit, FaSpinner, FaPencilAlt, FaInfoCircle, FaChevronDown, FaChevronUp, FaPlay, FaUserCircle, FaImage, FaPlayCircle } from 'react-icons/fa';

// Sabitler
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const SEASON_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w342';
const SIMILAR_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
const PROVIDER_LOGO_BASE_URL = 'https://image.tmdb.org/t/p/w92';
const PROFILE_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w185'; // Kişi resimleri için
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/500x750.png?text=Poster+Mevcut+Değil';
const PLACEHOLDER_SEASON_POSTER = 'https://via.placeholder.com/342x513.png?text=Sezon+Posteri+Yok';
const PLACEHOLDER_SIMILAR = 'https://via.placeholder.com/342x513.png?text=Poster+Yok';
const PLACEHOLDER_BACKDROP = 'https://via.placeholder.com/1280x720.png?text=Resim+Mevcut+Değil';
const PLACEHOLDER_PROVIDER = 'https://via.placeholder.com/92x92.png?text=Logo';
const PLACEHOLDER_PROFILE = 'https://via.placeholder.com/185x278.png?text=Foto+Yok'; // Kişi placeholder
const SIMILAR_ITEMS_INITIAL_LIMIT = 6;

// Platformların genel ana sayfa URL'leri
const platformUrls = {
    'Netflix': 'https://www.netflix.com/',
    'Amazon Prime Video': 'https://www.primevideo.com/',
    'Apple TV': 'https://tv.apple.com/',
    'Disney Plus': 'https://www.disneyplus.com/',
    'Google Play Movies': 'https://play.google.com/store/movies',
    'YouTube': 'https://www.youtube.com/movies',
    'BluTV': 'https://www.blutv.com/',
    'TOD': 'https://www.todtv.com.tr/',
    'Puhu TV': 'https://puhutv.com/',
    'MUBI': 'https://mubi.com/',
};

// Nereden İzlenir? Bölümü Bileşeni (MovieDetailPage ile aynı)
const WatchProvidersSection = ({ providers, loading, error, title }) => {
    const { t } = useTranslation();
    if (loading) return <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 italic"><FaSpinner className="animate-spin mr-2" /> {t('detail_page_watch_providers_loading')}</div>;
    if (error) return <p className="text-sm text-red-500 dark:text-red-400">{error}</p>;
    if (!providers || Object.keys(providers).length === 0 || (!providers.flatrate && !providers.rent && !providers.buy)) {
        return <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t('detail_page_watch_providers_none')}</p>;
    }
    const renderProviderList = (providerList, categoryTitleKey) => {
        if (!providerList || providerList.length === 0) return null;
        return (
            <div className="mb-3 last:mb-0">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">{t(categoryTitleKey)}</h5>
                <div className="flex flex-wrap gap-2">
                    {providerList.map(provider => {
                        const platformLink = platformUrls[provider.provider_name] || '#';
                        const isLinkAvailable = platformLink !== '#';
                        return (
                             <a
                                key={provider.provider_id}
                                href={platformLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex-shrink-0 block rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 ${isLinkAvailable ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
                                title={provider.provider_name}
                                onClick={(e) => !isLinkAvailable && e.preventDefault()}
                            >
                                <img
                                    src={provider.logo_path ? `${PROVIDER_LOGO_BASE_URL}${provider.logo_path}` : PLACEHOLDER_PROVIDER}
                                    alt={provider.provider_name}
                                    className="w-9 h-9 md:w-10 md:h-10 object-cover border border-gray-300 dark:border-gray-600 rounded-md"
                                    loading="lazy"
                                />
                            </a>
                        );
                    })}
                </div>
            </div>
        );
    };
    return (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-sm border dark:border-gray-700">
            <div className="flex justify-between items-center mb-3 border-b border-gray-300 dark:border-gray-700 pb-2">
                 <h4 className="font-semibold text-gray-700 dark:text-gray-200">{title}</h4>
            </div>
            {renderProviderList(providers.flatrate, 'detail_page_watch_providers_stream')}
            {renderProviderList(providers.rent, 'detail_page_watch_providers_rent')}
            {renderProviderList(providers.buy, 'detail_page_watch_providers_buy')}
        </div>
    );
};

// Kişi Kartı Bileşeni (MovieDetailPage ile aynı, görsel efekt eklendi)
const PersonCard = ({ person, type }) => {
    const { t } = useTranslation();
    const name = person.name;
    // TV dizilerinde oyuncuların birden fazla rolü olabilir, bunları birleştir
    const role = type === 'cast' ? (person.roles?.map(r => r.character).join(', ') || t('detail_page_unknown_character')) : (person.job || t('detail_page_creator_title'));
    const profilePath = person.profile_path;
    const imageUrl = profilePath ? `${PROFILE_IMAGE_BASE_URL}${profilePath}` : PLACEHOLDER_PROFILE;

    return (
        <div className="flex-shrink-0 w-28 sm:w-32 text-center group">
            <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-md mb-1.5 transition-all duration-300 ease-in-out group-hover:shadow-lg">
                {profilePath ? (
                    <img
                        src={imageUrl}
                        alt={name}
                        // Fotoğrafı siyah-beyaz yap, hover ile renkli
                        className="w-full h-full object-cover filter grayscale group-hover:filter-none transition-all duration-300 ease-in-out"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        {/* Profil fotoğrafı yoksa varsayılan ikon */}
                        <FaUserCircle className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                    </div>
                )}
            </div>
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate" title={name}>{name}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate" title={role}>{role}</p>
        </div>
    );
};


function TvShowDetailPage() {
    const { t, i18n } = useTranslation();
    const { tvId } = useParams();
    const { token, user } = useAuth(); // Auth context'inden kullanıcı ve token bilgilerini al
    // State değişkenleri dizi detayları, yüklenme durumu, hata mesajları vb. için
    const [tvShowDetails, setTvShowDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userLogsForShow, setUserLogsForShow] = useState([]);
    const [logStatusLoading, setLogStatusLoading] = useState(!!token); // Token varsa başlangıçta yükleniyor
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [watchlistItemId, setWatchlistItemId] = useState(null);
    const [isWatchlistLoading, setIsWatchlistLoading] = useState(!!token); // Token varsa başlangıçta yükleniyor
    const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [similarTvShows, setSimilarTvShows] = useState([]);
    const [similarLoading, setSimilarLoading] = useState(true);
    const [similarError, setSimilarError] = useState(null);
    const [isTogglingQuickLog, setIsTogglingQuickLog] = useState(false);
    const [quickLogActionError, setQuickLogActionError] = useState(null);
    const [recentPublicLogs, setRecentPublicLogs] = useState([]);
    const [recentLogsLoading, setRecentLogsLoading] = useState(false);
    const [recentLogsError, setRecentLogsError] = useState(null);
    const [showAllSimilar, setShowAllSimilar] = useState(false);

    // İzleme Sağlayıcıları State'leri
    const [watchProviders, setWatchProviders] = useState(null);
    const [providersLoading, setProvidersLoading] = useState(true);
    const [providersError, setProvidersError] = useState(null);

    // Kullanıcının bu dizi için loglarını ve izleme listesi durumunu yenileme fonksiyonu
    const refreshUserStatusesAndLogs = useCallback(async () => {
        if (!token || !tvId) {
            setLogStatusLoading(false); setIsWatchlistLoading(false); setUserLogsForShow([]); return;
        }
        setLogStatusLoading(true); setIsWatchlistLoading(true); setUserLogsForShow([]); // Önceki logları temizle
        const apiPrefix = '/api'; // API endpoint'lerinin base URL'i
        const headers = { Authorization: `Bearer ${token}` }; // Yetkilendirme başlığı

        // Logları ve watchlist durumunu aynı anda çek
        const logPromise = axios.get(`${apiPrefix}/logs`, { params: { contentId: tvId, contentType: 'tv' }, headers });
        const watchlistPromise = axios.get(`${apiPrefix}/watchlist/status/tv/${tvId}`, { headers });

        // Tüm promise'ların tamamlanmasını bekle
        const [logResult, watchlistResult] = await Promise.allSettled([logPromise, watchlistPromise]);

        // Sonuçları state'e ata
        if (logResult.status === 'fulfilled') setUserLogsForShow(logResult.value.data.logs || []);
        else { console.error("Log çekme hatası:", logResult.reason); setUserLogsForShow([]); }
        setLogStatusLoading(false);

        if (watchlistResult.status === 'fulfilled') { setIsInWatchlist(watchlistResult.value.data.isInWatchlist); setWatchlistItemId(watchlistResult.value.data.itemId || null); }
        else { console.error("Watchlist durumu çekme hatası:", watchlistResult.reason); setIsInWatchlist(false); setWatchlistItemId(null); }
        setIsWatchlistLoading(false); // Yükleme durumlarını güncelle
     }, [token, tvId]); // Bağımlılıklar: token ve tvId değiştiğinde fonksiyon yeniden oluşturulur

    // Genel dizi logu var mı? (Memoized)
    const hasGeneralLog = useMemo(() => userLogsForShow.some(log => log.seasonNumber === undefined || log.seasonNumber === null), [userLogsForShow]);
    // Dizi izleniyor mu? (Genel log yok ama sezon logu var) (Memoized)
    const isWatching = useMemo(() => !hasGeneralLog && userLogsForShow.some(log => log.seasonNumber !== undefined && log.seasonNumber !== null), [hasGeneralLog, userLogsForShow]);

    // Hızlı log ekleme/kaldırma fonksiyonu (Genel dizi logu için)
    const handleToggleQuickLog = useCallback(async () => {
        if (!token || !tvId || isTogglingQuickLog || logStatusLoading) return; // Gerekli kontroller
        setIsTogglingQuickLog(true); setQuickLogActionError(null); // State'leri ayarla
        const apiPrefix = '/api';
        const generalLog = userLogsForShow.find(log => log.seasonNumber === undefined || log.seasonNumber === null);
        const headers = { Authorization: `Bearer ${token}` }; // Yetkilendirme başlığı

        try {
            if (generalLog) { // Genel log varsa sil
                await axios.delete(`${apiPrefix}/logs/${generalLog.logId}`, { headers });
            } else { // Genel log yoksa oluştur (sezon/bölüm bilgisi olmadan)
                await axios.post(`${apiPrefix}/logs`, { contentId: Number(tvId), contentType: 'tv', watchedDate: new Date().toISOString().split('T')[0] }, { headers });
            }
            await refreshUserStatusesAndLogs(); // Durumu güncelle
        } catch (error) {
            console.error("Hızlı loglama/kaldırma hatası:", error.response?.data || error.message);
            setQuickLogActionError(t('detail_page_quick_log_error')); // Hata mesajını göster
            setTimeout(() => setQuickLogActionError(null), 3000); // Mesajı 3 saniye sonra kaldır
        } finally { setIsTogglingQuickLog(false); } // İşlem bitti
    }, [token, tvId, logStatusLoading, isTogglingQuickLog, userLogsForShow, refreshUserStatusesAndLogs, t]); // Bağımlılıklar

    // Modal için mevcut genel logu bul (Memoized)
    const existingLogForModal = useMemo(() => {
        if (!userLogsForShow || userLogsForShow.length === 0) return null;
        return userLogsForShow.find(log => log.seasonNumber === undefined || log.seasonNumber === null);
    }, [userLogsForShow]);

    // Ana dizi detaylarını ve kullanıcı durumlarını çekme
    useEffect(() => {
        // Sayfa yüklendiğinde veya tvId değiştiğinde tüm state'leri sıfırla
        setTvShowDetails(null); setUserLogsForShow([]); setLogStatusLoading(true);
        setIsInWatchlist(false); setIsWatchlistLoading(true); setWatchlistItemId(null);
        setSimilarTvShows([]); setSimilarLoading(true); setSimilarError(null);
        setIsLogModalOpen(false); setIsListModalOpen(false);
        setQuickLogActionError(null); setError(null); setLoading(true);
        setRecentPublicLogs([]); setRecentLogsLoading(false); setRecentLogsError(null);
        setShowAllSimilar(false);
        setWatchProviders(null); setProvidersLoading(true); setProvidersError(null); // İzleme sağlayıcıları da sıfırla

        const fetchDetails = async () => {
             if (!tvId) { setError(t('detail_page_error_id')); setLoading(false); return; }; // tvId yoksa hata ver
             const apiPrefix = '/api';
             try {
                 // Dizi detaylarını API'den çek
                 const response = await axios.get(`${apiPrefix}/tv/${tvId}`);
                 setTvShowDetails(response.data); // Gelen veriyi state'e ata

                 // Eğer kullanıcı giriş yapmışsa, log ve watchlist durumunu çek
                 if (token) await refreshUserStatusesAndLogs();
                 else { setLogStatusLoading(false); setIsWatchlistLoading(false); } // Giriş yapmamışsa yüklemeyi bitir
             } catch (err) {
                // Hata durumunu yönet
                const statusCode = err.response ? err.response.status : 500;
                setError(statusCode === 404 ? t('detail_page_error_not_found') : t('detail_page_error_generic'));
                setTvShowDetails(null); setLogStatusLoading(false); setIsWatchlistLoading(false);
            }
             finally { setLoading(false); } // Ana yükleme bitti
        };
        fetchDetails();
    }, [tvId, token, refreshUserStatusesAndLogs, t]); // Bağımlılıkları ekle

    // İzleme sağlayıcılarını çekme (Bölge kodu ile)
    useEffect(() => {
        // Sadece dizi ID'si varsa ve ana yükleme bitmişse çalıştır
        if (tvId && !loading) {
            const fetchWatchProviders = async () => {
                setProvidersLoading(true); setProvidersError(null); setWatchProviders(null);
                // Kullanıcının diline göre bölge kodunu belirle (TR veya US)
                const regionCode = i18n.language === 'en' ? 'US' : 'TR';
                try {
                    // Backend API'sine bölge parametresi ile istek gönder
                    const response = await axios.get(`/api/tv/${tvId}/watch-providers?region=${regionCode}`);
                    setWatchProviders(response.data.providers); // Gelen veriyi state'e ata
                } catch (err) {
                    console.error("Watch providers çekme hatası:", err.response?.data || err.message);
                    setProvidersError(t('detail_page_watch_providers_error')); // Hata mesajını ayarla
                    setWatchProviders(null);
                } finally {
                    setProvidersLoading(false); // Yükleme bitti
                }
            };
            fetchWatchProviders();
        }
    }, [tvId, loading, t, i18n.language]); // Bağımlılıklara i18n.language eklendi

    // Benzer dizileri çekme
    useEffect(() => {
        if (tvId) { // Sadece tvId varsa çalıştır
            const fetchSimilar = async () => {
                setSimilarLoading(true); setSimilarError(null); setSimilarTvShows([]); // State'leri sıfırla
                try {
                    const response = await axios.get(`/api/tv/${tvId}/similar`);
                    setSimilarTvShows(response.data.results || []); // Gelen veriyi state'e ata
                } catch (err) { console.error("Önerilen diziler çekme hatası:", err); setSimilarError(t('detail_page_recommendations_error')); setSimilarTvShows([]); }
                finally { setSimilarLoading(false); } // Yükleme bitti
            };
            fetchSimilar();
        } else { setSimilarTvShows([]); setSimilarLoading(false); setSimilarError(null); } // tvId yoksa state'leri sıfırla
    }, [tvId, t]); // Bağımlılık tvId ve t

    // Son aktiviteleri çekme
    useEffect(() => {
        if (tvShowDetails && tvId) { // Sadece dizi detayları ve ID varsa çalıştır
            const fetchRecentLogs = async () => {
                setRecentLogsLoading(true); setRecentLogsError(null); setRecentPublicLogs([]); // State'leri sıfırla
                try {
                    // API'den son 5 logu çek
                    const response = await axios.get(`/api/logs/content/tv/${tvId}?limit=5`);
                    setRecentPublicLogs(response.data.logs || []); // Gelen veriyi state'e ata
                } catch (err) {
                    console.error(`TvShowDetailPage: Son aktiviteler çekilirken hata (tv/${tvId}):`, err.response?.data || err.message);
                    setRecentLogsError(t('detail_page_activity_error')); // Hata mesajını ayarla
                    setRecentPublicLogs([]);
                } finally { setRecentLogsLoading(false); } // Yükleme bitti
            };
            fetchRecentLogs();
        }
    }, [tvShowDetails, tvId, t]); // Bağımlılıklar

    // Modal açma/kapama fonksiyonları
    const openLogModal = () => { setIsLogModalOpen(true); };
    const closeLogModal = () => { setIsLogModalOpen(false); };
    const openListModal = () => setIsListModalOpen(true);
    const closeListModal = () => setIsListModalOpen(false);
    const handleLogSavedOrDeleted = () => { refreshUserStatusesAndLogs(); }; // Log kaydedilince veya silinince durumu yenile
    const handleItemAddedToList = (listId) => { console.log(`İçerik ${listId} listesine eklendi.`); /* İsteğe bağlı: Kullanıcıya bildirim göster */ };

    // İzleme listesi ekleme/kaldırma fonksiyonu
    const handleToggleWatchlist = useCallback(async (e) => {
        e.preventDefault(); e.stopPropagation(); // Linke tıklamayı engelle
        if (!token || !tvId || isTogglingWatchlist || isWatchlistLoading) return; // Gerekli kontroller
        setIsTogglingWatchlist(true); // İşlem başladığını belirt
        const currentStatus = isInWatchlist;
        const contentType = 'tv'; // Bu sayfa dizi detay sayfası olduğu için
        const apiPrefix = '/api';
        const headers = { Authorization: `Bearer ${token}` }; // Yetkilendirme başlığı

        try {
            if (currentStatus && watchlistItemId) { // Listede varsa sil
                await axios.delete(`${apiPrefix}/watchlist/${watchlistItemId}`, { headers });
                setIsInWatchlist(false); setWatchlistItemId(null);
            } else if (!currentStatus) { // Listede yoksa ekle
                const response = await axios.post(`${apiPrefix}/watchlist`, { contentId: Number(tvId), contentType: contentType }, { headers });
                setIsInWatchlist(true); setWatchlistItemId(response.data.item?.itemId || response.data.itemId || null); // Gelen ID'yi kaydet
            }
        } catch (error) { console.error(`Watchlist değiştirme hatası:`, error.response?.data || error.message); /* Hata durumunda state'i geri alabilir veya kullanıcıya mesaj gösterebilirsiniz */ }
        finally { setIsTogglingWatchlist(false); } // İşlem bitti
    }, [token, tvId, isTogglingWatchlist, isWatchlistLoading, isInWatchlist, watchlistItemId]); // Bağımlılıklar

    // --- Render Mantığı ---
    // Ana yükleme durumu
    if (loading && !tvShowDetails) return <p className="text-center text-xl mt-10 dark:text-gray-300">{t('detail_page_loading')}</p>;
    // Hata durumu
    if (error) return <p className="text-center text-red-600 text-xl mt-10">{error}</p>;
    // Dizi bulunamadı durumu
    if (!tvShowDetails) return <p className="text-center text-xl mt-10 dark:text-gray-400">{t('detail_page_error_not_found')}</p>;

    // Verileri formatla
    const firstAirYear = tvShowDetails.first_air_date ? tvShowDetails.first_air_date.substring(0, 4) : 'N/A';
    const lastAirYear = tvShowDetails.last_air_date ? tvShowDetails.last_air_date.substring(0, 4) : '';
    const yearRange = (tvShowDetails.status === 'Ended' || tvShowDetails.status === 'Canceled') && lastAirYear && firstAirYear !== lastAirYear ? `${firstAirYear}–${lastAirYear}` : firstAirYear;
    const cast = tvShowDetails.aggregate_credits?.cast?.slice(0, 10) || []; // İlk 10 oyuncu
    const creators = tvShowDetails.created_by || []; // Yaratıcılar
    const validSeasons = tvShowDetails.seasons?.filter(s => s.season_number > 0).sort((a, b) => a.season_number - b.season_number) || []; // Geçerli sezonlar (0. sezon hariç)
    const numberOfSeasons = validSeasons.length; // Sezon sayısı
    const mainPosterPath = tvShowDetails.poster_path; // Ana poster yolu (sezon posteri yoksa kullanılacak)
    // Gösterilecek benzer diziler (tümü veya ilk N tanesi)
    const displayedSimilarTvShows = showAllSimilar ? similarTvShows : similarTvShows.slice(0, SIMILAR_ITEMS_INITIAL_LIMIT);

    // Sezon poster URL'sini fallback ile alma
    const getSeasonPosterUrlWithFallback = (seasonPosterPath) => {
        if (seasonPosterPath) return `${SEASON_POSTER_BASE_URL}${seasonPosterPath}`;
        if (mainPosterPath) return `${IMAGE_BASE_URL}${mainPosterPath}`; // Ana posteri kullan
        return PLACEHOLDER_SEASON_POSTER; // Hiçbiri yoksa placeholder
    };

    // Log butonunun stilini ve metnini belirle
    let logButtonClass = 'bg-gray-700/80 hover:bg-gray-600'; // Varsayılan stil
    let logButtonIcon = <FaRegEye className="w-4 h-4 mr-1.5" />; // Varsayılan ikon
    let logButtonText = t('detail_page_log_unwatched'); // Varsayılan metin
    let logButtonTooltip = t('detail_page_log_tooltip_unwatched'); // Varsayılan tooltip

    if (hasGeneralLog) { // Eğer genel log varsa (tüm dizi izlendi)
        logButtonClass = 'bg-green-600 hover:bg-green-500'; // Yeşil stil
        logButtonIcon = <FaEye className="w-4 h-4 mr-1.5 text-white" />; // Dolu göz ikonu
        logButtonText = t('detail_page_log_watched'); // "İzlendi" metni
        logButtonTooltip = t('detail_page_log_tooltip_watched'); // "İzlendi işaretini kaldır" tooltip'i
    } else if (isWatching) { // Eğer izleniyorsa (sezon logu var ama genel log yok)
        logButtonClass = 'bg-orange-500 hover:bg-orange-400'; // Turuncu stil
        logButtonIcon = <FaPlayCircle className="w-4 h-4 mr-1.5" />; // Oynat ikonu
        logButtonText = t('detail_page_log_watching'); // "İzleniyor" metni
        logButtonTooltip = t('detail_page_log_tooltip_watching'); // "Tüm diziyi izlendi olarak işaretle" tooltip'i
    }

    // --- JSX Render ---
    return (
        // Ana sayfa konteyneri
        <div className="bg-white dark:bg-black text-gray-800 dark:text-gray-100">
            {/* Modallar (Log ve Liste Ekleme) - Sadece token varsa gösterilir */}
             {token && (
                 <>
                     {/* Log Girişi/Düzenleme Modalı */}
                     <LogEntryModal
                         isOpen={isLogModalOpen} // Modalın açık olup olmadığını belirler
                         onClose={closeLogModal} // Modalı kapatma fonksiyonu
                         contentId={Number(tvId)} // Dizi ID'si
                         contentType="tv" // İçerik tipi
                         existingLogData={existingLogForModal} // Varsa mevcut genel log verisi
                         onLogSaved={handleLogSavedOrDeleted} // Log kaydedildiğinde/güncellendiğinde çalışır
                         onLogDeleted={handleLogSavedOrDeleted} // Log silindiğinde çalışır
                         numberOfSeasons={numberOfSeasons} // Sezon sayısı (modal içinde sezon seçimi için)
                         initialSeason={'all'} // Varsayılan olarak tüm dizi için log
                         initialEpisode={null} // Varsayılan olarak bölüm yok
                     />
                     {/* Listeye Ekleme Modalı */}
                     <AddToListModal
                         isOpen={isListModalOpen} // Modalın açık olup olmadığını belirler
                         onClose={closeListModal} // Modalı kapatma fonksiyonu
                         contentId={Number(tvId)} // Dizi ID'si
                         contentType="tv" // İçerik tipi
                         onItemAdded={handleItemAddedToList} // Öğe listeye eklendiğinde çalışır
                      />
                 </>
            )}

            {/* Üst Hero Bölümü (Backdrop, Poster, Başlık, Butonlar) */}
            <div className="relative w-full min-h-[65vh] md:min-h-[70vh] flex items-end">
                 {/* Backdrop Resmi */}
                 <img src={tvShowDetails.backdrop_path ? `${BACKDROP_BASE_URL}${tvShowDetails.backdrop_path}` : PLACEHOLDER_BACKDROP} alt={`${tvShowDetails.name || ''} Backdrop`} className="absolute inset-0 w-full h-full object-cover opacity-60 dark:opacity-50" />
                 {/* Gradient Overlay (Resmin üzerine karanlık bir geçiş ekler) */}
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
                 {/* İçerik Alanı (Poster, Başlık, Butonlar) */}
                 <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pb-8 md:pb-12 w-full">
                      <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 w-full">
                         {/* Poster */}
                         <div className="w-36 md:w-48 lg:w-56 flex-shrink-0 -mb-10 md:-mb-16 z-10 shadow-xl">
                              <img src={tvShowDetails.poster_path ? `${IMAGE_BASE_URL}${tvShowDetails.poster_path}` : PLACEHOLDER_IMAGE} alt={`${tvShowDetails.name || ''} Posteri`} className="w-full h-auto object-contain rounded-md border-2 border-gray-700 dark:border-gray-800" />
                         </div>
                          {/* Başlık ve Butonlar */}
                          <div className="flex-1 text-center md:text-left mb-4 md:mb-0">
                              {/* Başlık ve Yıl */}
                              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-1 drop-shadow-lg">
                                {tvShowDetails.name || t('no_title')} {/* Dizi adı veya çevrilmiş varsayılan metin */}
                                <span className="text-2xl md:text-3xl font-light text-gray-300 ml-2">({yearRange})</span> {/* Yayın yılı aralığı */}
                              </h1>
                              {/* Metadata (Sezon Sayısı, Yaratıcılar, Türler, Durum) */}
                              <div className="flex flex-wrap justify-center md:justify-start gap-x-3 gap-y-1 text-sm mb-4 text-gray-300 drop-shadow">
                                  {numberOfSeasons > 0 && <span>{t('item_count_plural', { count: numberOfSeasons })} Sezon</span>} {/* Sezon sayısı */}
                                  {creators.length > 0 && ( <span>{t('detail_page_creator_title')}: {creators.map(c => c.name).join(', ')}</span> )} {/* Yaratıcılar */}
                                  {tvShowDetails.genres && tvShowDetails.genres.length > 0 && ( <span>{tvShowDetails.genres.map(g => g.name).join(', ')}</span> )} {/* Türler */}
                                  {tvShowDetails.status && <span>{t('status_label', 'Durum')}: {tvShowDetails.status}</span>} {/* Dizi durumu */}
                              </div>
                              {/* Kullanıcı Aksiyon Butonları (Sadece giriş yapmış kullanıcılar için) */}
                              {token && (
                                 <div className="flex items-center justify-center md:justify-start space-x-3 mt-5">
                                     {/* Hızlı Log Butonu (Genel dizi logu için) */}
                                     <button onClick={handleToggleQuickLog} disabled={logStatusLoading || isTogglingQuickLog} className={`flex items-center px-3 py-1.5 rounded-full text-white text-sm transition disabled:opacity-50 ${logButtonClass}`} title={logButtonTooltip}>
                                         {logStatusLoading || isTogglingQuickLog ? ( <FaSpinner className="animate-spin w-4 h-4 mr-1.5" /> ) : ( logButtonIcon )}
                                         {logButtonText}
                                     </button>
                                     {/* Liste Ekle Butonu */}
                                     <button onClick={openListModal} className="p-2 bg-gray-700/80 hover:bg-gray-600 rounded-full text-white transition" title={t('detail_page_add_to_list_tooltip')}> <FaListUl className="w-4 h-4" /> </button>
                                     {/* İzleme Listesi Butonu */}
                                     <button onClick={handleToggleWatchlist} disabled={isWatchlistLoading || isTogglingWatchlist} className="p-2 bg-gray-700/80 hover:bg-gray-600 rounded-full text-white transition disabled:opacity-50" title={isInWatchlist ? t('detail_page_watchlist_remove_tooltip') : t('detail_page_watchlist_add_tooltip')}>
                                          {isWatchlistLoading || isTogglingWatchlist ? <FaSpinner className="animate-spin w-4 h-4" /> : (isInWatchlist ? <FaClock className="w-4 h-4 text-blue-400" /> : <FaRegClock className="w-4 h-4" />) }
                                     </button>
                                     {/* Log Düzenle Butonu (Genel dizi logu için) */}
                                     <button onClick={openLogModal} className="p-2 bg-gray-700/80 hover:bg-gray-600 rounded-full text-white transition" title={t('detail_page_edit_log_tooltip')}>
                                        <FaPencilAlt className="w-4 h-4" />
                                     </button>
                                 </div>
                             )}
                             {/* Hata Mesajı (Hızlı loglama için) */}
                             {quickLogActionError && <p className="text-xs text-red-400 mt-2 text-center md:text-left">{quickLogActionError}</p>}
                          </div>
                      </div>
                 </div>
             </div>

             {/* Ana İçerik Alanı (Özet, Oyuncular, Yaratıcılar, Sezonlar, Son Aktiviteler, Detaylar, Öneriler) */}
             <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-28 pb-8 md:pb-12">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                     {/* Sol Sütun (Özet, Oyuncular, Yaratıcılar, Sezonlar, Son Aktiviteler) */}
                     <div className="md:col-span-2 space-y-8">
                         {/* Özet */}
                         {tvShowDetails.overview && (
                             <div>
                                 <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">{t('detail_page_overview_title')}</h2>
                                 <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{tvShowDetails.overview}</p>
                             </div>
                         )}
                        {/* Oyuncular Bölümü */}
                        {cast.length > 0 && (
                            <div>
                                <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100 flex items-center">
                                    <FaUsers className="mr-2 text-gray-500"/> {t('detail_page_cast_title')}
                                </h3>
                                {/* Yatay kaydırılabilir oyuncu kartları */}
                                <div className="flex space-x-4 overflow-x-auto pb-2 custom-scrollbar-thin">
                                    {cast.map(actor => (
                                        <PersonCard key={actor.id} person={actor} type="cast" />
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Yaratıcılar Bölümü */}
                        {creators.length > 0 && (
                             <div>
                                 <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100 flex items-center">
                                     <FaUserEdit className="mr-2 text-gray-500"/> {t('detail_page_creator_title')}
                                 </h3>
                                 {/* Yatay kaydırılabilir yaratıcı kartları */}
                                 <div className="flex space-x-4 overflow-x-auto pb-2 custom-scrollbar-thin">
                                     {creators.map(creator => (
                                         <PersonCard key={creator.id} person={creator} type="crew" />
                                     ))}
                                 </div>
                             </div>
                         )}
                         {/* Sezon Posterleri */}
                         {numberOfSeasons > 0 && (
                            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">{t('detail_page_seasons_title')}</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                    {/* Geçerli sezonları map ile render et */}
                                    {validSeasons.map((season) => (
                                        <Link key={season.id} to={`/tv/${tvId}/season/${season.season_number}`} className="block group/seasoncard focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-cyan-500 rounded-lg">
                                            <div className="relative aspect-[2/3] bg-gray-700 rounded-lg overflow-hidden shadow-md transition-transform duration-200 ease-in-out group-hover/seasoncard:scale-105">
                                                {/* Sezon posteri (fallback ile) */}
                                                <img src={getSeasonPosterUrlWithFallback(season.poster_path)} alt={`${tvShowDetails.name} - ${t('detail_page_season_prefix')} ${season.season_number} Posteri`} className="w-full h-full object-cover" loading="lazy" />
                                                {/* Poster üzerine sezon bilgisi */}
                                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                                                    <p className="text-white text-sm font-semibold text-shadow-sm">{t('detail_page_season_prefix')} {season.season_number}</p>
                                                    {season.episode_count && <p className="text-xs text-gray-300">{t('detail_page_episode_count_short', { count: season.episode_count })}</p>}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                         )}
                         {/* Son Aktiviteler (Herkese açık loglar) */}
                         <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                             <div className="flex justify-between items-center mb-4">
                                 <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center"> <FaComments className="mr-2 text-gray-500" /> {t('detail_page_recent_activity_title')} </h2>
                                 {/* İsteğe bağlı: "Tümünü Gör" linki */}
                             </div>
                             {recentLogsLoading && <div className="flex justify-center items-center py-6"><FaSpinner className="animate-spin text-cyan-500 text-2xl mr-2" /> {t('detail_page_activity_loading')}</div>}
                             {recentLogsError && <p className="text-red-500 dark:text-red-400 text-center py-4">{recentLogsError}</p>}
                             {!recentLogsLoading && !recentLogsError && (
                                 recentPublicLogs.length > 0 ? ( // Son loglar varsa göster
                                     <div className="space-y-5">
                                         {recentPublicLogs.map(log => ( <LogItem key={log.logId} log={log} /> ))}
                                     </div>
                                 ) : ( // Son log yoksa mesaj göster
                                     <p className="text-gray-500 dark:text-gray-400 italic text-center py-4 border border-dashed dark:border-gray-700 rounded-md">
                                         <FaInfoCircle className="inline mr-1.5 mb-0.5" /> {t('detail_page_no_activity')}
                                     </p>
                                 )
                             )}
                         </div>
                     </div>

                     {/* Sağ Sütun (Nereden İzlenir, Detaylar) */}
                      <div className="md:col-span-1 space-y-6">
                         {/* Nereden İzlenir? Bölümü */}
                         <WatchProvidersSection
                             providers={watchProviders} // API'den gelen sağlayıcı verisi
                             loading={providersLoading} // Yüklenme durumu
                             error={providersError} // Hata durumu
                             title={t('detail_page_watch_providers_title')} // Bölüm başlığı
                         />
                         {/* Detaylar Kutusu (Puan, Bölüm Sayısı) */}
                         {(tvShowDetails.vote_average > 0 || tvShowDetails.number_of_episodes > 0) && (
                             <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-sm border dark:border-gray-700">
                                <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b border-gray-300 dark:border-gray-700 pb-2">{t('detail_page_details_box_title')}</h4>
                                <dl className="text-sm space-y-2">
                                     {/* TMDB Puanı */}
                                     {tvShowDetails.vote_average > 0 && ( <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">{t('detail_page_tmdb_rating')}</dt><dd className="text-gray-800 dark:text-gray-200 font-medium">{tvShowDetails.vote_average.toFixed(1)} / 10 <span className="text-gray-400">{t('detail_page_vote_count', { count: tvShowDetails.vote_count })}</span></dd></div> )}
                                     {/* Bölüm Sayısı */}
                                     {tvShowDetails.number_of_episodes > 0 && ( <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">{t('detail_page_episode_count')}</dt><dd className="text-gray-800 dark:text-gray-200 font-medium">{tvShowDetails.number_of_episodes}</dd></div> )}
                                </dl>
                             </div>
                         )}
                      </div>
                 </div>

                 {/* Önerilen Diziler Bölümü */}
                  <div className="pt-10 mt-10 border-t border-gray-200 dark:border-gray-700">
                     <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">{t('detail_page_recommendations_title')}</h2>
                     {similarLoading && <p className="text-gray-500 dark:text-gray-400 italic">{t('detail_page_recommendations_loading')}</p>}
                     {similarError && <p className="text-red-500 dark:text-red-400">{similarError}</p>}
                     {!similarLoading && !similarError && (
                          similarTvShows.length > 0 ? ( // Önerilen dizi varsa göster
                               <>
                                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                                      {/* Gösterilecek benzer dizileri map ile render et */}
                                      {displayedSimilarTvShows.map(tv => (
                                          <Link to={`/tv/${tv.id}`} key={tv.id} className="block group/card focus:outline-none">
                                              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border dark:border-gray-700 group-hover/card:border-gray-400 dark:group-hover/card:border-gray-600 transition-colors">
                                                  <img
                                                    src={tv.poster_path ? `${SIMILAR_IMAGE_BASE_URL}${tv.poster_path}` : PLACEHOLDER_SIMILAR}
                                                    alt={`${tv.name} Posteri`}
                                                    className="w-full object-cover aspect-[2/3] transition-opacity duration-300 group-hover/card:opacity-75"
                                                    loading="lazy"
                                                  />
                                                  <div className="p-3 text-center">
                                                      <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate" title={tv.name}>{tv.name}</h3>
                                                      {tv.first_air_date && ( <p className="text-xs text-gray-500 dark:text-gray-400">({tv.first_air_date.substring(0, 4)})</p> )}
                                                  </div>
                                              </div>
                                          </Link>
                                      ))}
                                  </div>
                                   {/* Eğer gösterilecek daha fazla dizi varsa "Daha Fazla/Az Göster" butonu */}
                                   {similarTvShows.length > SIMILAR_ITEMS_INITIAL_LIMIT && (
                                       <div className="text-center mt-6">
                                           <button
                                               onClick={() => setShowAllSimilar(prev => !prev)} // Butona tıklanınca state'i değiştir
                                               className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700/50 hover:bg-gray-600/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-cyan-500 transition-colors"
                                           >
                                               {showAllSimilar ? ( // Duruma göre buton metnini ve ikonunu değiştir
                                                   <> <FaChevronUp className="w-4 h-4 mr-2" /> {t('detail_page_show_less')} </>
                                               ) : (
                                                   <> <FaChevronDown className="w-4 h-4 mr-2" /> {t('detail_page_show_more')} </>
                                               )}
                                           </button>
                                       </div>
                                   )}
                               </>
                          ) : ( // Önerilen dizi yoksa mesaj göster
                              <p className="text-gray-500 italic">{t('detail_page_no_recommendations')}</p>
                          )
                      )}
                 </div>
             </div>
        </div>
    );
}

export default TvShowDetailPage;
