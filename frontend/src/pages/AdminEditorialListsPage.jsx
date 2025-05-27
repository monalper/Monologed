import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next'; // <<< DÜZELTME: useTranslation import edildi >>>
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
    const { t } = useTranslation(); // Bu bileşen zaten doğru import'a sahip
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
            items: items.map(item => ({ id: item.id, type: item.type })),
            isEditorialRoute: true
        };
        try {
            const response = await axios.post('/api/admin/lists', listData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsSuccess(true);
            setMessage(t('admin_editorial_list_form_success_create'));
            setListName(''); setDescription(''); setCoverImageUrl(''); setIsPublic(true); setItems([]);
            if (onFormSubmitSuccess) {
                onFormSubmitSuccess(response.data.list);
            }
            setTimeout(() => { setMessage(''); setIsSuccess(false); if(onCancel) onCancel(); }, 2000);
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
                        className="block w-full px-4 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent sm:text-sm bg-gray-700 text-gray-100 placeholder-gray-400 disabled:opacity-60"
                        placeholder={t('admin_editorial_list_form_name_placeholder')}
                    />
                </div>
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
                        className="block w-full px-4 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent sm:text-sm bg-gray-700 text-gray-100 placeholder-gray-400 disabled:opacity-60"
                        placeholder={t('admin_editorial_list_form_desc_placeholder')}
                    ></textarea>
                </div>
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
                        className="block w-full px-4 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent sm:text-sm bg-gray-700 text-gray-100 placeholder-gray-400 disabled:opacity-60"
                        placeholder={t('admin_editorial_list_form_cover_placeholder')}
                    />
                </div>
                <div className="flex items-center">
                    <input
                        id="editorialListIsPublic"
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        disabled={isSubmitting}
                        className="h-4 w-4 text-yellow-600 border-gray-500 rounded focus:ring-yellow-500 bg-gray-600 focus:ring-offset-gray-800"
                    />
                    <label htmlFor="editorialListIsPublic" className="ml-2 block text-sm text-gray-300">
                        {t('admin_editorial_list_form_public_label')}
                    </label>
                </div>
                <fieldset className="space-y-3 pt-4 border-t border-gray-700">
                    <legend className="text-base font-medium text-gray-200">{t('admin_editorial_list_form_add_items_legend')}</legend>
                    <div ref={searchContainerRef} className="relative">
                        <div className="relative">
                            <label htmlFor="editorialItemSearch" className="sr-only">{t('admin_editorial_list_form_search_placeholder')}</label>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <FaSearch className="h-5 w-5 text-gray-400" /> </div>
                            <input type="search" id="editorialItemSearch"
                                placeholder={t('admin_editorial_list_form_search_placeholder')}
                                value={searchTerm} onChange={handleSearchChange} onFocus={() => fetchSuggestions(searchTerm)} disabled={isSubmitting}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent sm:text-sm bg-gray-700 text-gray-100 placeholder-gray-400 disabled:opacity-60"
                            />
                        </div>
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
                {items.length > 0 && (
                    <div className="pt-3 border-t border-gray-700">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">{t('admin_editorial_list_form_selected_items_title', { count: items.length })}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[480px] overflow-y-auto pr-1">
                            {items.map((item, idx) => (
                                <div key={`${item.type}-${item.id}`} className="relative flex flex-col bg-gray-700/80 rounded-lg shadow p-3 border border-gray-600/60">
                                    <span className="absolute -top-2 -left-2 bg-yellow-600 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow">{idx + 1}</span>
                                    <img src={item.poster_path ? `${SUGGESTION_POSTER_BASE_URL}${item.poster_path}` : PLACEHOLDER_SUGGESTION_POSTER} alt="" className="w-20 h-28 mx-auto object-cover rounded-md bg-gray-600 mb-2"/>
                                    <div className="flex flex-col items-center text-center flex-1">
                                        <p className="text-gray-100 font-semibold truncate w-full" title={item.title}>{item.title}</p>
                                        <p className="text-gray-400 text-xs">{item.year || t('admin_editorial_list_form_date_unknown')}</p>
                                    </div>
                                    <button type="button" onClick={() => handleRemoveItem(item)} disabled={isSubmitting} className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-400 rounded-full hover:bg-red-900/30 disabled:opacity-50 transition-colors" title={t('admin_editorial_list_form_remove_item_title')}>
                                        <FaTimes className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {message && (
                    <p className={`text-sm text-center font-medium py-2 px-3 rounded-md ${isSuccess ? 'text-green-100 bg-green-600/80' : 'text-red-100 bg-red-600/80'}`}>
                        {isSuccess ? <FaCheckCircle className="inline w-4 h-4 mr-1 mb-px" /> : <FaTimesCircle className="inline w-4 h-4 mr-1 mb-px" />}
                        {message}
                    </p>
                )}
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
                        className="inline-flex items-center justify-center px-5 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-yellow-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <FaSpinner className="animate-spin -ml-1 mr-2 h-5 w-5 text-yellow-500" /> : <FaPlus className="-ml-1 mr-2 h-5 w-5" />}
                        {t('admin_editorial_list_form_submit_button_create')}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Ana Admin Editöryel Liste Yönetim Sayfası
function AdminEditorialListsPage() {
    const { t, i18n } = useTranslation(); // <<< DÜZELTME: i18n eklendi >>>
    const { token } = useAuth();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editorialLists, setEditorialLists] = useState([]);
    const [loadingLists, setLoadingLists] = useState(true);
    const [errorLists, setErrorLists] = useState(null);
    const [editingList, setEditingList] = useState(null);

    const fetchAdminEditorialLists = useCallback(async () => {
        if (!token) {
            setErrorLists(t('admin_editorial_list_page_error_auth'));
            setLoadingLists(false);
            return;
        }
        setLoadingLists(true); setErrorLists(null);
        try {
            const response = await axios.get('/api/admin/lists', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditorialLists(response.data.lists || []);
        } catch (error) {
            console.error("Admin editöryel listeleri çekme hatası:", error.response?.data || error.message);
            setErrorLists(error.response?.data?.message || t('admin_editorial_list_page_error_fetch_lists'));
        } finally {
            setLoadingLists(false);
        }
    }, [token, t]);

    useEffect(() => {
        fetchAdminEditorialLists();
    }, [fetchAdminEditorialLists]);

    const handleListActionSuccess = (updatedList) => {
        fetchAdminEditorialLists();
        setShowCreateForm(false);
        setEditingList(null);
    };

    const handleDeleteList = async (listId) => {
        if (!listId || !window.confirm(t('admin_editorial_list_page_confirm_delete'))) return;
        const originalLists = [...editorialLists];
        setEditorialLists(prev => prev.filter(l => l.listId !== listId));
        try {
            await axios.delete(`/api/admin/lists/${listId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Editöryel liste silme hatası:", error.response?.data || error.message);
            setErrorLists(error.response?.data?.message || t('admin_editorial_list_page_error_delete'));
            setEditorialLists(originalLists);
            setTimeout(() => setErrorLists(null), 3000);
        }
    };
    
    const handleEditList = (list) => {
        alert(`Düzenleme modu henüz aktif değil. Liste: ${list.listName}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-gray-700 pb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-100 flex items-center">
                    <FaListAlt className="mr-3 text-yellow-400" />
                    {t('admin_editorial_list_page_title')}
                </h1>
                <button
                    onClick={() => { setShowCreateForm(prev => !prev); setEditingList(null); }}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white transition-colors ${
                        showCreateForm ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-yellow-500`}
                >
                    {showCreateForm ? (
                        <><FaTimes className="mr-2 h-4 w-4" /> {t('admin_editorial_list_page_cancel_create_button')}</>
                    ) : (
                        <><FaPlus className="mr-2 h-4 w-4" /> {t('admin_editorial_list_page_create_button')}</>
                    )}
                </button>
            </div>
            {showCreateForm && (
                <CreateEditorialListForm
                    onFormSubmitSuccess={handleListActionSuccess}
                    onCancel={() => { setShowCreateForm(false); setEditingList(null); }}
                />
            )}
            <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-200 mb-4">{t('admin_editorial_list_page_existing_lists_title')}</h2>
                {loadingLists && <div className="text-center py-4"><FaSpinner className="animate-spin text-2xl text-yellow-500 inline-block" /></div>}
                {errorLists && <div className="text-center py-4 text-red-400">{errorLists}</div>}
                {!loadingLists && !errorLists && editorialLists.length === 0 && (
                    <p className="text-gray-400 italic text-center py-6 border border-dashed border-gray-700 rounded-md">{t('admin_editorial_list_page_no_lists_yet')}</p>
                )}
                {!loadingLists && !errorLists && editorialLists.length > 0 && (
                    <div className="overflow-x-auto shadow-md rounded-lg border border-gray-700">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-800">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('admin_editorial_list_table_name')}</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('admin_editorial_list_table_items')}</th>
                                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">{t('admin_editorial_list_table_public')}</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('admin_editorial_list_table_created_at')}</th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">{t('admin_editorial_list_table_actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800/50 divide-y divide-gray-700">
                                {editorialLists.map(list => (
                                    <tr key={list.listId} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {list.coverImageUrl ? (
                                                    <img src={list.coverImageUrl} alt="" className="w-8 h-8 rounded-sm object-cover mr-3 flex-shrink-0" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-sm bg-gray-700 flex items-center justify-center text-gray-500 mr-3 flex-shrink-0">
                                                        <FaImage className="w-4 h-4"/>
                                                    </div>
                                                )}
                                                <span className="text-sm font-medium text-gray-100 truncate" title={list.listName}>{list.listName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{list.itemCount || 0}</td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            {list.isPublic ? (
                                                <FaEye className="w-4 h-4 text-green-400 mx-auto" title={t('admin_editorial_list_status_public')}/>
                                            ) : (
                                                <FaEyeSlash className="w-4 h-4 text-red-400 mx-auto" title={t('admin_editorial_list_status_private')}/>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                                            {new Date(list.createdAt).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <button onClick={() => handleEditList(list)} className="text-yellow-400 hover:text-yellow-300 p-1 rounded hover:bg-yellow-900/30" title={t('admin_editorial_list_action_edit')}>
                                                <FaEdit className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => handleDeleteList(list.listId)} className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-900/30" title={t('admin_editorial_list_action_delete')}>
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

export default AdminEditorialListsPage;