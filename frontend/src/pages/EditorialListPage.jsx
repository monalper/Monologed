// src/pages/EditorialListPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; // Token gerekebilir (eğer liste private ise ve admin görüyorsa)
import { useTranslation } from 'react-i18next';
import { FaSpinner, FaInfoCircle, FaUserCircle, FaFilm, FaTv, FaExternalLinkAlt } from 'react-icons/fa';
import PageLayout from '../components/PageLayout'; // PageLayout'u import ediyoruz

// Sabitler
const COVER_IMAGE_PLACEHOLDER = 'https://via.placeholder.com/1280x400.png?text=Liste+Kapak+Resmi';
const ITEM_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w342';
const PLACEHOLDER_ITEM_POSTER = 'https://via.placeholder.com/342x513.png?text=Poster+Yok';

// Yüklenme Göstergesi
const LoadingIndicator = ({ text }) => (
    <div className="flex justify-center items-center min-h-[200px] text-gray-500 dark:text-gray-400">
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

function EditorialListPage() {
    const { t, i18n } = useTranslation();
    const { listId } = useParams();
    const { token } = useAuth(); // Liste private ise veya admin özel erişimi için gerekebilir

    const [listData, setListData] = useState(null);
    const [itemDetailsList, setItemDetailsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [itemsLoading, setItemsLoading] = useState(false);

    useEffect(() => {
        if (!listId) {
            setError(t('list_page_error_no_id'));
            setLoading(false);
            return;
        }
        const fetchListData = async () => {
            setLoading(true); setError(null); setListData(null);
            setItemDetailsList([]); setItemsLoading(false);

            try {
                // `getListById` hem normal hem de editöryel listeleri getirecek şekilde güncellenmişti.
                // Public editöryel listeler için token gerekmeyebilir,
                // ama private ise veya admin özel erişimi varsa token gerekebilir.
                // Backend bu kontrolü yapacaktır.
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const response = await axios.get(`/api/lists/${listId}`, { headers });
                
                if (response.data.list && response.data.list.isEditorial) {
                    setListData(response.data.list);
                } else {
                    // Eğer liste editöryel değilse veya bulunamadıysa hata ver
                    setError(t('editorial_list_page_error_not_editorial_or_found'));
                    setListData(null);
                }
            } catch (err) {
                console.error(`Editöryel Liste detayı çekme hatası (ID: ${listId}):`, err.response?.data || err.message);
                if (err.response && (err.response.status === 404 || err.response.status === 403)) {
                    setError(t('editorial_list_page_error_not_editorial_or_found'));
                } else {
                    setError(t('editorial_list_page_error_load'));
                }
                setListData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchListData();
    }, [listId, token, t]);

    useEffect(() => {
        if (listData && listData.items && listData.items.length > 0) {
            const fetchItemDetails = async () => {
                setItemsLoading(true); setItemDetailsList([]);
                try {
                    const itemPromises = listData.items.map(item => {
                        const detailUrl = item.type === 'movie'
                            ? `/api/movies/${item.id}`
                            : `/api/tv/${item.id}`;
                        // Bu endpoint'ler public olduğu için token gerekmeyebilir.
                        return axios.get(detailUrl)
                             .then(res => ({ ...res.data, type: item.type }))
                             .catch(err => {
                                 console.error(`İçerik detayı çekme hatası (${item.type}/${item.id}):`, err.response?.data || err.message);
                                 return { id: item.id, type: item.type, error: true, name: t('list_page_item_load_error', { id: item.id, type: item.type }) };
                             });
                    });
                    const results = await Promise.all(itemPromises);
                    setItemDetailsList(results);
                } catch (error) {
                    console.error("Öğe detayları çekilirken genel hata:", error);
                    setError(t('editorial_list_page_error_load_items'));
                    setItemDetailsList([]);
                } finally {
                    setItemsLoading(false);
                }
            };
            fetchItemDetails();
        } else if (listData && (!listData.items || listData.items.length === 0)) {
             setItemsLoading(false);
             setItemDetailsList([]);
        }
    }, [listData, t]);

    const getImageUrl = (path, type = "poster") => {
        if (!path) {
            return type === "cover" ? COVER_IMAGE_PLACEHOLDER : PLACEHOLDER_ITEM_POSTER;
        }
        return type === "cover" ? path : `${ITEM_POSTER_BASE_URL}${path}`; // Kapak resmi doğrudan URL ise
    };


    if (loading) return <PageLayout><LoadingIndicator text={t('editorial_list_page_loading')} /></PageLayout>;
    if (error) return <PageLayout><ErrorDisplay message={error} /></PageLayout>;
    if (!listData) return <PageLayout><ErrorDisplay message={t('editorial_list_page_error_not_editorial_or_found')} /></PageLayout>;

    const listDisplayName = listData.listName || t('list_page_default_name');
    const createdDate = new Date(listData.createdAt).toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' });
    const ownerDisplayName = listData.ownerName || listData.ownerUsername || t('editorial_list_page_unknown_author');

    return (
        <PageLayout>
            <div className="bg-white dark:bg-black text-gray-800 dark:text-gray-100">
                {/* Kapak Resmi Alanı */}
                <div className="relative h-64 md:h-80 lg:h-96 w-full mb-8 group overflow-hidden">
                    <img
                        src={getImageUrl(listData.coverImageUrl, "cover")}
                        alt={`${listDisplayName} ${t('editorial_list_page_cover_alt')}`}
                        className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-6 md:p-8 z-10">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-shadow-md">
                            {listDisplayName}
                        </h1>
                        {listData.description && (
                            <p className="text-md md:text-lg text-gray-200 mt-2 max-w-2xl text-shadow-sm line-clamp-2">
                                {listData.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Liste Bilgileri (Oluşturan, Tarih) */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 pb-4">
                        <div>
                            <span className="font-semibold">{t('editorial_list_page_created_by')}:</span>{' '}
                            <Link to={`/user/${listData.userId}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                                {ownerDisplayName}
                            </Link>
                        </div>
                        <span>{t('editorial_list_page_created_at')}: {createdDate}</span>
                    </div>
                </div>


                {/* Listeye Eklenen Öğeler Bölümü */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
                        {t('list_page_items_title')} ({itemDetailsList.length})
                    </h2>

                    {itemsLoading && <LoadingIndicator text={t('list_page_items_loading')} />}

                    {!itemsLoading && (
                        itemDetailsList.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                                {itemDetailsList.map(item => {
                                    const itemTitle = item.title || item.name || t('unknown_title');
                                    const itemYear = (item.release_date || item.first_air_date)?.substring(0, 4);
                                    const itemDetailLink = item.type === 'movie' ? `/movie/${item.id}` : `/tv/${item.id}`;

                                    return (
                                        <div key={`${item.type}-${item.id}`} className="bg-white dark:bg-gray-800/50 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700/50 hover:shadow-xl transition-shadow duration-300">
                                            {item.error ? (
                                                <div className="h-full flex flex-col items-center justify-center p-4 text-center bg-red-50 dark:bg-red-900/30">
                                                    <FaInfoCircle className="w-8 h-8 text-red-400 mb-2"/>
                                                    <span className="text-xs text-red-500 dark:text-red-300">{item.name}</span>
                                                </div>
                                            ) : (
                                                <Link to={itemDetailLink} className="block group">
                                                    <div className="relative aspect-[2/3] bg-gray-700">
                                                        <img
                                                            src={getImageUrl(item.poster_path, "poster")}
                                                            alt={`${itemTitle} ${t('poster_alt')}`}
                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                            loading="lazy"
                                                        />
                                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                            <FaExternalLinkAlt className="w-8 h-8 text-white/80"/>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 text-center">
                                                        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors" title={itemTitle}>
                                                            {itemTitle}
                                                        </h3>
                                                        {itemYear && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                ({itemYear})
                                                            </p>
                                                        )}
                                                    </div>
                                                </Link>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            listData && (!listData.items || listData.items.length === 0) && (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                                    {t('list_page_empty')}
                                </p>
                            )
                        )
                    )}
                </div>
            </div>
        </PageLayout>
    );
}

export default EditorialListPage;