// src/pages/SearchResultsPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import ContentCard from '../components/ContentCard';
import UserCard from '../components/UserCard';
import { FaSpinner, FaInfoCircle, FaUsers, FaFilm, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useTranslation } from 'react-i18next'; // *** useTranslation import edildi ***

// URL'deki query parametrelerini ayrıştırmak için yardımcı fonksiyon
function useQuery() {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search), [search]);
}

const USER_RESULTS_INITIAL_LIMIT = 5;

function SearchResultsPage() {
    const { t } = useTranslation(); // *** t fonksiyonu alındı ***
    const query = useQuery();
    const searchTerm = query.get('query');

    // State değişkenleri
    const [allResults, setAllResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAllUsers, setShowAllUsers] = useState(false);
    const [moviePage, setMoviePage] = useState(1);
    const [tvPage, setTvPage] = useState(1);
    const [movieHasMore, setMovieHasMore] = useState(true);
    const [tvHasMore, setTvHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const observer = useRef();
    const loadMoreRef = useRef();

    // Arama terimi değiştiğinde ilk sayfaları çek
    useEffect(() => {
        if (!searchTerm) {
            setAllResults([]); setLoading(false); setError(null); setShowAllUsers(false);
            setMoviePage(1); setTvPage(1); setMovieHasMore(true); setTvHasMore(true);
            return;
        }
        setShowAllUsers(false);
        setMoviePage(1); setTvPage(1);
        setMovieHasMore(true); setTvHasMore(true);
        const fetchSearchResults = async () => {
            setLoading(true); setError(null); setAllResults([]);
            try {
                const movieSearchPromise = axios.get(`/api/movies/search`, { params: { query: searchTerm, page: 1 } });
                const tvSearchPromise = axios.get(`/api/tv/search`, { params: { query: searchTerm, page: 1 } });
                const userSearchPromise = axios.get(`/api/users/search`, { params: { query: searchTerm } });
                const responses = await Promise.allSettled([movieSearchPromise, tvSearchPromise, userSearchPromise]);
                let combinedResults = [];
                let totalMovieResults = 0;
                let totalTvResults = 0;
                let movieResults = [];
                let tvResults = [];
                if (responses[0].status === 'fulfilled' && responses[0].value.data?.results) {
                    movieResults = responses[0].value.data.results.map(movie => ({ ...movie, type: 'movie', name: movie.title, date: movie.release_date }));
                    totalMovieResults = responses[0].value.data.total_results || 0;
                }
                if (responses[1].status === 'fulfilled' && responses[1].value.data?.results) {
                    tvResults = responses[1].value.data.results.map(show => ({ ...show, type: 'tv', date: show.first_air_date }));
                    totalTvResults = responses[1].value.data.total_results || 0;
                }
                if (responses[2].status === 'fulfilled' && responses[2].value.data?.users) {
                    const userResults = responses[2].value.data.users.map(user => ({ ...user, type: 'user' }));
                    combinedResults = combinedResults.concat(userResults);
                }
                combinedResults = combinedResults.concat(movieResults, tvResults);
                setAllResults(combinedResults);
                setMovieHasMore(movieResults.length < totalMovieResults);
                setTvHasMore(tvResults.length < totalTvResults);
            } catch (err) {
                setError(t('search_results_error'));
                setAllResults([]);
            } finally { setLoading(false); }
        };
        fetchSearchResults();
    }, [searchTerm, t]);

    // Sonsuz kaydırma için Intersection Observer
    useEffect(() => {
        if (loading || (!movieHasMore && !tvHasMore)) return;
        const current = loadMoreRef.current;
        if (!current) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new window.IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                fetchMore();
            }
        });
        observer.current.observe(current);
        return () => observer.current && observer.current.disconnect();
        // eslint-disable-next-line
    }, [loading, movieHasMore, tvHasMore, allResults]);

    // Daha fazla sonuç yükle
    const fetchMore = async () => {
        if (isFetchingMore || (!movieHasMore && !tvHasMore)) return;
        setIsFetchingMore(true);
        let newMovieResults = [];
        let newTvResults = [];
        let totalMovieResults = 0;
        let totalTvResults = 0;
        let nextMoviePage = moviePage;
        let nextTvPage = tvPage;
        try {
            const promises = [];
            if (movieHasMore) promises.push(axios.get(`/api/movies/search`, { params: { query: searchTerm, page: moviePage + 1 } }));
            else promises.push(Promise.resolve({ data: { results: [] } }));
            if (tvHasMore) promises.push(axios.get(`/api/tv/search`, { params: { query: searchTerm, page: tvPage + 1 } }));
            else promises.push(Promise.resolve({ data: { results: [] } }));
            const responses = await Promise.allSettled(promises);
            if (movieHasMore && responses[0].status === 'fulfilled' && responses[0].value.data?.results) {
                newMovieResults = responses[0].value.data.results.map(movie => ({ ...movie, type: 'movie', name: movie.title, date: movie.release_date }));
                totalMovieResults = responses[0].value.data.total_results || 0;
                nextMoviePage = moviePage + 1;
            }
            if (tvHasMore && responses[1].status === 'fulfilled' && responses[1].value.data?.results) {
                newTvResults = responses[1].value.data.results.map(show => ({ ...show, type: 'tv', date: show.first_air_date }));
                totalTvResults = responses[1].value.data.total_results || 0;
                nextTvPage = tvPage + 1;
            }
            setAllResults(prev => [...prev, ...newMovieResults, ...newTvResults]);
            setMoviePage(nextMoviePage);
            setTvPage(nextTvPage);
            setMovieHasMore((prev) => newMovieResults.length > 0 && (prev || (prev === undefined)) && (prev ? (newMovieResults.length + (prev ? (moviePage * 20) : 0)) < totalMovieResults : false));
            setTvHasMore((prev) => newTvResults.length > 0 && (prev || (prev === undefined)) && (prev ? (newTvResults.length + (prev ? (tvPage * 20) : 0)) < totalTvResults : false));
        } catch (err) {
            setMovieHasMore(false);
            setTvHasMore(false);
        } finally {
            setIsFetchingMore(false);
        }
    };

    // Sonuçları tipe göre ayır
    const userResults = useMemo(() => allResults.filter(item => item.type === 'user'), [allResults]);
    const contentResults = useMemo(() => allResults.filter(item => item.type === 'movie' || item.type === 'tv').sort((a, b) => (b.popularity || 0) - (a.popularity || 0)), [allResults]);
    const displayedUserResults = showAllUsers ? userResults : userResults.slice(0, USER_RESULTS_INITIAL_LIMIT);

    // Render kısmı
    return (
        <div className="space-y-8">
            {/* *** Başlık çevirisi *** */}
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 border-b border-gray-700 pb-4">
                {t('search_results_page_title')} <span className="font-normal">{searchTerm || ''}</span>
            </h1>

            {loading && (
                 <div className="flex justify-center items-center py-10 text-gray-500 dark:text-gray-400">
                    <FaSpinner className="animate-spin text-brand-text text-3xl mr-3" />
                    {/* *** Yükleniyor metni çevirisi *** */}
                    {t('search_results_loading')}
                </div>
            )}
            {error && (
                 <div className="text-center p-6 border border-red-700 rounded-md bg-red-900/30 text-red-300">
                    <FaInfoCircle className="inline mr-2" /> {error}
                </div>
            )}

            {!loading && !error && allResults.length === 0 && searchTerm && (
                 <div className="text-center p-8 border-2 border-dashed border-gray-700 rounded-lg bg-gray-800/30">
                    <FaInfoCircle className="w-10 h-10 text-gray-500 mx-auto mb-4" />
                    {/* *** Sonuç yok metni çevirisi (değişken ile) *** */}
                    <p className="text-lg text-gray-400">{t('search_results_not_found', { term: searchTerm })}</p>
                </div>
            )}

            {!loading && !error && allResults.length > 0 && (
                <>
                    {/* Kullanıcı Sonuçları Bölümü */}
                    {userResults.length > 0 && (
                        <section>
                            {/* *** Başlık çevirisi (değişken ile) *** */}
                            <h2 className="text-xl font-semibold mb-4 text-gray-300 flex items-center">
                                <FaUsers className="mr-2 text-gray-500" /> {t('search_results_users_title', { count: userResults.length })}
                            </h2>
                            <div className="flex flex-col space-y-3">
                                {displayedUserResults.map(user => (
                                    <UserCard key={`user-${user.userId}`} user={user} />
                                ))}
                            </div>
                            {userResults.length > USER_RESULTS_INITIAL_LIMIT && (
                                <div className="mt-4 text-center">
                                    <button
                                        onClick={() => setShowAllUsers(prev => !prev)}
                                        className="inline-flex items-center px-4 py-1.5 border border-gray-600 text-xs font-medium rounded-full text-gray-300 bg-gray-700/50 hover:bg-gray-600/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-brand-hover transition-colors"
                                    >
                                        {/* *** Buton metinleri çevirisi (değişken ile) *** */}
                                        {showAllUsers ? (
                                            <> <FaChevronUp className="w-3 h-3 mr-1.5" /> {t('search_results_show_less')} </>
                                        ) : (
                                            <> <FaChevronDown className="w-3 h-3 mr-1.5" /> {t('search_results_show_all', { count: userResults.length })} </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Film ve Dizi Sonuçları Bölümü */}
                    {contentResults.length > 0 && (
                        <section>
                             {/* *** Başlık çevirisi (değişken ile) *** */}
                             <h2 className="text-xl font-semibold mb-4 text-gray-300 flex items-center">
                                <FaFilm className="mr-2 text-gray-500" /> {t('search_results_content_title', { count: contentResults.length })}
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-0.5 gap-y-6">
                                {contentResults.map(item => (
                                    <ContentCard key={`${item.type}-${item.id}`} item={item} />
                                ))}
                            </div>
                            <div ref={loadMoreRef} />
                            {isFetchingMore && (
                              <div className="flex justify-center py-4 text-gray-400">
                                <FaSpinner className="animate-spin mr-2" /> {t('search_results_loading_more')}
                              </div>
                            )}
                            {(!movieHasMore && !tvHasMore) && (
                              <div className="text-center py-4 text-gray-500 text-sm">
                                {t('search_results_no_more')}
                              </div>
                            )}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

export default SearchResultsPage;
