// src/pages/MyListsPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ListPreviewCard from '../components/ListPreviewCard';
import { FaPlusCircle, FaInfoCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next'; // *** useTranslation import edildi ***
import AddToListModal from '../components/AddToListModal';

function MyListsPage() {
    const { t } = useTranslation(); // *** t fonksiyonu alındı ***
    const { token } = useAuth();
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deletingListId, setDeletingListId] = useState(null);
    const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addModalListId, setAddModalListId] = useState(null);
    const [addModalContentType, setAddModalContentType] = useState(null);
    const [addModalContentId, setAddModalContentId] = useState(null);
    const [listStats, setListStats] = useState({});

    // Listeleri çekme
    useEffect(() => {
        if (token) {
            const fetchUserLists = async () => {
                setLoading(true); setError(null); setLists([]); setDeleteErrorMessage('');
                try {
                    const response = await axios.get('/api/lists', { // Proxy kullanıldığı varsayılarak base URL kaldırıldı
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setLists(response.data.lists || []);
                } catch (error) {
                     console.error("Kullanıcı listeleri çekme hatası:", error.response?.data || error.message);
                     if (error.response?.status === 401) {
                         setError(t('error_session_expired'));
                     } else {
                         setError(t('my_lists_error_generic')); // *** Çeviri kullanıldı ***
                     }
                     setLists([]);
                 } finally { setLoading(false); }
            };
            fetchUserLists();
        } else {
             setLoading(false);
             setError(t('my_lists_error_auth')); // *** Çeviri kullanıldı ***
             setLists([]);
        }
    }, [token, t]); // t bağımlılıklara eklendi

    // Her listenin istatistiklerini hesapla (örnek: izlenen oranı, toplam süre, izlenen süre)
    useEffect(() => {
        async function fetchStats() {
            if (!token || !lists.length) { setListStats({}); return; }
            const statsObj = {};
            for (const list of lists) {
                // Her listenin item'larını ve detaylarını çek
                if (!list.items || list.items.length === 0) {
                    statsObj[list.listId] = {
                        watchedCount: 0,
                        totalCount: 0,
                        percentWatched: 0,
                        totalDuration: 0,
                        watchedDuration: 0,
                        totalDurationText: '0 dk',
                        watchedDurationText: '0 dk',
                    };
                    continue;
                }
                // Her içerik için detayları çek
                const detailPromises = list.items.map(item => {
                    const url = item.type === 'movie' ? `/api/movies/${item.id}` : `/api/tv/${item.id}`;
                    return axios.get(url).then(res => ({ ...res.data, type: item.type, id: item.id })).catch(() => null);
                });
                const details = await Promise.all(detailPromises);
                // Kullanıcının loglarını çek
                const logPromises = list.items.map(item => {
                    return axios.get(`/api/logs`, {
                        params: { contentId: item.id, contentType: item.type },
                        headers: { Authorization: `Bearer ${token}` }
                    }).then(res => res.data.logs || []).catch(() => []);
                });
                const logsArr = await Promise.all(logPromises);
                // İstatistikleri hesapla
                let watchedCount = 0;
                let totalDuration = 0;
                let watchedDuration = 0;
                for (let i = 0; i < details.length; i++) {
                    const detail = details[i];
                    const logs = logsArr[i];
                    if (!detail) continue;
                    // Film için runtime, dizi için episode_run_time * episode_count
                    let duration = 0;
                    if (detail.type === 'movie') {
                        duration = detail.runtime || 0;
                    } else if (detail.type === 'tv') {
                        // Dizi için toplam bölüm * ortalama süre
                        const epCount = detail.number_of_episodes || 0;
                        const epRuntime = Array.isArray(detail.episode_run_time) ? (detail.episode_run_time[0] || 0) : (detail.episode_run_time || 0);
                        duration = epCount * epRuntime;
                    }
                    totalDuration += duration;
                    // İzlenmiş mi?
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
                const totalCount = list.items.length;
                const percentWatched = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;
                const totalDurationText = totalDuration > 0 ? (totalDuration >= 60 ? `${Math.round(totalDuration/60)} sa` : `${totalDuration} dk`) : '0 dk';
                const watchedDurationText = watchedDuration > 0 ? (watchedDuration >= 60 ? `${Math.round(watchedDuration/60)} sa` : `${watchedDuration} dk`) : '0 dk';
                statsObj[list.listId] = {
                    watchedCount,
                    totalCount,
                    percentWatched,
                    totalDuration,
                    watchedDuration,
                    totalDurationText,
                    watchedDurationText,
                };
            }
            setListStats(statsObj);
        }
        fetchStats();
    }, [lists, token]);

    // Listeyi Silme Fonksiyonu
    const handleDeleteList = async (listIdToDelete, listName) => {
        if (!listIdToDelete) return;
        setDeletingListId(listIdToDelete); setDeleteErrorMessage('');
        try {
            await axios.delete(`/api/lists/${listIdToDelete}`, { // Proxy kullanıldığı varsayılarak base URL kaldırıldı
                headers: { Authorization: `Bearer ${token}` }
            });
            setLists(prevLists => prevLists.filter(list => list.listId !== listIdToDelete));
        } catch (error) {
            console.error(`Liste silme hatası (ListId: ${listIdToDelete}):`, error.response?.data || error.message);
            // *** Çeviri kullanıldı (değişken ile) ***
            setDeleteErrorMessage(t('my_lists_delete_error', { message: error.response?.data?.message || 'Bir hata oluştu.' }));
        } finally { setDeletingListId(null); }
    };

    // Film/Dizi ekle butonu tıklanınca modalı aç
    const handleAddItem = (listId) => {
        setAddModalListId(listId);
        setAddModalOpen(true);
    };
    // Modal kapandığında
    const handleModalClose = () => {
        setAddModalOpen(false);
        setAddModalListId(null);
    };
    // Modalda ekleme başarılı olursa listeleri güncelle
    const handleItemAdded = () => {
        setAddModalOpen(false);
        setAddModalListId(null);
        // Listeyi yeniden çek
        if (token) {
            axios.get('/api/lists', { headers: { Authorization: `Bearer ${token}` } })
                .then(response => setLists(response.data.lists || []));
        }
    };

    return (
        <div className="space-y-8">
            {/* Başlık ve Buton */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                 {/* *** Başlık t() ile değiştirildi *** */}
                 <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{t('my_lists_page_title')}</h1>
                 <Link
                     to="/lists/create"
                     className="inline-flex items-center bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out text-sm shadow-sm"
                 >
                     <FaPlusCircle className="w-4 h-4 mr-2" />
                     {/* *** Buton metni t() ile değiştirildi *** */}
                     {t('my_lists_create_button')}
                 </Link>
             </div>

            {/* Yüklenme ve Hata Durumları */}
            {loading && (
                 <div className="flex justify-center items-center py-10">
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {/* *** Yükleniyor metni t() ile değiştirildi *** */}
                    <p className="ml-3 text-gray-500 dark:text-gray-400">{t('my_lists_loading')}</p>
                </div>
            )}
            {error && (
                <div className="text-center p-6 border border-red-300 dark:border-red-700 rounded-md bg-red-50 dark:bg-red-900/30">
                    <FaInfoCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                    <p className="text-red-600 dark:text-red-300">{error}</p>
                </div>
            )}
            {deleteErrorMessage && (
                 <div className="text-center p-4 mb-4 border border-red-300 dark:border-red-700 rounded-md bg-red-50 dark:bg-red-900/30">
                    <p className="text-red-600 dark:text-red-300 text-sm">{deleteErrorMessage}</p>
                 </div>
            )}

            {/* Liste İçeriği */}
            {!loading && !error && (
                lists.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                        {lists.map(list => (
                            <ListPreviewCard
                                key={list.listId}
                                list={list}
                                onDelete={handleDeleteList}
                                isDeleting={deletingListId === list.listId}
                            />
                        ))}
                    </div>
                ) : (
                     !deleteErrorMessage && (
                         <div className="text-center p-8 md:p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                             <FaInfoCircle className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                             {/* *** Boş liste metinleri t() ile değiştirildi *** */}
                             <p className="text-lg text-gray-600 dark:text-gray-400 mb-3">{t('my_lists_empty_title')}</p>
                             <p className="text-sm text-gray-500 dark:text-gray-500">
                                 {t('my_lists_empty_desc')}
                             </p>
                             <Link
                                 to="/lists/create"
                                 className="mt-6 inline-flex items-center bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-5 rounded-md transition duration-150 ease-in-out text-sm shadow-sm"
                             >
                                 <FaPlusCircle className="w-4 h-4 mr-2" />
                                 {t('my_lists_empty_button')}
                             </Link>
                         </div>
                     )
                )
            )}

            {/* AddToListModal */}
            <AddToListModal
                isOpen={addModalOpen}
                onClose={handleModalClose}
                contentId={null}
                contentType={null}
                onItemAdded={handleItemAdded}
                listId={addModalListId}
            />
        </div>
    );
}

export default MyListsPage;
