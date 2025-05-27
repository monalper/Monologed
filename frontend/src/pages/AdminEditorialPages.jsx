// src/pages/AdminEditorialPages.jsx
// Bu dosya, hem ana yönetim sayfası hem de sayfa oluşturma/düzenleme formu bileşenlerini içerir.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
    FaPlus, FaTimes, FaSearch, FaFilm, FaTv, FaSpinner, FaCheckCircle,
    FaTimesCircle, FaEdit, FaTrashAlt, FaEye, FaEyeSlash, FaLink, FaUnlink, FaSave
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

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

// Editöryel Sayfa Oluşturma/Düzenleme Formu Bileşeni
function EditorialPageForm({ onFormSubmitSuccess, onCancel, initialData = null }) {
    const { t } = useTranslation();
    const { token } = useAuth();

    const [pageId, setPageId] = useState(initialData?.pageId || null);
    const [pageTitle, setPageTitle] = useState(initialData?.pageTitle || '');
    const [pageSlug, setPageSlug] = useState(initialData?.pageSlug || '');
    const [customBody, setCustomBody] = useState(initialData?.customBody || '');
    const [contentType, setContentType] = useState(initialData?.contentType || '');
    const [contentId, setContentId] = useState(initialData?.contentId || '');
    const [tmdbTitle, setTmdbTitle] = useState(initialData?.tmdbTitle || '');
    const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl || '');
    const [isPublished, setIsPublished] = useState(initialData?.isPublished || false);

    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchContainerRef = useRef(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const [items, setItems] = useState(initialData?.items || []);

    const isEditing = !!pageId;

    // Slug otomatik oluşturma (başlıktan)
    const generateSlug = (title) => {
        return title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Alfanümerik olmayanları kaldır (tire hariç)
            .replace(/\s+/g, '-')    // Boşlukları tire ile değiştir
            .replace(/-+/g, '-');     // Birden fazla tireyi tek tire yap
    };

    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        setPageTitle(newTitle);
        if (!pageSlug || !isEditing) { // Sadece yeni oluşturuluyorsa veya slug boşsa otomatik güncelle
            setPageSlug(generateSlug(newTitle));
        }
    };
    
    const fetchSuggestions = useCallback(async (term) => {
        if (!term || term.trim().length < 2) {
            setSuggestions([]); setShowSuggestions(false); setSuggestionsLoading(false); return;
        }
        setSuggestionsLoading(true); setShowSuggestions(true);
        try {
            const response = await axios.get('/api/suggestions', {
                params: { query: term },
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const suggestionsWithData = (response.data || []).map(item => ({
                ...item,
                poster_path: item.poster_path || null
            }));
            setSuggestions(suggestionsWithData);
        } catch (error) {
            console.error("Editöryel sayfa için içerik öneri arama hatası:", error);
            setSuggestions([]);
            setMessage(t('editorial_page_form_error_suggestions'));
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

    const handleSelectContent = (item) => {
        setContentType(item.type);
        setContentId(String(item.id)); // ID'yi string olarak sakla, backend Number'a çevirecek
        setTmdbTitle(item.title);
        setSearchTerm(''); setSuggestions([]); setShowSuggestions(false);
    };

    const handleRemoveSelectedContent = () => {
        setContentType(''); setContentId(''); setTmdbTitle('');
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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage(''); setIsSuccess(false);
        if (!pageTitle.trim() || !pageSlug.trim() || !customBody.trim()) {
            setMessage(t('editorial_page_form_error_required_fields'));
            return;
        }
        if (!token) {
            setMessage(t('editorial_page_form_error_auth'));
            return;
        }
        setIsSubmitting(true);
        const pageData = {
            pageTitle: pageTitle.trim(),
            pageSlug: pageSlug.trim(),
            customBody: customBody.trim(),
            contentType: contentType || null,
            contentId: contentId || null,
            tmdbTitle: tmdbTitle || null,
            coverImageUrl: coverImageUrl.trim() || null,
            isPublished: isPublished,
            items: items
        };

        try {
            let response;
            if (isEditing) {
                response = await axios.put(`/api/admin/editorial-pages/${pageId}`, pageData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessage(t('editorial_page_form_success_update'));
            } else {
                response = await axios.post('/api/admin/editorial-pages', pageData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessage(t('editorial_page_form_success_create'));
            }
            setIsSuccess(true);
            if (onFormSubmitSuccess) {
                onFormSubmitSuccess(response.data.page);
            }
            // Formu sıfırlama (düzenleme değilse)
            if(!isEditing) {
                 setPageTitle(''); setPageSlug(''); setCustomBody(''); setContentType('');
                 setContentId(''); setTmdbTitle(''); setCoverImageUrl(''); setIsPublished(false);
                 setItems([]);
            }
            setTimeout(() => { setMessage(''); setIsSuccess(false); if(onCancel && !isEditing) onCancel(); }, 2000);
        } catch (error) {
            console.error(`Editöryel sayfa ${isEditing ? 'güncelleme' : 'oluşturma'} hatası:`, error.response?.data || error.message);
            setMessage(error.response?.data?.message || t('editorial_page_form_error_generic'));
            setIsSuccess(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700 my-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-6">
                {isEditing ? t('editorial_page_form_title_edit') : t('editorial_page_form_title_create')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Sayfa Başlığı */}
                <div>
                    <label htmlFor="pageTitle" className="block text-sm font-medium text-gray-300 mb-1">{t('editorial_page_form_title_label')} <span className="text-red-400">*</span></label>
                    <input type="text" id="pageTitle" value={pageTitle} onChange={handleTitleChange} required disabled={isSubmitting}
                        className="form-input" placeholder={t('editorial_page_form_title_placeholder')} />
                </div>
                {/* Sayfa Slug (URL Yolu) */}
                <div>
                    <label htmlFor="pageSlug" className="block text-sm font-medium text-gray-300 mb-1">{t('editorial_page_form_slug_label')} <span className="text-red-400">*</span></label>
                    <input type="text" id="pageSlug" value={pageSlug} onChange={(e) => setPageSlug(e.target.value)} required disabled={isSubmitting}
                        className="form-input" placeholder={t('editorial_page_form_slug_placeholder')} />
                    <p className="text-xs text-gray-400 mt-1">{t('editorial_page_form_slug_hint')}</p>
                </div>
                {/* Kapak Resmi URL'si */}
                <div>
                    <label htmlFor="coverImageUrl" className="block text-sm font-medium text-gray-300 mb-1">{t('editorial_page_form_cover_label')}</label>
                    <input type="url" id="coverImageUrl" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} disabled={isSubmitting}
                        className="form-input" placeholder={t('editorial_page_form_cover_placeholder')} />
                </div>
                {/* Özel İçerik (Markdown/HTML) */}
                <div>
                    <label htmlFor="customBody" className="block text-sm font-medium text-gray-300 mb-1">{t('editorial_page_form_body_label')} <span className="text-red-400">*</span></label>
                    <textarea id="customBody" rows="10" value={customBody} onChange={(e) => setCustomBody(e.target.value)} required disabled={isSubmitting}
                        className="form-input h-64" placeholder={t('editorial_page_form_body_placeholder')} />
                    <p className="text-xs text-gray-400 mt-1">{t('editorial_page_form_body_hint')}</p>
                </div>

                {/* Bağlantılı İçerik (Opsiyonel) */}
                <fieldset className="space-y-3 pt-3 border-t border-gray-700/60">
                    <legend className="text-base font-medium text-gray-200">{t('editorial_page_form_add_items_legend')}</legend>
                    <div ref={searchContainerRef} className="relative">
                        <div className="relative">
                            <label htmlFor="editorialItemSearch" className="sr-only">{t('editorial_page_form_search_placeholder')}</label>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <FaSearch className="h-5 w-5 text-gray-400" /> </div>
                            <input type="search" id="editorialItemSearch"
                                placeholder={t('editorial_page_form_search_placeholder')}
                                value={searchTerm} onChange={handleSearchChange} onFocus={() => fetchSuggestions(searchTerm)} disabled={isSubmitting}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent sm:text-sm bg-gray-700 text-gray-100 placeholder-gray-400 disabled:opacity-60"
                            />
                        </div>
                        {showSuggestions && (
                            <div className="absolute left-0 right-0 mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg z-30 max-h-60 overflow-y-auto">
                                {suggestionsLoading && <div className="px-4 py-3 text-center text-gray-400 text-sm italic">{t('editorial_page_form_suggestions_loading')}</div>}
                                {!suggestionsLoading && suggestions.length === 0 && searchTerm.length >= 2 && <div className="px-4 py-3 text-center text-gray-400 text-sm">{t('editorial_page_form_suggestions_no_results', { term: searchTerm })}</div>}
                                {!suggestionsLoading && suggestions.length > 0 && (
                                    <ul className="divide-y divide-gray-600">
                                        {suggestions.map(item => (
                                            <li key={`${item.type}-${item.id}`}>
                                                <button type="button" onClick={() => handleAddItem(item)} className="flex items-center w-full text-left px-4 py-2.5 hover:bg-gray-600 transition-colors text-sm">
                                                    <img src={item.poster_path ? `${SUGGESTION_POSTER_BASE_URL}${item.poster_path}` : PLACEHOLDER_SUGGESTION_POSTER} alt="" className="w-8 h-12 mr-3 object-cover rounded-sm flex-shrink-0 bg-gray-600"/>
                                                    <span className={`flex-shrink-0 mr-2 text-xs font-medium px-1.5 py-0.5 rounded ${item.type === 'movie' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>{item.type === 'movie' ? t('type_movie') : t('type_tv')}</span>
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
                    {items.length > 0 && (
                        <div className="pt-3">
                            <h4 className="text-sm font-medium text-gray-300 mb-2">{t('editorial_page_form_selected_items_title', { count: items.length })}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[480px] overflow-y-auto pr-1">
                                {items.map((item, idx) => (
                                    <div key={`${item.type}-${item.id}`} className="relative flex flex-col bg-gray-700/80 rounded-lg shadow p-3 border border-gray-600/60">
                                        <span className="absolute -top-2 -left-2 bg-cyan-600 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow">{idx + 1}</span>
                                        <img src={item.poster_path ? `${SUGGESTION_POSTER_BASE_URL}${item.poster_path}` : PLACEHOLDER_SUGGESTION_POSTER} alt="" className="w-20 h-28 mx-auto object-cover rounded-md bg-gray-600 mb-2"/>
                                        <div className="flex flex-col items-center text-center flex-1">
                                            <p className="text-gray-100 font-semibold truncate w-full" title={item.title}>{item.title}</p>
                                            <p className="text-gray-400 text-xs">{item.year || t('editorial_page_form_date_unknown')}</p>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveItem(item)} disabled={isSubmitting} className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-400 rounded-full hover:bg-red-900/30 disabled:opacity-50 transition-colors" title={t('editorial_page_form_remove_item_title')}>
                                            <FaTimes className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </fieldset>

                {/* Yayınlama Durumu */}
                <div className="flex items-center pt-3 border-t border-gray-700/60">
                    <input id="isPublished" type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} disabled={isSubmitting}
                        className="h-4 w-4 text-cyan-600 border-gray-500 rounded focus:ring-cyan-500 bg-gray-600 focus:ring-offset-gray-800" />
                    <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-300">{t('editorial_page_form_publish_label')}</label>
                </div>

                {/* Mesaj Alanı */}
                {message && (
                    <p className={`text-sm text-center font-medium py-2 px-3 rounded-md ${isSuccess ? 'text-green-100 bg-green-600/80' : 'text-red-100 bg-red-600/80'}`}>
                        {isSuccess ? <FaCheckCircle className="inline w-4 h-4 mr-1 mb-px" /> : <FaTimesCircle className="inline w-4 h-4 mr-1 mb-px" />}
                        {message}
                    </p>
                )}

                {/* Butonlar */}
                <div className="flex items-center justify-end space-x-3 pt-2">
                    <button type="button" onClick={onCancel} disabled={isSubmitting}
                        className="px-4 py-2 border border-gray-500 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 disabled:opacity-60">
                        {t('editorial_page_form_cancel_button')}
                    </button>
                    <button type="submit" disabled={isSubmitting || !pageTitle.trim() || !pageSlug.trim() || !customBody.trim()}
                        className="inline-flex items-center justify-center px-5 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed">
                        {isSubmitting ? <FaSpinner className="animate-spin -ml-1 mr-2 h-5 w-5" /> : (isEditing ? <FaSave className="-ml-1 mr-2 h-5 w-5" /> : <FaPlus className="-ml-1 mr-2 h-5 w-5" />)}
                        {isEditing ? t('editorial_page_form_submit_button_update') : t('editorial_page_form_submit_button_create')}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Ana Admin Editöryel Sayfa Yönetim Bileşeni
function AdminEditorialPages() {
    const { t, i18n } = useTranslation();
    const { token } = useAuth();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editorialPages, setEditorialPages] = useState([]);
    const [loadingPages, setLoadingPages] = useState(true);
    const [errorPages, setErrorPages] = useState(null);
    const [editingPage, setEditingPage] = useState(null); // Düzenlenecek sayfa verisi
    const navigate = useNavigate();

    const fetchAdminEditorialPages = useCallback(async () => {
        if (!token) {
            setErrorPages(t('editorial_page_admin_error_auth'));
            setLoadingPages(false);
            return;
        }
        setLoadingPages(true); setErrorPages(null);
        try {
            const response = await axios.get('/api/admin/editorial-pages', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditorialPages(response.data.pages || []);
        } catch (error) {
            console.error("Admin editöryel sayfaları çekme hatası:", error.response?.data || error.message);
            setErrorPages(error.response?.data?.message || t('editorial_page_admin_error_fetch_pages'));
        } finally {
            setLoadingPages(false);
        }
    }, [token, t]);

    useEffect(() => {
        fetchAdminEditorialPages();
    }, [fetchAdminEditorialPages]);

    const handlePageActionSuccess = (updatedPage) => {
        fetchAdminEditorialPages(); // Listeyi yeniden çek
        setShowCreateForm(false);
        setEditingPage(null);
    };

    const handleDeletePage = async (pageId) => {
        if (!pageId || !window.confirm(t('editorial_page_admin_confirm_delete'))) return;
        const originalPages = [...editorialPages];
        setEditorialPages(prev => prev.filter(p => p.pageId !== pageId));
        try {
            await axios.delete(`/api/admin/editorial-pages/${pageId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Editöryel sayfa silme hatası:", error.response?.data || error.message);
            setErrorPages(error.response?.data?.message || t('editorial_page_admin_error_delete'));
            setEditorialPages(originalPages);
            setTimeout(() => setErrorPages(null), 3000);
        }
    };
    
    const handleEditPage = (page) => {
        setEditingPage(page);
        setShowCreateForm(true);
    };

    const handleCancelForm = () => {
        setShowCreateForm(false);
        setEditingPage(null);
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-gray-700 pb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-100 flex items-center">
                    <FaEdit className="mr-3 text-cyan-400" />
                    {t('editorial_page_admin_title')}
                </h1>
                <button
                    onClick={() => navigate('/admin/editorial-toplist')}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white transition-colors ${
                        showCreateForm ? 'bg-red-600 hover:bg-red-700' : 'bg-cyan-600 hover:bg-cyan-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500`}
                >
                    {showCreateForm ? (
                        <><FaTimes className="mr-2 h-4 w-4" /> {t('editorial_page_admin_cancel_create_button')}</>
                    ) : (
                        <><FaPlus className="mr-2 h-4 w-4" /> {t('editorial_page_admin_create_button')}</>
                    )}
                </button>
            </div>

            {showCreateForm && (
                <EditorialPageForm
                    onFormSubmitSuccess={handlePageActionSuccess}
                    onCancel={handleCancelForm}
                    initialData={editingPage}
                />
            )}

            <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-200 mb-4">{t('editorial_page_admin_existing_pages_title')}</h2>
                {loadingPages && <div className="text-center py-4"><FaSpinner className="animate-spin text-2xl text-gray-400 inline-block" /></div>}
                {errorPages && <div className="text-center py-4 text-red-400">{errorPages}</div>}
                {!loadingPages && !errorPages && editorialPages.length === 0 && (
                    <p className="text-gray-400 italic text-center py-6 border border-dashed border-gray-700 rounded-md">{t('editorial_page_admin_no_pages_yet')}</p>
                )}
                {!loadingPages && !errorPages && editorialPages.length > 0 && (
                    <div className="overflow-x-auto shadow-md rounded-lg border border-gray-700">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('editorial_page_admin_table_title')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('editorial_page_admin_table_slug')}</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">{t('editorial_page_admin_table_published')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('editorial_page_admin_table_linked_content')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('editorial_page_admin_table_updated_at')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">{t('editorial_page_admin_table_actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800/50 divide-y divide-gray-700">
                                {editorialPages.map(page => (
                                    <tr key={page.pageId} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-100 truncate" title={page.pageTitle}>{page.pageTitle}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 truncate">/editorial/{page.pageSlug}</td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            {page.isPublished ? (
                                                <FaEye className="w-4 h-4 text-green-400 mx-auto" title={t('editorial_page_admin_status_published')}/>
                                            ) : (
                                                <FaEyeSlash className="w-4 h-4 text-red-400 mx-auto" title={t('editorial_page_admin_status_draft')}/>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 truncate">
                                            {page.tmdbTitle ? `${page.contentType === 'movie' ? t('type_movie') : t('type_tv')}: ${page.tmdbTitle}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                                            {new Date(page.updatedAt).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <button onClick={() => handleEditPage(page)} className="text-cyan-400 hover:text-cyan-300 p-1 rounded hover:bg-cyan-900/30" title={t('editorial_page_admin_action_edit')}>
                                                <FaEdit className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => handleDeletePage(page.pageId)} className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-900/30" title={t('editorial_page_admin_action_delete')}>
                                                <FaTrashAlt className="w-4 h-4"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminEditorialPages; // Ana sayfayı export et
