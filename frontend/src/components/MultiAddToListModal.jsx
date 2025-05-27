import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

function MultiAddToListModal({ isOpen, onClose, listId, onItemsAdded }) {
    const { t } = useTranslation();
    const { token } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [addMessage, setAddMessage] = useState('');

    if (!isOpen) return null;

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;
        setSearchLoading(true); setSearchError(''); setSearchResults([]);
        try {
            const [movieRes, tvRes] = await Promise.all([
                axios.get('/api/movies/search', { params: { query: searchTerm } }),
                axios.get('/api/tv/search', { params: { query: searchTerm } })
            ]);
            const movies = (movieRes.data.results || []).map(m => ({ ...m, type: 'movie' }));
            const tvs = (tvRes.data.results || []).map(t => ({ ...t, type: 'tv' }));
            setSearchResults([...movies, ...tvs]);
        } catch (err) {
            setSearchError(t('add_to_list_modal_error'));
        } finally {
            setSearchLoading(false);
        }
    };

    const toggleSelect = (item) => {
        setSelectedItems(prev => {
            const exists = prev.find(i => i.id === item.id && i.type === item.type);
            if (exists) return prev.filter(i => !(i.id === item.id && i.type === item.type));
            return [...prev, { id: item.id, type: item.type }];
        });
    };

    const handleAdd = async () => {
        if (!selectedItems.length || !listId) return;
        setIsAdding(true); setAddMessage('');
        try {
            for (const item of selectedItems) {
                await axios.post(`/api/lists/${listId}/items`, { contentId: item.id, contentType: item.type }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setAddMessage(t('add_to_list_modal_success'));
            if (onItemsAdded) onItemsAdded();
            setTimeout(onClose, 1200);
        } catch (err) {
            setAddMessage(t('add_to_list_modal_fail', { message: err.response?.data?.message || 'Bir hata oluştu.' }));
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Kapat">✕</button>
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">{t('add_to_list_modal_title')}</h3>
                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="flex-1 rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder={t('create_list_search_placeholder')}
                        disabled={searchLoading}
                    />
                    <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded text-sm" disabled={searchLoading}>
                        {t('search_results_page_title')}
                    </button>
                </form>
                {searchLoading && <p className="text-gray-500 dark:text-gray-400">{t('suggestions_loading')}</p>}
                {searchError && <p className="text-red-500">{searchError}</p>}
                <div className="max-h-60 overflow-y-auto mb-4">
                    {searchResults.map(item => (
                        <div key={item.type + '-' + item.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-cyan-50 dark:hover:bg-cyan-900/30 ${selectedItems.find(i => i.id === item.id && i.type === item.type) ? 'bg-cyan-100 dark:bg-cyan-800/50' : ''}`}
                             onClick={() => toggleSelect(item)}>
                            <img src={item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : 'https://placehold.co/92x138?text=N/A'} alt="" className="w-10 h-15 object-cover rounded" />
                            <div className="flex-1">
                                <div className="font-medium text-sm text-gray-800 dark:text-gray-100">{item.title || item.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{item.type === 'movie' ? t('type_movie') : t('type_tv')} • {(item.release_date || item.first_air_date || '').slice(0,4)}</div>
                            </div>
                            <input type="checkbox" checked={!!selectedItems.find(i => i.id === item.id && i.type === item.type)} readOnly className="accent-cyan-600" />
                        </div>
                    ))}
                </div>
                <button
                    onClick={handleAdd}
                    disabled={isAdding || !selectedItems.length}
                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isAdding ? t('add_to_list_modal_adding') : t('add_to_list_modal_add_button')}
                </button>
                {addMessage && <p className={`mt-3 text-sm text-center ${addMessage.includes('başarısız') || addMessage.includes('eklenemedi') || addMessage.includes('mevcut') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{addMessage}</p>}
            </div>
        </div>
    );
}

export default MultiAddToListModal; 