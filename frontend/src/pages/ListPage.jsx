// src/pages/ListPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next'; // *** useTranslation import edildi ***
import { FaTrash, FaSpinner, FaPlusCircle } from 'react-icons/fa'; // İkonlar
import MultiAddToListModal from '../components/MultiAddToListModal';
import ContentCard from '../components/ContentCard';

// Sabitler
const IMAGE_BASE_URL_W342 = 'https://image.tmdb.org/t/p/w342';
const PLACEHOLDER_IMAGE_W342 = 'https://via.placeholder.com/342x513.png?text=Poster+Yok';

function ListPage() {
    const { t, i18n } = useTranslation(); // *** t ve i18n alındı ***
    const { listId } = useParams();
    const { token, user } = useAuth();
    const [listData, setListData] = useState(null);
    const [itemDetailsList, setItemDetailsList] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [errorList, setErrorList] = useState(null);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [removingItemId, setRemovingItemId] = useState(null);
    const [removeErrorMessage, setRemoveErrorMessage] = useState('');
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [listStats, setListStats] = useState(null);

    // isOwner'ı en başta tanımla
    const isOwner = user && listData && user.userId === listData.userId;

    // Liste ana verisini çekme
    useEffect(() => {
        if (!listId) {
            setErrorList(t('list_page_error_no_id')); // *** Çeviri kullanıldı ***
            setLoadingList(false);
            return;
        }
        const fetchListData = async () => {
            setLoadingList(true); setErrorList(null); setListData(null);
            setItemDetailsList([]); setItemsLoading(false); setRemoveErrorMessage('');

            if (!token) {
                setErrorList(t('list_page_error_auth')); // *** Çeviri kullanıldı ***
                setLoadingList(false);
                return;
            }

            try {
                const response = await axios.get(`/api/lists/${listId}`, { // Proxy varsayımı
                    headers: { Authorization: `Bearer ${token}` }
                });
                setListData(response.data.list);
            } catch (err) {
                console.error(`Liste detayı çekme hatası (ListPage - ID: ${listId}):`, err.response?.data || err.message);
                if (err.response && (err.response.status === 404 || err.response.status === 403)) {
                    setErrorList(t('list_page_error_not_found_or_forbidden')); // *** Çeviri kullanıldı ***
                } else {
                    setErrorList(t('list_page_error_load')); // *** Çeviri kullanıldı ***
                }
                setListData(null);
            } finally {
                setLoadingList(false);
            }
        };
        fetchListData();
    }, [listId, token, t]); // t bağımlılıklara eklendi

    // Liste öğelerinin detaylarını çekme
    useEffect(() => {
        if (listData && listData.items && listData.items.length > 0) {
            const fetchItemDetails = async () => {
                setItemsLoading(true); setItemDetailsList([]);
                try {
                    const itemPromises = listData.items.map(item => {
                        const detailUrl = item.type === 'movie'
                            ? `/api/movies/${item.id}`
                            : `/api/tv/${item.id}`;
                        return axios.get(detailUrl)
                             .then(res => ({ ...res.data, type: item.type }))
                             .catch(err => {
                                 console.error(`İçerik detayı çekme hatası (${item.type}/${item.id}):`, err.response?.data || err.message);
                                 // *** Hata mesajı çevirisi (değişken ile) ***
                                 return { id: item.id, type: item.type, error: true, name: t('list_page_item_load_error', { id: item.id, type: item.type }) };
                             });
                    });
                    const results = await Promise.all(itemPromises);
                    setItemDetailsList(results);
                } catch (error) {
                    console.error("Öğe detayları çekilirken genel hata:", error);
                    setErrorList(t('list_page_error_load')); // Ana hatayı set et
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
    }, [listData, t]); // t bağımlılıklara eklendi

    // İstatistikleri hesapla
    useEffect(() => {
        async function calcStats() {
            if (!listData || !itemDetailsList.length) { setListStats(null); return; }
            // Kullanıcının loglarını çek
            const logPromises = itemDetailsList.map(item => {
                return axios.get(`/api/logs`, {
                    params: { contentId: item.id, contentType: item.type },
                    headers: { Authorization: `Bearer ${token}` }
                }).then(res => res.data.logs || []).catch(() => []);
            });
            const logsArr = await Promise.all(logPromises);
            let watchedCount = 0;
            let totalDuration = 0;
            let watchedDuration = 0;
            for (let i = 0; i < itemDetailsList.length; i++) {
                const detail = itemDetailsList[i];
                const logs = logsArr[i];
                if (!detail) continue;
                let duration = 0;
                if (detail.type === 'movie') {
                    duration = detail.runtime || 0;
                } else if (detail.type === 'tv') {
                    const epCount = detail.number_of_episodes || 0;
                    const epRuntime = Array.isArray(detail.episode_run_time) ? (detail.episode_run_time[0] || 0) : (detail.episode_run_time || 0);
                    duration = epCount * epRuntime;
                }
                totalDuration += duration;
                let isWatched = false;
                if (detail.type === 'movie') {
                    isWatched = logs.length > 0;
                } else if (detail.type === 'tv') {
                    isWatched = logs.some(log => log.seasonNumber === undefined || log.seasonNumber === null);
                }
                if (isWatched) {
                    watchedCount++;
                    watchedDuration += duration;
                }
            }
            const totalCount = itemDetailsList.length;
            const percentWatched = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;
            const totalDurationText = totalDuration > 0 ? (totalDuration >= 60 ? `${Math.round(totalDuration/60)} sa` : `${totalDuration} dk`) : '0 dk';
            const watchedDurationText = watchedDuration > 0 ? (watchedDuration >= 60 ? `${Math.round(watchedDuration/60)} sa` : `${watchedDuration} dk`) : '0 dk';
            setListStats({
                watchedCount,
                totalCount,
                percentWatched,
                totalDuration,
                watchedDuration,
                totalDurationText,
                watchedDurationText,
            });
        }
        if (isOwner && itemDetailsList.length > 0) calcStats();
    }, [isOwner, itemDetailsList, listData, token]);

    // Güvenli Resim URL'si
    const getImageUrl = (path) => path ? `${IMAGE_BASE_URL_W342}${path}` : PLACEHOLDER_IMAGE_W342;

    // Listeden Öğe Çıkarma
    const handleRemoveItem = async (itemToRemove) => {
        if (!listId || !itemToRemove || !itemToRemove.id || !itemToRemove.type) {
            setRemoveErrorMessage(t('list_page_remove_error_missing')); // *** Çeviri kullanıldı ***
            return;
        }
        const removingKey = `${itemToRemove.type}-${itemToRemove.id}`;
        setRemovingItemId(removingKey); setRemoveErrorMessage('');
        try {
            await axios.delete(`/api/lists/${listId}/items`, { // Proxy varsayımı
                data: { contentId: itemToRemove.id, contentType: itemToRemove.type },
                headers: { Authorization: `Bearer ${token}` }
            });
            setItemDetailsList(prevDetails =>
                prevDetails.filter(detail => !(detail.id === itemToRemove.id && detail.type === itemToRemove.type))
            );
            setListData(prevListData => ({
                ...prevListData,
                items: prevListData.items.filter(item => !(item.id === itemToRemove.id && item.type === itemToRemove.type))
            }));
        } catch (error) {
            console.error(`Listeden öğe çıkarma hatası (ListId: ${listId}, Item: ${itemToRemove.type}/${itemToRemove.id}):`, error.response?.data || error.message);
            // *** Hata mesajı çevirisi (değişken ile) ***
            setRemoveErrorMessage(t('list_page_remove_error_generic', { message: error.response?.data?.message || 'Bir hata oluştu.' }));
        } finally {
            setRemovingItemId(null);
        }
    };

    // Modal aç/kapat fonksiyonları
    const handleAddClick = () => setAddModalOpen(true);
    const handleModalClose = () => setAddModalOpen(false);
    const handleItemAdded = () => { setAddModalOpen(false); window.location.reload(); };

    // Render
    if (loadingList) { return <p className="text-center text-gray-500 dark:text-gray-400 mt-10">{t('list_page_loading')}</p>; }
    if (errorList) { return <p className="text-center text-red-500 mt-10">{errorList}</p>; }
    if (!listData && !loadingList) { return <p className="text-center text-gray-500 dark:text-gray-400 mt-10">{t('list_page_error_not_found_generic')}</p>; }

    const listDisplayName = listData?.listName || t('list_page_default_name');
    const createdDate = listData?.createdAt ? new Date(listData.createdAt).toLocaleDateString(i18n.language) : ''; // i18n dili kullanıldı

    return (
        <div>
            {/* Liste Başlığı ve Açıklaması */}
            <div className="mb-6 border-b pb-4 dark:border-gray-700">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{listDisplayName}</h1>
                {listData?.description && ( <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">{listData.description}</p> )}
                {listData && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        {/* *** Metin ve öğe sayısı çevirisi *** */}
                        {t('list_page_created_prefix')} {createdDate} - {t('item_count', { count: itemDetailsList.length })}
                    </p>
                )}
                {/* İstatistikler ve Ekle Butonu */}
                {isOwner && (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4">
                        {listStats && (
                            <div className="flex flex-col gap-1 text-xs bg-gray-100 dark:bg-gray-800/60 rounded p-3 border border-gray-300 dark:border-gray-700">
                                <span><b>{t('İzlenen:')}</b> {listStats.watchedCount} / {listStats.totalCount} ({listStats.percentWatched}%)</span>
                                <span><b>{t('Toplam süre:')}</b> {listStats.totalDurationText}</span>
                                <span><b>{t('İzlenen süre:')}</b> {listStats.watchedDurationText}</span>
                            </div>
                        )}
                        <button
                            onClick={handleAddClick}
                            className="inline-flex items-center bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out text-sm shadow-sm"
                        >
                            <FaPlusCircle className="w-4 h-4 mr-2" />
                            {t('Film/Dizi Ekle')}
                        </button>
                    </div>
                )}
            </div>

            {/* Listeye Eklenen Öğeler Bölümü */}
            <div className="mt-8">
                {/* *** Başlık t() ile değiştirildi *** */}
                <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('list_page_items_title')}</h2>
                 {removeErrorMessage && <p className="text-red-500 text-sm mb-4">{removeErrorMessage}</p>}

                {itemsLoading && <p className="text-center text-gray-500 dark:text-gray-400">{t('list_page_items_loading')}</p>}

                {!itemsLoading && (
                    itemDetailsList.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                            {itemDetailsList.map(item => {
                                const isRemovingThis = removingItemId === `${item.type}-${item.id}`;
                                return (
                                    <div key={`${item.type}-${item.id}`} className="relative group">
                                        <ContentCard item={item} />
                                        {isOwner && (
                                            <button
                                                onClick={() => handleRemoveItem(item)}
                                                disabled={isRemovingThis}
                                                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 transition-opacity duration-150 disabled:opacity-50 disabled:cursor-wait opacity-0 group-hover:opacity-100 focus:opacity-100 z-20"
                                                title={t('list_page_remove_item_button_title')}
                                                aria-label={t('list_page_remove_item_button_aria', { title: item.title || item.name })}
                                            >
                                                {isRemovingThis ? <FaSpinner className="animate-spin h-4 w-4" /> : <FaTrash className="h-4 w-4" />}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        listData && (!listData.items || listData.items.length === 0) && (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                                {/* *** Boş liste metni t() ile değiştirildi *** */}
                                {t('list_page_empty')}
                            </p>
                        )
                    )
                )}
            </div>
            <MultiAddToListModal
                isOpen={addModalOpen}
                onClose={handleModalClose}
                listId={listId}
                onItemsAdded={handleItemAdded}
            />
        </div>
    );
}

export default ListPage;
