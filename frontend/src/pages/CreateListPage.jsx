// src/pages/CreateListPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaPlusCircle, FaSpinner, FaSearch, FaTimes, FaListAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next'; // *** useTranslation import edildi ***

// Debounce hook
function useDebounce(callback, delay) {
    const timeoutRef = useRef(null);
    useEffect(() => {
        return () => { if (timeoutRef.current) { clearTimeout(timeoutRef.current); } };
    }, []);
    return useCallback((...args) => {
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); }
        timeoutRef.current = setTimeout(() => { callback(...args); }, delay);
    }, [callback, delay]);
}

// Sabitler
const IMAGE_BASE_URL_W92 = 'https://image.tmdb.org/t/p/w92';
const PLACEHOLDER_IMAGE_W92 = 'https://via.placeholder.com/92x138.png?text=N/A';

function CreateListPage() {
    const { t } = useTranslation(); // *** t fonksiyonu alındı ***
    const [listName, setListName] = useState('');
    const [description, setDescription] = useState('');
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { token } = useAuth();

    // Öğe Ekleme State'leri
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const searchContainerRef = useRef(null);

    // Arama ve Seçim Fonksiyonları
    const fetchSuggestions = useCallback(async (term) => {
        if (!term || term.trim().length < 2) {
            setSuggestions([]); setShowSuggestions(false); setSuggestionsLoading(false); return;
        }
        setSuggestionsLoading(true); setShowSuggestions(true);
        try {
             const response = await axios.get('/api/suggestions', { // Proxy varsayımı
                 params: { query: term },
                 headers: token ? { Authorization: `Bearer ${token}` } : {} // Token ekle (gerekirse)
             });
              const suggestionsWithData = (response.data || []).map(item => ({
                 ...item,
                 poster_path: item.poster_path || null
             }));
             setSuggestions(suggestionsWithData);
        } catch (error) { console.error("Öneri arama hatası:", error); setSuggestions([]); }
        finally { setSuggestionsLoading(false); }
    }, [token]); // token bağımlılıklara eklendi

    const debouncedFetchSuggestions = useDebounce(fetchSuggestions, 400);

    const handleSearchChange = (event) => {
        const newTerm = event.target.value;
        setSearchTerm(newTerm);
        debouncedFetchSuggestions(newTerm);
    };

    const handleAddItem = (itemToAdd) => {
        if (!selectedItems.some(item => item.id === itemToAdd.id && item.type === itemToAdd.type)) {
            setSelectedItems(prevItems => [...prevItems, { ...itemToAdd }]);
        }
        setSearchTerm(''); setSuggestions([]); setShowSuggestions(false);
    };

    const handleRemoveItem = (itemToRemove) => {
        setSelectedItems(prevItems => prevItems.filter(item => !(item.id === itemToRemove.id && item.type === itemToRemove.type)));
    };

    useEffect(() => {
        const handleClickOutside = (event) => { if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) { setShowSuggestions(false); } };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }, []);

    // Form gönderme
    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage(''); setIsSuccess(false); setIsLoading(true);
        if (!listName.trim()) {
            setMessage(t('create_list_error_name_required')); // *** Çeviri kullanıldı ***
            setIsLoading(false); return;
        }
        if (!token) {
            setMessage(t('create_list_error_auth')); // *** Çeviri kullanıldı ***
            setIsLoading(false); return;
        }
        const itemsToSend = selectedItems.map(item => ({ id: item.id, type: item.type }));
        try {
            const response = await axios.post('/api/lists', { // Proxy varsayımı
                listName: listName, description: description, items: itemsToSend
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsSuccess(true);
            setMessage(t('create_list_success')); // *** Çeviri kullanıldı ***
            const newListId = response.data.list?.listId;
            setTimeout(() => { navigate(newListId ? `/list/${newListId}` : '/my-lists'); }, 1500);
        } catch (error) {
            console.error("Liste oluşturma hatası:", error.response?.data || error.message);
            // *** Çeviri kullanıldı (değişken ile) ***
            setMessage(t('create_list_error_generic', { message: error.response?.data?.message || 'Bir hata oluştu.' }));
            setIsLoading(false);
        }
        // Başarılı olunca setIsLoading(false) yapmaya gerek yok, yönlendirme olacak
    };

    return (
        <div className="min-h-screen bg-black w-full">
            <div className="max-w-3xl mx-auto px-4 py-12">
                <div className="bg-[#181818] rounded-3xl shadow-2xl border border-gray-800 overflow-hidden">
                    <div className="px-8 py-8 border-b border-gray-800">
                        <h1 className="text-2xl sm:text-3xl font-bold text-center text-white flex items-center justify-center gap-3">
                            <FaListAlt className="text-yellow-400" />
                            {t('create_list_page_title')}
                        </h1>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-8 p-8">
                        {/* Liste Bilgileri */}
                        <fieldset className="space-y-6">
                            <legend className="text-lg font-semibold text-white mb-3">{t('create_list_details_legend')}</legend>
                            <div>
                                <label htmlFor="listName" className="block text-base font-medium text-gray-200 mb-1">
                                    {t('create_list_name_label')} <span className="text-red-400">{t('create_list_name_required')}</span>
                                </label>
                                <input type="text" id="listName" value={listName} onChange={(e) => setListName(e.target.value)} required disabled={isLoading}
                                    className="w-full px-4 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-base bg-gray-800 text-gray-100 placeholder-gray-400 disabled:opacity-60"
                                    placeholder={t('create_list_name_placeholder')}
                                />
                            </div>
                            <div>
                                <label htmlFor="description" className="block text-base font-medium text-gray-200 mb-1">
                                    {t('create_list_desc_label')}
                                </label>
                                <textarea id="description" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isLoading}
                                    className="w-full px-4 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-base bg-gray-800 text-gray-100 placeholder-gray-400 disabled:opacity-60"
                                    placeholder={t('create_list_desc_placeholder')}
                                ></textarea>
                            </div>
                        </fieldset>
                        <hr className="border-gray-700/50" />
                        {/* Film/Dizi Ekleme */}
                        <fieldset className="space-y-4">
                            <legend className="text-lg font-semibold text-white">{t('create_list_add_items_legend')}</legend>
                            <div ref={searchContainerRef} className="relative">
                                <div className="relative">
                                    <label htmlFor="itemSearch" className="sr-only">{t('create_list_search_placeholder')}</label>
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaSearch className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input type="search" id="itemSearch"
                                        placeholder={t('create_list_search_placeholder')}
                                        value={searchTerm} onChange={handleSearchChange} onFocus={() => fetchSuggestions(searchTerm)} disabled={isLoading}
                                        className="w-full px-4 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-base bg-gray-800 text-gray-100 placeholder-gray-400 disabled:opacity-60"
                                    />
                                    {searchTerm && (
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                            <button type="button" onClick={() => { setSearchTerm(''); setSuggestions([]); setShowSuggestions(false); }} className="text-gray-400 hover:text-gray-200"
                                                aria-label={t('create_list_search_clear_aria')} >
                                                <FaTimes className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {/* Öneri Listesi */}
                                {showSuggestions && (
                                    <div className="absolute left-0 right-0 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                                        {suggestionsLoading && <div className="px-4 py-3 text-center text-gray-400 text-sm italic">{t('create_list_suggestions_loading')}</div>}
                                        {!suggestionsLoading && suggestions.length === 0 && searchTerm.length >= 2 && <div className="px-4 py-3 text-center text-gray-400 text-sm">{t('create_list_suggestions_no_results', { term: searchTerm })}</div>}
                                        {!suggestionsLoading && suggestions.length > 0 && (
                                            <ul className="divide-y divide-gray-700">
                                                {suggestions.map(item => (
                                                    <li key={`${item.type}-${item.id}`}>
                                                        <button type="button" onClick={() => handleAddItem(item)} className="flex items-center w-full text-left px-4 py-2.5 hover:bg-gray-700 transition-colors text-base">
                                                            <img src={item.poster_path ? `${IMAGE_BASE_URL_W92}${item.poster_path}` : PLACEHOLDER_IMAGE_W92} alt="" className="w-8 h-12 mr-3 object-cover rounded bg-gray-700"/>
                                                            <span className={`flex-shrink-0 mr-2 text-xs font-medium px-1.5 py-0.5 rounded ${item.type === 'movie' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>{item.type === 'movie' ? t('movie') : t('tv')}</span>
                                                            <span className="text-gray-100 font-medium truncate">{item.title || item.name}</span>
                                                            {item.release_date && <span className="ml-2 text-gray-400 text-xs">({item.release_date?.split('-')[0]})</span>}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                            {/* Seçilenler */}
                            {selectedItems.length > 0 && (
                                <div className="flex flex-wrap gap-3 mt-2">
                                    {selectedItems.map(item => (
                                        <div key={`${item.type}-${item.id}`} className="flex items-center bg-gray-700 text-gray-100 rounded-lg px-3 py-1 text-sm shadow border border-gray-600">
                                            <img src={item.poster_path ? `${IMAGE_BASE_URL_W92}${item.poster_path}` : PLACEHOLDER_IMAGE_W92} alt="" className="w-6 h-9 mr-2 object-cover rounded bg-gray-800"/>
                                            <span className="mr-2 font-medium">{item.title || item.name}</span>
                                            <button type="button" onClick={() => handleRemoveItem(item)} className="ml-1 text-gray-400 hover:text-red-400" aria-label={t('create_list_remove_item_aria')}>
                                                <FaTimes className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </fieldset>
                        {/* Mesajlar ve Buton */}
                        {message && (
                            <div className={`text-center text-base font-medium rounded-lg py-2 px-4 ${isSuccess ? 'bg-green-700/80 text-white' : 'bg-red-700/80 text-white'} mt-2`}>{message}</div>
                        )}
                        <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-lg transition disabled:opacity-60 disabled:cursor-wait">
                            {isLoading ? <FaSpinner className="animate-spin w-5 h-5 text-yellow-500" /> : <FaPlusCircle className="w-5 h-5" />}
                            {t('create_list_submit_button')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CreateListPage;
