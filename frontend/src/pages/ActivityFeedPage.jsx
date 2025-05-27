// frontend/src/pages/ActivityFeedPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LogItem from '../components/LogItem';
import PostItem from '../components/PostItem';
import CreatePostForm from '../components/CreatePostForm';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaSpinner, FaInfoCircle } from 'react-icons/fa';
import { useRef } from 'react';

function ActivityFeedPage() {
    const { t } = useTranslation();
    const { token, user } = useAuth();
    const [feedItems, setFeedItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [featured, setFeatured] = useState([]);
    const [featuredLoading, setFeaturedLoading] = useState(true);
    const [featuredError, setFeaturedError] = useState(null);

    const fetchFeed = useCallback(async () => {
        setError(null);
        if (!token) {
            setError(t('activity_feed_error_auth'));
            setLoading(false);
            setFeedItems([]);
            return;
        }
        // setLoading(true); // Yeniden yüklerken spinner göstermek için
        try {
            const response = await axios.get('/api/feed', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const itemsWithPostType = (response.data.feed || []).map(item => ({
                ...item,
                postType: item.postType || 'log'
            }));
            setFeedItems(itemsWithPostType);
        } catch (error) {
            console.error("Aktivite akışı çekme hatası (ActivityFeedPage):", error.response?.data || error.message);
            if (error.response?.status === 401) {
                setError(t('error_session_expired'));
            } else {
                setError(t('activity_feed_error'));
            }
            setFeedItems([]);
        } finally {
            setLoading(false);
        }
    }, [token, t]);

    const handlePostCreated = (newPost) => {
        console.log("Yeni gönderi oluşturuldu, akış yenileniyor:", newPost);
        const postWithDetails = {
            ...newPost,
            postType: newPost.postType || 'text',
            userInfo: {
                userId: user?.userId,
                username: user?.username,
                name: user?.name,
                avatarUrl: user?.avatarUrl,
                isVerified: user?.isVerified ?? false
            }
        };
        setFeedItems(prevItems => [postWithDetails, ...prevItems]);
    };

    // <<< YENİ: Gönderi Silme Handler'ı >>>
    const handleDeletePost = useCallback((deletedLogId) => {
        setFeedItems(prevItems => prevItems.filter(item => item.logId !== deletedLogId));
        console.log(`Gönderi ${deletedLogId} akıştan kaldırıldı.`);
        // İsteğe bağlı: Kullanıcıya bir başarı mesajı gösterilebilir.
    }, []);
    // <<< YENİ SONU >>>

    useEffect(() => {
        fetchFeed();
        // Trend içerikleri çek
        const fetchFeatured = async () => {
            setFeaturedLoading(true);
            setFeaturedError(null);
            try {
                const res = await axios.get('/api/main/featured');
                setFeatured(res.data.items || []);
            } catch (err) {
                setFeaturedError('Trend içerikler yüklenemedi.');
                setFeatured([]);
            } finally {
                setFeaturedLoading(false);
            }
        };
        fetchFeatured();
    }, [fetchFeed]);

    return (
        <div className="min-h-screen bg-black">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-black/80 backdrop-blur-md py-3 border-b border-gray-700 mb-6 sticky top-14 z-40">
                    <h1 className="text-xl font-bold text-gray-100 text-center">{t('activity_feed_page_title')}</h1>
                </div>

                {/* Trendler/Öne Çıkanlar Alanı */}
                <div className="mb-7">
                  <h2 className="text-lg font-semibold text-white mb-2">🔥 Öne Çıkanlar</h2>
                  {featuredLoading ? (
                    <div className="flex items-center text-gray-400 text-sm"><FaSpinner className="animate-spin mr-2" /> Yükleniyor...</div>
                  ) : featuredError ? (
                    <div className="text-red-400 text-sm">{featuredError}</div>
                  ) : featured.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                      {featured.map(item => (
                        <a
                          key={item.media_type + '-' + item.id}
                          href={item.media_type === 'movie' ? `/movie/${item.id}` : `/tv/${item.id}`}
                          className="flex-shrink-0 w-32 bg-neutral-900 rounded-xl shadow border border-gray-800 hover:border-cyan-500 transition-colors group"
                          title={item.title}
                        >
                          <img
                            src={item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : 'https://via.placeholder.com/185x278.png?text=N/A'}
                            alt={item.title}
                            className="w-full h-44 object-cover rounded-t-xl"
                            loading="lazy"
                          />
                          <div className="p-2">
                            <div className="text-xs font-semibold text-white truncate group-hover:text-cyan-400">{item.title}</div>
                            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <span>{item.media_type === 'movie' ? 'Film' : 'Dizi'}</span>
                              {item.vote_average && <span className="ml-1">⭐ {item.vote_average}</span>}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">Bugün için öne çıkan içerik yok.</div>
                  )}
                </div>

                {token && (
                    <CreatePostForm onPostCreated={handlePostCreated} />
                )}

                <div>
                    {loading && (
                        <div className="flex justify-center items-center py-10">
                            <FaSpinner className="animate-spin text-cyan-500 text-2xl mr-2" />
                            <p className="text-gray-500">{t('activity_feed_loading')}</p>
                        </div>
                    )}
                    {error && (
                        <div className="text-center p-6 border border-red-700 rounded-md bg-red-900/30 text-red-300">
                            <FaInfoCircle className="inline mr-2" /> {error}
                        </div>
                    )}

                    {!loading && !error && (
                        feedItems.length > 0 ? (
                            <div className="space-y-3">
                                {feedItems.map(item => (
                                    item.postType === 'text' || item.postType === 'quote'
                                        ? <PostItem key={item.logId} post={item} onDelete={handleDeletePost} />
                                        : <LogItem key={item.logId} log={item} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-10 border border-dashed border-gray-700 rounded-lg bg-gray-800/50 mt-8">
                                <FaInfoCircle className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                                <p className="text-gray-400 mb-2 text-base">{t('activity_feed_empty_title')}</p>
                                <p className="text-sm text-gray-500">{t('activity_feed_empty_desc')}</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

export default ActivityFeedPage;
