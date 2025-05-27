// Bu dosyada hem ana yönetim sayfası hem de liste oluşturma formu bileşenleri yer almaktadır.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; // AuthContext'i import ediyoruz
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTimes, FaSearch, FaFilm, FaTv, FaSpinner, FaCheckCircle, FaTimesCircle, FaListAlt, FaImage, FaEye, FaEyeSlash, FaEdit, FaTrashAlt } from 'react-icons/fa';

// Debounce hook (Öneri arama için)
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

// Sabitler (Öneri arama için)
const SUGGESTION_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w92';
const PLACEHOLDER_SUGGESTION_POSTER = 'https://via.placeholder.com/92x138.png?text=N/A';

// Editöryel Liste Oluşturma Formu Bileşeni
function CreateEditorialListForm({ onFormSubmitSuccess, onCancel }) {
    const { t } = useTranslation();
    const { token } = useAuth();

    // Form State'leri
    const [listName, setListName] = useState('');
    const [description, setDescription] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [items, setItems] = useState([]); // Listeye eklenecek filmler/diziler

    // Öğe Ekleme State'leri
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchContainerRef = useRef(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // Öneri Getirme Fonksiyonu
    const fetchSuggestions = useCallback(async (term) => {
        if (!term || term.trim().length < 2) {
            setSuggestions([]); setShowSuggestions(false); setSuggestionsLoading(false); return;
        }
        setSuggestionsLoading(true); setShowSuggestions(true);
        try {
            const response = await axios.get('/api/suggestions', { // Backend'deki öneri endpoint'i
                params: { query: term },
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const suggestionsWithData = (response.data || []).map(item => ({
                ...item,
                poster_path: item.poster_path || null
            }));
            setSuggestions(suggestionsWithData);
        } catch (error) {
            console.error("Editöryel liste için öneri arama hatası:", error);
            setSuggestions([]);
            setMessage(t('admin_editorial_list_form_error_suggestions'));
        } finally {
            setSuggestionsLoading(false);
        }
    }, [token, t]);

    const debouncedFetchSuggestions = useDebounce(fetchSuggestions, 400);

    const handleSearchChange = (event) => {
        const newTerm = event.target.value;
        setSearchTerm(newTerm);
        debouncedFetchSuggestions(newTerm);
    };

    const handleAddItem = (itemToAdd) => {
        if (!items.some(item => item.id === itemToAdd.id && item.type === itemToAdd.type)) {
            setItems(prevItems => [...prevItems, { id: itemToAdd.id, type: itemToAdd.type, title: itemToAdd.title, year: itemToAdd.year, poster_path: itemToAdd.poster_path }]);
        }
        setSearchTerm(''); setSuggestions([]); setShowSuggestions(false);
    };

    const handleRemoveItem = (itemToRemove) => {
        setItems(prevItems => prevItems.filter(item => !(item.id === itemToRemove.id && item.type === itemToRemove.type)));
    };

    // Dışarı tıklama ile öneri listesini kapatma
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    // Form Gönderme
    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage(''); setIsSuccess(false);
        if (!listName.trim()) {
            setMessage(t('admin_editorial_list_form_error_name_required'));
            return;
        }
        if (!token) {
            setMessage(t('admin_editorial_list_form_error_auth'));
            return;
        }

        setIsSubmitting(true);
        const listData = {
            listName: listName.trim(),
            description: description.trim(),
            coverImageUrl: coverImageUrl.trim() || null,
            isPublic: isPublic,
            items: items.map(item => ({ id: item.id, type: item.type })), // Sadece id ve type gönder
            isEditorialRoute: true // Backend'e bu rotadan gelindiğini belirt
        };

        try {
            const response = await axios.post('/api/admin/lists', listData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsSuccess(true);
            setMessage(t('admin_editorial_list_form_success_create'));
            // Formu sıfırla
            setListName(''); setDescription(''); setCoverImageUrl(''); setIsPublic(true); setItems([]);
            if (onFormSubmitSuccess) {
                onFormSubmitSuccess(response.data.list); // Yeni listeyi üst bileşene gönder
            }
            setTimeout(() => { setMessage(''); setIsSuccess(false); if(onCancel) onCancel(); }, 2000); // 2 saniye sonra mesajı temizle ve formu kapat
        } catch (error) {
            console.error("Editöryel liste oluşturma hatası:", error.response?.data || error.message);
            setMessage(error.response?.data?.message || t('admin_editorial_list_form_error_generic'));
            setIsSuccess(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
            <h2 className="text-xl font-semibold text-gray-100 mb-6">{t('admin_editorial_list_form_title_create')}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Liste Adı */}
                <div>
                    <label htmlFor="editorialListName" className="block text-sm font-medium text-gray-300 mb-1">
                        {t('admin_editorial_list_form_name_label')} <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        id="editorialListName"
                        value={listName}
                        onChange={(e) => setListName(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="block w-full px-4 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent sm:text-sm bg-gray-700 text-gray-100 placeholder-gray-400 disabled:opacity-60"
                        placeholder={t('admin_editorial_list_form_name_placeholder')}
                    />
                </div>

                {/* Açıklama */}
                <div>
                    <label htmlFor="editorialListDescription" className="block text-sm font-medium text-gray-300 mb-1">
                        {t('admin_editorial_list_form_desc_label')}
                    </label>
                    <textarea
                        id="editorialListDescription"
                        rows="3"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isSubmitting}
                        className="block w-full px-4 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent sm:text-sm bg-gray-700 text-gray-100 placeholder-gray-400 disabled:opacity-60"
                        placeholder={t('admin_editorial_list_form_desc_placeholder')}
                    ></textarea>
                </div>

                {/* Kapak Resmi URL'si */}
                <div>
                    <label htmlFor="editorialListCoverImage" className="block text-sm font-medium text-gray-300 mb-1">
                        {t('admin_editorial_list_form_cover_label')}
                    </label>
                    <input
                        type="url"
                        id="editorialListCoverImage"
                        value={coverImageUrl}
                        onChange={(e) => setCoverImageUrl(e.target.value)}
                        disabled={isSubmitting}
                        className="block w-full px-4 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent sm:text-sm bg-gray-700 text-gray-100 placeholder-gray-400 disabled:opacity-60"
                        placeholder={t('admin_editorial_list_form_cover_placeholder')}
                    />
                </div>

                {/* Herkese Açık Checkbox */}
                <div className="flex items-center">
                    <input
                        id="editorialListIsPublic"
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        disabled={isSubmitting}
                        className="h-4 w-4 text-cyan-600 border-gray-500 rounded focus:ring-cyan-500 bg-gray-600 focus:ring-offset-gray-800"
                    />
                    <label htmlFor="editorialListIsPublic" className="ml-2 block text-sm text-gray-300">
                        {t('admin_editorial_list_form_public_label')}
                    </label>
                </div>

                {/* Öğe Ekleme Alanı */}
                <fieldset className="space-y-3 pt-4 border-t border-gray-700">
                    <legend className="text-base font-medium text-gray-200">{t('admin_editorial_list_form_add_items_legend')}</legend>
                    <div ref={searchContainerRef} className="relative">
                        <div className="relative">
                            <label htmlFor="editorialItemSearch" className="sr-only">{t('admin_editorial_list_form_search_placeholder')}</label>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <FaSearch className="h-5 w-5 text-gray-400" /> </div>
                            <input type="search" id="editorialItemSearch"
                                placeholder={t('admin_editorial_list_form_search_placeholder')}
                                value={searchTerm} onChange={handleSearchChange} onFocus={() => fetchSuggestions(searchTerm)} disabled={isSubmitting}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent sm:text-sm bg-gray-700 text-gray-100 placeholder-gray-400 disabled:opacity-60"
                            />
                        </div>
                        {/* Öneri Listesi */}
                        {showSuggestions && (
                            <div className="absolute left-0 right-0 mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg z-30 max-h-60 overflow-y-auto">
                                {suggestionsLoading && <div className="px-4 py-3 text-center text-gray-400 text-sm italic">{t('admin_editorial_list_form_suggestions_loading')}</div>}
                                {!suggestionsLoading && suggestions.length === 0 && searchTerm.length >= 2 && <div className="px-4 py-3 text-center text-gray-400 text-sm">{t('admin_editorial_list_form_suggestions_no_results', { term: searchTerm })}</div>}
                                {!suggestionsLoading && suggestions.length > 0 && (
                                    <ul className="divide-y divide-gray-600">
                                        {suggestions.map(item => (
                                            <li key={`${item.type}-${item.id}`}>
                                                <button type="button" onClick={() => handleAddItem(item)} className="flex items-center w-full text-left px-4 py-2.5 hover:bg-gray-600 transition-colors text-sm">
                                                    <img src={item.poster_path ? `${SUGGESTION_POSTER_BASE_URL}${item.poster_path}` : PLACEHOLDER_SUGGESTION_POSTER} alt="" className="w-8 h-12 mr-3 object-cover rounded-sm flex-shrink-0 bg-gray-600"/>
                                                    <span className={`flex-shrink-0 mr-2 text-xs font-medium px-1.5 py-0.5 rounded ${item.type === 'movie' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
                                                        {item.type === 'movie' ? t('type_movie') : t('type_tv')}
                                                    </span>
                                                    <span className="flex-grow font-medium text-gray-100 truncate">{item.title}</span>
                                                    {item.year && <span className="ml-2 text-gray-400 text-xs flex-shrink-0">({item.year})</span>}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </fieldset>

                {/* Seçilen Öğeler */}
                {items.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-gray-700">
                        <h4 className="text-sm font-medium text-gray-300">{t('admin_editorial_list_form_selected_items_title', { count: items.length })}</h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                            {items.map((item) => (
                                <li key={`${item.type}-${item.id}`} className="flex items-center bg-gray-700/70 p-1.5 rounded-md border border-gray-600/80 text-xs">
                                    <img src={item.poster_path ? `${SUGGESTION_POSTER_BASE_URL}${item.poster_path}` : PLACEHOLDER_SUGGESTION_POSTER} alt="" className="w-6 h-9 mr-2 object-cover rounded-sm flex-shrink-0 bg-gray-600"/>
                                    <div className="flex-grow overflow-hidden mr-1.5">
                                        <p className="text-gray-100 font-medium truncate" title={item.title}>{item.title}</p>
                                        <p className="text-gray-400">{item.year || t('admin_editorial_list_form_date_unknown')}</p>
                                    </div>
                                    <button type="button" onClick={() => handleRemoveItem(item)} disabled={isSubmitting} className="ml-auto flex-shrink-0 p-1 text-gray-400 hover:text-red-400 rounded-full hover:bg-red-900/30 disabled:opacity-50 transition-colors" title={t('admin_editorial_list_form_remove_item_title')}>
                                        <FaTimes className="w-3 h-3" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Mesaj Alanı */}
                {message && (
                    <p className={`text-sm text-center font-medium py-2 px-3 rounded-md ${isSuccess ? 'text-green-100 bg-green-600/80' : 'text-red-100 bg-red-600/80'}`}>
                        {isSuccess ? <FaCheckCircle className="inline w-4 h-4 mr-1 mb-px" /> : <FaTimesCircle className="inline w-4 h-4 mr-1 mb-px" />}
                        {message}
                    </p>
                )}

                {/* Butonlar */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="px-4 py-2 border border-gray-500 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 disabled:opacity-60"
                    >
                        {t('admin_editorial_list_form_cancel_button')}
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !listName.trim()}
                        className="inline-flex items-center justify-center px-5 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <FaSpinner className="animate-spin -ml-1 mr-2 h-5 w-5" /> : <FaPlus className="-ml-1 mr-2 h-5 w-5" />}
                        {t('admin_editorial_list_form_submit_button_create')}
                    </button>
                </div>
            </form>
        </div>
    );
}