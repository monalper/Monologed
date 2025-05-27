// src/pages/EditorialDisplayPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { FaSpinner, FaInfoCircle, FaUserCircle, FaCalendarAlt, FaFilm, FaTv, FaExternalLinkAlt, FaEye, FaListUl, FaClock, FaRegClock, FaPencilAlt, FaRegEye } from 'react-icons/fa';
import PageLayout from '../components/PageLayout'; // Genel sayfa düzeni için
import { useAuth } from '../context/AuthContext';
import LogEntryModal from '../components/LogEntryModal';
import AddToListModal from '../components/AddToListModal';
import TopCard from '../components/TopCard';

// Sabitler
const COVER_IMAGE_PLACEHOLDER = 'https://via.placeholder.com/1280x400.png?text=Kapak+Resmi+Yok'; // Daha genel bir placeholder
const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500'; // Bağlı içerik posteri için

// Backend URL (geliştirme için)
const BACKEND_URL = "http://localhost:5000";
const getCoverUrl = (url) => {
  if (!url) return '';
  return url.startsWith('/uploads/') ? BACKEND_URL + url : url;
};

// Axios instance oluştur
const api = axios.create({
  baseURL: BACKEND_URL
});

// Yüklenme Göstergesi
const LoadingIndicator = ({ text }) => (
    <div className="flex justify-center items-center min-h-[300px] text-gray-500 dark:text-gray-400">
        <FaSpinner className="animate-spin text-cyan-500 text-3xl mr-3" />
        {text}
    </div>
);

// Hata Göstergesi
const ErrorDisplay = ({ message }) => (
    <div className="text-center p-6 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300">
        <FaInfoCircle className="w-6 h-6 mx-auto mb-2" />
        {message || "Bir hata oluştu."}
    </div>
);

// Markdown'ı HTML'e çevirmek için basit bir fonksiyon (veya react-markdown gibi bir kütüphane kullanabilirsiniz)
// Güvenlik için, eğer HTML'e izin veriyorsanız, sanitization yaptığınızdan emin olun.
// Bu örnekte basit bir <pre> tagı ile gösterim yapacağız.
const renderCustomBody = (body) => {
    if (!body) return null;
    return (
        <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
            {body.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 last:mb-0">{paragraph}</p>
            ))}
        </div>
    );
};

