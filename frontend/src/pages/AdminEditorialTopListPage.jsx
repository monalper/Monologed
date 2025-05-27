import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaSearch, FaArrowUp, FaArrowDown, FaTrash, FaSave, FaSpinner, FaTimes } from 'react-icons/fa';
import { FaCheckCircle } from 'react-icons/fa';
import TopCard from '../components/TopCard';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const SUGGESTION_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w92';
const PLACEHOLDER_SUGGESTION_POSTER = 'https://via.placeholder.com/92x138.png?text=N/A';

// Backend URL (geliştirme için)
const BACKEND_URL = "http://localhost:5000";
const getCoverUrl = (url) => {
  if (!url) return '';
  return url.startsWith('/uploads/') ? BACKEND_URL + url : url;
};

function AdminEditorialTopListPage() {
  // Form State
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Arama State
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);

  // Kapak görseli yükleme state
  const [coverUploadLoading, setCoverUploadLoading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState('');

  // Öneri Getirme
  const fetchSuggestions = useCallback(async (term) => {
    if (!term || term.trim().length < 2) {
      setSuggestions([]); setShowSuggestions(false); setSuggestionsLoading(false); return;
    }
    setSuggestionsLoading(true); setShowSuggestions(true);
    try {
      const response = await axios.get('/api/suggestions', { params: { query: term } });
      setSuggestions(response.data || []);
    } catch (error) {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // İçerik ekle
  const handleAddItem = async (itemToAdd) => {
    if (items.some(item => item.id === itemToAdd.id && item.type === itemToAdd.type)) {
      setSearchTerm(''); setSuggestions([]); setShowSuggestions(false);
      return;
    }
    // TMDB'den detayları çek
    let details = {};
    try {
      const url = itemToAdd.type === 'movie'
        ? `/api/movies/${itemToAdd.id}`
        : `/api/tv/${itemToAdd.id}`;
      const res = await axios.get(url);
      const data = res.data;
      details = {
        overview: data.overview || '',
        vote_average: data.vote_average || null,
        runtime: data.runtime || (data.episode_run_time && data.episode_run_time[0]) || null,
        director: ''
      };
      // Yönetmen (movie için credits.crew'dan, tv için aggregate_credits.crew'dan)
      if (itemToAdd.type === 'movie' && data.credits && data.credits.crew) {
        const directorObj = data.credits.crew.find(c => c.job === 'Director');
        if (directorObj) details.director = directorObj.name;
      }
      if (itemToAdd.type === 'tv' && data.aggregate_credits && data.aggregate_credits.crew) {
        const directorObj = data.aggregate_credits.crew.find(c => c.job === 'Director');
        if (directorObj) details.director = directorObj.name;
      }
    } catch (err) {
      // Hata olursa boş bırak
    }
    setItems(prev => [
      ...prev,
      {
        id: itemToAdd.id,
        type: itemToAdd.type,
        title: itemToAdd.title,
        year: itemToAdd.year,
        poster_path: itemToAdd.poster_path,
        ...details
      }
    ]);
    setSearchTerm(''); setSuggestions([]); setShowSuggestions(false);
  };

  // İçerik sil
  const handleRemoveItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Yukarı/aşağı taşıma fonksiyonu
  const moveItem = (idx, direction) => {
    if ((direction === -1 && idx === 0) || (direction === 1 && idx === items.length - 1)) return;
    const newItems = [...items];
    const temp = newItems[idx];
    newItems[idx] = newItems[idx + direction];
    newItems[idx + direction] = temp;
    setItems(newItems);
  };

  // Kapak görseli dosya yükleme fonksiyonu
  const handleCoverFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverUploadError('');
    setCoverUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/upload/cover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data && res.data.url) {
        setCoverImageUrl(res.data.url);
      } else {
        setCoverUploadError('Yükleme başarısız.');
      }
    } catch (err) {
      setCoverUploadError('Yükleme sırasında hata oluştu.');
    } finally {
      setCoverUploadLoading(false);
    }
  };

  // Sürükle-bırak işlemi için handler
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
  };

  // Kaydet
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setIsSuccess(false);
    if (!listName.trim() || items.length === 0) {
      setMessage('Başlık ve en az 1 içerik gerekli.');
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post('/api/admin/editorial-toplist', {
        listName: listName.trim(),
        description: description.trim(),
        coverImageUrl: coverImageUrl.trim() || null,
        items
      });
      setIsSuccess(true);
      const slug = listName.trim().toLowerCase().replace(/\s+/g, '-');
      setMessage(`Liste başarıyla kaydedildi! Görüntülemek için: /editorial/${slug}`);
      setListName(''); setDescription(''); setCoverImageUrl(''); setItems([]);
    } catch (err) {
      setMessage('Bir hata oluştu.');
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Editöryel Top List Oluştur</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Başlık *</label>
          <input 
            type="text" 
            value={listName} 
            onChange={e => setListName(e.target.value)} 
            required 
            disabled={isSubmitting}
            className="block w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 placeholder-gray-400" 
            placeholder="Örn: En İyi 1000 Film" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Açıklama</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            rows={3} 
            disabled={isSubmitting}
            className="block w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 placeholder-gray-400" 
            placeholder="Kısa açıklama..." 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Kapak Görseli (opsiyonel)</label>
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <input
              type="text"
              value={coverImageUrl}
              onChange={e => setCoverImageUrl(e.target.value)}
              disabled={isSubmitting || coverUploadLoading}
              className="block w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 placeholder-gray-400"
              placeholder="Kapak görseli URL"
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverFileChange}
              disabled={isSubmitting || coverUploadLoading}
              className="block text-sm text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-cyan-700 file:text-white hover:file:bg-cyan-800"
            />
          </div>
          {coverUploadLoading && <div className="text-xs text-cyan-400 mt-2 flex items-center"><FaSpinner className="animate-spin mr-2" />Yükleniyor...</div>}
          {coverUploadError && <div className="text-xs text-red-400 mt-2">{coverUploadError}</div>}
          {coverImageUrl && (
            <div className="mt-2"><img src={getCoverUrl(coverImageUrl)} alt="Kapak önizleme" className="max-h-40 rounded shadow" /></div>
          )}
        </div>
        <fieldset className="space-y-3 pt-3 border-t border-gray-700">
          <legend className="text-base font-medium text-gray-200">İçerik Ekle</legend>
          <div ref={searchContainerRef} className="relative">
            <div className="relative">
              <label htmlFor="editorialItemSearch" className="sr-only">Film/Dizi Ara</label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <FaSearch className="h-5 w-5 text-gray-400" /> </div>
              <input 
                type="search" 
                id="editorialItemSearch" 
                placeholder="Film veya dizi ara..."
                value={searchTerm} 
                onChange={e => { setSearchTerm(e.target.value); fetchSuggestions(e.target.value); }}
                disabled={isSubmitting}
                className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 placeholder-gray-400" 
              />
            </div>
            {showSuggestions && (
              <div className="absolute left-0 right-0 mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg z-30 max-h-60 overflow-y-auto">
                {suggestionsLoading && <div className="px-4 py-3 text-center text-gray-400 text-sm italic">Yükleniyor...</div>}
                {!suggestionsLoading && suggestions.length === 0 && searchTerm.length >= 2 && <div className="px-4 py-3 text-center text-gray-400 text-sm">Sonuç yok.</div>}
                {!suggestionsLoading && suggestions.length > 0 && (
                  <ul className="divide-y divide-gray-600">
                    {suggestions.map(item => (
                      <li key={`${item.type}-${item.id}`}>
                        <button 
                          type="button" 
                          onClick={() => handleAddItem(item)} 
                          className="flex items-center w-full text-left px-4 py-2.5 hover:bg-gray-600 transition-colors text-sm"
                        >
                          <img 
                            src={item.poster_path ? `${SUGGESTION_POSTER_BASE_URL}${item.poster_path}` : PLACEHOLDER_SUGGESTION_POSTER} 
                            alt="" 
                            className="w-8 h-12 mr-3 object-cover rounded-sm flex-shrink-0 bg-gray-600"
                          />
                          <span className={`flex-shrink-0 mr-2 text-xs font-medium px-1.5 py-0.5 rounded ${item.type === 'movie' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
                            {item.type === 'movie' ? 'Film' : 'Dizi'}
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
          {items.length > 0 && (
            <div className="pt-3">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Eklenen İçerikler ({items.length})</h4>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="droppable-items">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-8"
                    >
                      {items.map((item, idx) => {
                        let runtimeStr = '';
                        if (item.runtime && !isNaN(item.runtime)) {
                          const h = Math.floor(item.runtime / 60);
                          const m = item.runtime % 60;
                          runtimeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
                        }
                        return (
                          <Draggable
                            key={`${item.type}-${item.id}`}
                            draggableId={`${item.type}-${item.id}`}
                            index={idx}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`relative ${snapshot.isDragging ? 'opacity-50' : ''}`}
                              >
                                <TopCard
                                  index={idx + 1}
                                  poster={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/500x750.png?text=N/A'}
                                  title={item.title}
                                  year={item.year}
                                  overview={item.overview}
                                  runtime={runtimeStr}
                                  vote={item.vote_average}
                                  director={item.director}
                                  onMarkWatched={() => {}}
                                  onAddToList={() => {}}
                                  contentId={item.id}
                                  contentType={item.type}
                                />
                                <div className="absolute top-2 right-2 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => moveItem(idx, -1)}
                                    disabled={idx === 0}
                                    className="p-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Yukarı taşı"
                                  >
                                    <FaArrowUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveItem(idx, 1)}
                                    disabled={idx === items.length - 1}
                                    className="p-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Aşağı taşı"
                                  >
                                    <FaArrowDown className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(idx)}
                                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                                    title="İçeriği listeden kaldır"
                                  >
                                    <FaTrash className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        </fieldset>
        {message && (
          <p className={`text-sm text-center font-medium py-2 px-3 rounded-md ${isSuccess ? 'text-green-100 bg-green-600/80' : 'text-red-100 bg-red-600/80'}`}>
            {isSuccess ? <FaCheckCircle className="inline w-4 h-4 mr-1 mb-px" /> : <FaTimes className="inline w-4 h-4 mr-1 mb-px" />}
            {message}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <FaSave className="-ml-1 mr-2 h-4 w-4" />
                Kaydet
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminEditorialTopListPage; 