// src/components/AddToListModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Token almak için
import { useTranslation } from 'react-i18next'; // *** useTranslation import edildi ***

function AddToListModal({ isOpen, onClose, contentId, contentType, onItemAdded }) {
    const { t } = useTranslation(); // *** t fonksiyonu alındı ***
    const { token } = useAuth(); // Token'ı al
    const [userLists, setUserLists] = useState([]);
    const [listsLoading, setListsLoading] = useState(true);
    const [listsError, setListsError] = useState(null);
    const [selectedListId, setSelectedListId] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (isOpen && token) { // Token varsa listeleri çek
            setMessage('');
            setListsLoading(true);
            setListsError(null);
            setUserLists([]);
            setSelectedListId('');

            const fetchUserLists = async () => {
                try {
                    const response = await axios.get('/api/lists', { // Proxy varsayımı
                        headers: { Authorization: `Bearer ${token}` } // Token ekle
                    });
                    const fetchedLists = response.data.lists || [];
                    setUserLists(fetchedLists);
                    if (fetchedLists.length > 0) {
                        setSelectedListId(fetchedLists[0].listId);
                    }
                } catch (error) {
                    console.error("Kullanıcı listelerini modal içinde çekme hatası:", error);
                    setListsError(t('add_to_list_modal_error')); // *** Çeviri kullanıldı ***
                } finally {
                    setListsLoading(false);
                }
            };
            fetchUserLists();
        } else if (isOpen && !token) {
            // Token yoksa hata ver (modal açılmamalı ama güvenlik için)
            setListsLoading(false);
            setListsError(t('create_list_error_auth')); // Aynı hata mesajı kullanılabilir
        }
    }, [isOpen, token, t]); // t bağımlılıklara eklendi

    if (!isOpen) return null;

    const handleAdd = async () => {
        if (!selectedListId) {
            setMessage(t('add_to_list_modal_select_list')); // *** Çeviri kullanıldı ***
            return;
        }
        setIsAdding(true);
        setMessage('');
        const itemData = { contentId: Number(contentId), contentType: contentType };

        try {
            await axios.post(`/api/lists/${selectedListId}/items`, itemData, { // Proxy varsayımı
                headers: { Authorization: `Bearer ${token}` } // Token ekle
            });
            setMessage(t('add_to_list_modal_success')); // *** Çeviri kullanıldı ***
            if(onItemAdded) onItemAdded(selectedListId);
            setTimeout(onClose, 1500);
        } catch (error) {
            console.error(`Listeye ekleme hatası (Modal):`, error.response || error);
            // *** Çeviri kullanıldı (değişken ile) ***
            setMessage(t('add_to_list_modal_fail', { message: error.response?.data?.message || 'Bir hata oluştu.' }));
            setIsAdding(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Kapat">✕</button>
                {/* *** Başlık çevirisi *** */}
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">{t('add_to_list_modal_title')}</h3>

                {listsLoading && <p className="text-gray-500 dark:text-gray-400">{t('add_to_list_modal_loading')}</p>}
                {listsError && <p className="text-red-500">{listsError}</p>}

                {!listsLoading && !listsError && (
                    userLists.length > 0 ? (
                        <div className="space-y-4">
                            <select
                                value={selectedListId}
                                onChange={(e) => setSelectedListId(e.target.value)}
                                className="block w-full rounded-md border-gray-300 dark:border-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 dark:bg-gray-600 dark:text-gray-200"
                                disabled={isAdding}
                            >
                                {userLists.map(list => (
                                    <option key={list.listId} value={list.listId}>{list.listName}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAdd}
                                disabled={isAdding || !selectedListId}
                                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {/* *** Buton metni çevirisi *** */}
                                {isAdding ? t('add_to_list_modal_adding') : t('add_to_list_modal_add_button')}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 dark:text-gray-400">
                            {/* *** Boş liste metinleri çevirisi *** */}
                            <p>{t('add_to_list_modal_no_lists')}</p>
                            <Link to="/lists/create" onClick={onClose} className="text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                                {t('add_to_list_modal_create_button')}
                            </Link>
                        </div>
                    )
                )}
                 {message && <p className={`mt-3 text-sm text-center ${message.includes('başarısız') || message.includes('eklenemedi') || message.includes('mevcut') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{message}</p>}
            </div>
        </div>
    );
}

export default AddToListModal;