function EditorialDisplayPage() {
    const { t, i18n } = useTranslation();
    const { slug } = useParams(); // URL'den slug'ı al
    const { token, user } = useAuth();
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [watchlistItemId, setWatchlistItemId] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [relatedContentDetails, setRelatedContentDetails] = useState(null); // Bağlı film/dizi detayı

    // --- Kartlar için state yönetimi ---
    const [itemStates, setItemStates] = useState({}); // { [itemId-type]: { logStatus, isTogglingLog, isInWatchlist, isTogglingWatchlist, logStatusLoading, isWatchlistLoading, actionError } }

    useEffect(() => {
        if (!slug) {
            setError(t('editorial_display_page_error_no_slug'));
            setLoading(false);
            return;
        }
        const fetchPageData = async () => {
            setLoading(true); setError(null); setPageData(null); setRelatedContentDetails(null);
            try {
                const response = await axios.get(`/api/editorial-pages/${slug}`);
                if (response.data.page) {
                    setPageData(response.data.page);
                    // Eğer sayfaya bir film/dizi bağlıysa, onun detaylarını da çek
                    if (response.data.page.contentId && response.data.page.contentType) {
                        try {
                            const contentDetailUrl = response.data.page.contentType === 'movie'
                                ? `/api/movies/${response.data.page.contentId}`
                                : `/api/tv/${response.data.page.contentId}`;
                            const contentRes = await axios.get(contentDetailUrl);
                            setRelatedContentDetails(contentRes.data);
                        } catch (contentErr) {
                            console.warn("Bağlı içerik detayı çekilemedi:", contentErr.message);
                            setRelatedContentDetails(null); // Hata durumunda null bırak
                        }
                    }
                } else {
                    setError(t('editorial_display_page_error_not_found'));
                }
            } catch (err) {
                console.error(`Editöryel sayfa çekme hatası (Slug: ${slug}):`, err.response?.data || err.message);
                if (err.response && err.response.status === 404) {
                    setError(t('editorial_display_page_error_not_found'));
                } else {
                    setError(t('editorial_display_page_error_load'));
                }
            } finally {
                setLoading(false);
            }
        };
        fetchPageData();
    }, [slug, t]);

    // Her kart için log ve watchlist durumunu çek
    useEffect(() => {
      if (!Array.isArray(pageData?.items) || !token) return;
      const fetchStates = async () => {
        const newStates = {};
        await Promise.all(pageData.items.map(async (item) => {
          const key = `${item.id}-${item.type}`;
          let logStatus = null, isInWatchlist = false, watchlistItemId = null;
          let logStatusLoading = true, isWatchlistLoading = true;
          try {
            // Log durumu
            const logRes = await api.get(`/api/logs/item/${item.type}/${item.id}`, { headers: { Authorization: `Bearer ${token}` } });
            logStatus = logRes.data.status; // 'watched', 'watching', null
            logStatusLoading = false;
          } catch { logStatusLoading = false; }
          try {
            // Watchlist durumu
            const statusRes = await api.get(`/api/watchlist/status/${item.type}/${item.id}`, { 
              headers: { Authorization: `Bearer ${token}` } 
            });
            isInWatchlist = statusRes.data.inWatchlist;
            watchlistItemId = statusRes.data.itemId;
            isWatchlistLoading = false;
          } catch { isWatchlistLoading = false; }
          newStates[key] = { 
            logStatus, 
            isInWatchlist, 
            watchlistItemId,
            logStatusLoading, 
            isWatchlistLoading, 
            isTogglingLog: false, 
            isTogglingWatchlist: false, 
            actionError: null 
          };
        }));
        setItemStates(newStates);
      };
      fetchStates();
    }, [pageData, token]);

    // --- Buton handler'ları ---
    const handleToggleLog = async (item) => {
      if (!token) return;
      const key = `${item.id}-${item.type}`;
      setItemStates(s => ({ ...s, [key]: { ...s[key], isTogglingLog: true, actionError: null } }));
      try {
        // Log ekle/kaldır işlemi
        if (itemStates[key]?.logStatus === 'watched') {
          await api.delete(`/api/logs?contentId=${item.id}&contentType=${item.type}`, { headers: { Authorization: `Bearer ${token}` } });
          setItemStates(s => ({ ...s, [key]: { ...s[key], logStatus: null } }));
        } else {
          await api.post(`/api/logs`, { contentId: item.id, contentType: item.type }, { headers: { Authorization: `Bearer ${token}` } });
          setItemStates(s => ({ ...s, [key]: { ...s[key], logStatus: 'watched' } }));
        }
      } catch (err) {
        setItemStates(s => ({ ...s, [key]: { ...s[key], actionError: 'İşlem başarısız.' } }));
      } finally {
        setItemStates(s => ({ ...s, [key]: { ...s[key], isTogglingLog: false } }));
      }
    };
    const handleToggleWatchlistBtn = async (item) => {
      if (!token) return;
      const key = `${item.id}-${item.type}`;
      setItemStates(s => ({ ...s, [key]: { ...s[key], isTogglingWatchlist: true, actionError: null } }));
      try {
        // Watchlist ekle/kaldır işlemi
        if (itemStates[key]?.isInWatchlist) {
          // itemId'yi state'den al
          // Önce watchlist durumunu kontrol et ve itemId'yi al
          const statusRes = await api.get(`/api/watchlist/status/${item.type}/${item.id}`, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
          
          if (statusRes.data.itemId) {
            await api.delete(`/api/watchlist/${statusRes.data.itemId}`, { 
              headers: { Authorization: `Bearer ${token}` }
            });
            setItemStates(s => ({ ...s, [key]: { ...s[key], isInWatchlist: false } }));
          }
        } else {
          await api.post(`/api/watchlist`, { 
            contentId: item.id, 
            contentType: item.type 
          }, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
          setItemStates(s => ({ ...s, [key]: { ...s[key], isInWatchlist: true } }));
        }
      } catch (err) {
        setItemStates(s => ({ ...s, [key]: { ...s[key], actionError: 'İşlem başarısız.' } }));
      } finally {
        setItemStates(s => ({ ...s, [key]: { ...s[key], isTogglingWatchlist: false } }));
      }
    };

    // Hızlı log (izlendi olarak işaretle)
    const handleQuickLog = (item) => {
      if (!token) return;
      setSelectedItem(item);
      setIsLogModalOpen(true);
    };
    // Listeye ekle modalı
    const handleAddToList = (item) => {
      if (!token) return;
      setSelectedItem(item);
      setIsListModalOpen(true);
    };
    // Log düzenle modalı
    const handleEditLog = (item) => {
      if (!token) return;
      setSelectedItem(item);
      setIsLogModalOpen(true);
    };

    if (loading) return <PageLayout><LoadingIndicator text={t('editorial_display_page_loading')} /></PageLayout>;
    if (error) return <PageLayout><ErrorDisplay message={error} /></PageLayout>;
    if (!pageData) return <PageLayout><ErrorDisplay message={t('editorial_display_page_error_not_found')} /></PageLayout>;

    const pageTitle = pageData.pageTitle || t('editorial_display_page_untitled');
    const coverImageUrl = pageData.coverImageUrl || COVER_IMAGE_PLACEHOLDER;
    const authorDisplayName = pageData.authorUsername || t('editorial_display_page_unknown_author');
    const publishedDate = new Date(pageData.createdAt).toLocaleDateString(i18n.language, {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const relatedContentLink = pageData.contentId && pageData.contentType
        ? (pageData.contentType === 'movie' ? `/movie/${pageData.contentId}` : `/tv/${pageData.contentId}`)
        : null;

    return (
        <PageLayout>
            <article className="max-w-4xl mx-auto">
                {/* Kapak Resmi */}
                <div className="relative h-64 md:h-80 lg:h-[450px] w-full mb-8 rounded-lg overflow-hidden shadow-lg">
                    <img
                        src={getCoverUrl(coverImageUrl)}
                        alt={`${pageTitle} ${t('editorial_display_page_cover_alt')}`}
                        className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
                </div>

                {/* Başlık ve Meta Bilgiler */}
                <header className="mb-8 text-center border-b dark:border-gray-700 pb-6">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                        {pageTitle}
                    </h1>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        <FaUserCircle className="inline-block mr-1.5 mb-0.5 opacity-80" />
                        <span>{t('editorial_display_page_by_author', { author: authorDisplayName })}</span>
                        <span className="mx-2">|</span>
                        <FaCalendarAlt className="inline-block mr-1.5 mb-0.5 opacity-80" />
                        <span>{publishedDate}</span>
                    </div>
                </header>

                {/* Ana İçerik ve Bağlı Film/Dizi Kartı */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
                    {/* Ana İçerik */}
                    <div className={` ${relatedContentDetails ? 'md:col-span-8 lg:col-span-9' : 'md:col-span-12'}`}>
                        {renderCustomBody(pageData.customBody)}
                        {Array.isArray(pageData.items) && pageData.items.length > 0 && (
                          <section className="mt-10">
                            <h2 className="text-xl font-bold mb-4 text-gray-100">Liste</h2>
                            <div className="space-y-8">
                              {pageData.items.map((item, idx) => {
                                let runtimeStr = '';
                                if (item.runtime && !isNaN(item.runtime)) {
                                  const h = Math.floor(item.runtime / 60);
                                  const m = item.runtime % 60;
                                  runtimeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
                                }
                                return (
                                  <TopCard
                                    key={item.id + '-' + item.type}
                                    index={idx + 1}
                                    poster={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/500x750.png?text=N/A'}
                                    title={item.title}
                                    year={item.year}
                                    overview={item.overview}
                                    runtime={runtimeStr}
                                    vote={item.vote_average}
                                    director={item.director}
                                    contentId={item.id}
                                    contentType={item.type}
                                  />
                                );
                              })}
                            </div>
                          </section>
                        )}
                    </div>

                    {/* Bağlı Film/Dizi Kartı (varsa) */}
                    {relatedContentDetails && (
                        <aside className="md:col-span-4 lg:col-span-3">
                            <div className="sticky top-20 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border dark:border-gray-700 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 border-b dark:border-gray-600 pb-2">
                                    {pageData.contentType === 'movie' ? t('editorial_display_page_related_movie') : t('editorial_display_page_related_tv')}
                                </h3>
                                <Link to={relatedContentLink} className="block group">
                                    <img
                                        src={relatedContentDetails.poster_path ? `${TMDB_POSTER_BASE_URL}${relatedContentDetails.poster_path}` : PLACEHOLDER_ITEM_POSTER}
                                        alt={relatedContentDetails.title || relatedContentDetails.name}
                                        className="w-full h-auto object-cover rounded-md mb-2 shadow-md transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
                                        {relatedContentDetails.title || relatedContentDetails.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        ({(relatedContentDetails.release_date || relatedContentDetails.first_air_date)?.substring(0,4)})
                                    </p>
                                </Link>
                                <Link
                                    to={relatedContentLink}
                                    className="mt-3 inline-flex items-center text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                                >
                                    {t('editorial_display_page_view_details_button')} <FaExternalLinkAlt className="ml-1 w-2.5 h-2.5" />
                                </Link>
                            </div>
                        </aside>
                    )}
                </div>
            </article>
            {/* Modallar */}
            {isLogModalOpen && selectedItem && (
              <LogEntryModal
                isOpen={isLogModalOpen}
                onClose={() => setIsLogModalOpen(false)}
                contentId={selectedItem.id}
                contentType={selectedItem.type}
              />
            )}
            {isListModalOpen && selectedItem && (
              <AddToListModal
                isOpen={isListModalOpen}
                onClose={() => setIsListModalOpen(false)}
                contentId={selectedItem.id}
                contentType={selectedItem.type}
              />
            )}
        </PageLayout>
    );
}

export default EditorialDisplayPage;