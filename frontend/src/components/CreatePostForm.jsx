// src/components/CreatePostForm.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
// <<< YENİ: FaImage ve FaTimesCircle ikonları eklendi >>>
import { FaSearch, FaTimes, FaFilm, FaTv, FaSpinner, FaCheckCircle, FaTimesCircle, FaLink, FaUnlink, FaUserCircle, FaQuoteLeft, FaImage } from 'react-icons/fa';

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
const SUGGESTION_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w92';
const PLACEHOLDER_SUGGESTION_POSTER = 'https://via.placeholder.com/92x138.png?text=N/A';
const POST_MAX_LENGTH = 280;
const IMAGE_MAX_SIZE_MB = 5; // Maksimum resim boyutu (MB)
const IMAGE_MAX_SIZE_BYTES = IMAGE_MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function CreatePostForm({ onPostCreated }) {
    const { t } = useTranslation();
    const { token, user } = useAuth();

    // Form State'leri
    const [postText, setPostText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [postType, setPostType] = useState('text');

    // <<< YENİ: Fotoğraf State'leri >>>
    const [selectedFile, setSelectedFile] = useState(null); // Seçilen dosya
    const [previewUrl, setPreviewUrl] = useState(null); // Önizleme URL'si
    const fileInputRef = useRef(null); // Gizli file input için ref
    // <<< YENİ SONU >>>

    // İçerik Bağlama State'leri
    const [showLinkContent, setShowLinkContent] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedContent, setSelectedContent] = useState(null);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchContainerRef = useRef(null);

    const [remainingChars, setRemainingChars] = useState(POST_MAX_LENGTH);

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
        } catch (error) { console.error("Öneri arama hatası:", error); setSuggestions([]); }
        finally { setSuggestionsLoading(false); }
    }, [token]);

    const debouncedFetchSuggestions = useDebounce(fetchSuggestions, 400);

    const handleSearchChange = (event) => {
        const newTerm = event.target.value;
        setSearchTerm(newTerm);
        debouncedFetchSuggestions(newTerm);
    };

    const handleSelectSuggestion = (item) => {
        setSelectedContent(item);
        setSearchTerm('');
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleRemoveSelectedContent = () => {
        setSelectedContent(null);
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

    const handleTextChange = (event) => {
        const currentText = event.target.value;
        if (currentText.length <= POST_MAX_LENGTH) {
            setPostText(currentText);
            setRemainingChars(POST_MAX_LENGTH - currentText.length);
        }
    };

    // <<< YENİ: Dosya Seçme İşlemleri >>>
    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Tür kontrolü
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            setMessage(t('post_form_error_image_type', { types: ALLOWED_IMAGE_TYPES.map(t => t.split('/')[1]).join(', ') })); // Çeviri anahtarı
            setIsSuccess(false);
            setSelectedFile(null);
            setPreviewUrl(null);
            event.target.value = null; // Input'u temizle
            return;
        }

        // Boyut kontrolü
        if (file.size > IMAGE_MAX_SIZE_BYTES) {
            setMessage(t('post_form_error_image_size', { size: IMAGE_MAX_SIZE_MB })); // Çeviri anahtarı
            setIsSuccess(false);
            setSelectedFile(null);
            setPreviewUrl(null);
            event.target.value = null; // Input'u temizle
            return;
        }

        // Dosyayı ve önizlemeyi ayarla
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(file);
        setMessage(''); // Hata mesajını temizle
    };

    // Gizli dosya input'unu tetikle
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    // Seçili fotoğrafı kaldır
    const handleRemoveImage = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = null; // Input'u temizle
        }
    };
    // <<< YENİ SONU >>>

    const handleSubmit = async (event) => {
        event.preventDefault();
        // <<< GÜNCELLEME: Hem metin hem de fotoğraf boş olamaz >>>
        if (!postText.trim() && !selectedFile) {
            setMessage(t('post_form_error_empty', 'Gönderi metni veya fotoğraf eklemelisiniz.')); // Çeviri anahtarı
            setIsSuccess(false);
            return;
        }
        // <<< GÜNCELLEME SONU >>>
        if (!token) {
            setMessage(t('post_form_error_auth', 'Gönderi oluşturmak için giriş yapmalısınız.'));
            setIsSuccess(false);
            return;
        }
        if (postText.length > POST_MAX_LENGTH) {
             setMessage(t('post_form_error_length', { count: POST_MAX_LENGTH }));
             setIsSuccess(false);
             return;
        }

        setIsSubmitting(true);
        setMessage('');
        setIsSuccess(false);

        // <<< GÜNCELLEME: FormData Kullanımı >>>
        const formData = new FormData();
        formData.append('postType', postType);
        formData.append('postText', postText.trim());
        if (selectedContent) {
            formData.append('linkedContentId', selectedContent.id);
            formData.append('linkedContentType', selectedContent.type);
            formData.append('linkedContentTitle', selectedContent.title);
        }
        if (selectedFile) {
            formData.append('image', selectedFile); // 'image' backend'deki multer alan adı olmalı
        }
        // <<< GÜNCELLEME SONU >>>

        try {
            // <<< GÜNCELLEME: FormData gönderiliyor >>>
            const response = await axios.post('/api/logs', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data' // Önemli: Dosya yükleme için
                }
            });
            // <<< GÜNCELLEME SONU >>>

            setIsSuccess(true);
            setMessage(t('post_form_success', 'Gönderi başarıyla oluşturuldu!'));
            setPostText('');
            setRemainingChars(POST_MAX_LENGTH);
            setSelectedFile(null); // Fotoğrafı temizle
            setPreviewUrl(null); // Önizlemeyi temizle
            setSelectedContent(null);
            setShowLinkContent(false);
            setPostType('text');
            if (onPostCreated) {
                // Backend'den gelen log objesi imageUrl içerebilir
                onPostCreated(response.data.log);
            }
            setTimeout(() => { setMessage(''); setIsSuccess(false); }, 2500);

        } catch (error) {
            console.error("Gönderi oluşturma hatası:", error.response?.data || error.message);
            setMessage(t('post_form_error_generic', { message: error.response?.data?.message || 'Bir hata oluştu.' }));
            setIsSuccess(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const userAvatar = user?.avatarUrl || null;

    return (
        <div className="bg-neutral-900 rounded-3xl shadow-xl px-4 py-5 sm:px-6 sm:py-6 w-full max-w-[480px] my-4 mx-auto">
            <form onSubmit={handleSubmit} className="flex items-start space-x-3 sm:space-x-4">
                {/* Kullanıcı Avatarı */}
                <div className="flex-shrink-0">
                    {userAvatar ? (
                        <img src={userAvatar} alt="User Avatar" className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-gray-600" />
                    ) : (
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gray-600 flex items-center justify-center border-2 border-gray-600">
                            <FaUserCircle className="w-6 h-6 text-gray-400" />
                        </div>
                    )}
                </div>

                {/* Form Alanları */}
                <div className="flex-1 space-y-3">
                    {/* Metin Alanı */}
                    <textarea
                        value={postText}
                        onChange={handleTextChange}
                        placeholder={
                            postType === 'quote'
                            ? t('post_form_placeholder_quote', 'Alıntıyı buraya yazın...')
                            : t('post_form_placeholder', 'Ne düşünüyorsun? Veya bir alıntı paylaş...')
                        }
                        className="block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm bg-gray-700/80 text-gray-100 placeholder-gray-400/70 disabled:opacity-60 resize-none min-h-[60px]"
                        rows="3"
                        // required kaldırıldı, metin veya fotoğraf yeterli
                        disabled={isSubmitting}
                        maxLength={POST_MAX_LENGTH}
                    />
                    {/* Karakter Sayacı */}
                    <div className="text-right text-xs font-medium" style={{ marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
                        <span className={remainingChars < 20 ? (remainingChars < 0 ? 'text-red-500' : 'text-yellow-500') : 'text-gray-400'}>
                            {remainingChars}
                        </span>
                         <span className="text-gray-500"> / {POST_MAX_LENGTH}</span>
                    </div>

                    {/* <<< YENİ: Fotoğraf Önizleme Alanı >>> */}
                    {previewUrl && (
                        <div className="relative group/preview max-w-xs"> {/* Maksimum genişlik eklendi */}
                            <img src={previewUrl} alt={t('post_form_image_preview_alt', 'Seçilen fotoğraf önizlemesi')} className="rounded-md max-h-60 w-auto object-contain border border-gray-600" />
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover/preview:opacity-100 transition-opacity focus:opacity-100"
                                title={t('post_form_remove_image_title', 'Fotoğrafı Kaldır')}
                                aria-label={t('post_form_remove_image_title', 'Fotoğrafı Kaldır')}
                                disabled={isSubmitting}
                            >
                                <FaTimesCircle className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    {/* <<< YENİ SONU >>> */}


                    {/* İçerik Bağlama Alanı */}
                    {showLinkContent && (
                        <div ref={searchContainerRef} className="relative">
                            {/* ... (içerik bağlama kodu aynı kalır) ... */}
                             <div className="relative">
                                <label htmlFor="contentLinkSearch" className="sr-only">{t('post_form_link_search_placeholder', 'Film veya dizi ara...')}</label>
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <FaSearch className="h-4 w-4 text-gray-400" /> </div>
                                <input
                                    type="search"
                                    id="contentLinkSearch"
                                    placeholder={t('post_form_link_search_placeholder', 'Film veya dizi ara...')}
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    onFocus={() => fetchSuggestions(searchTerm)}
                                    disabled={isSubmitting || !!selectedContent}
                                    className="block w-full pl-9 pr-10 py-1.5 border border-gray-500 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm bg-gray-600/70 text-gray-100 placeholder-gray-400/70 disabled:opacity-60"
                                />
                                {searchTerm && !selectedContent && (
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                        <button type="button" onClick={() => { setSearchTerm(''); setSuggestions([]); setShowSuggestions(false); }} className="text-gray-400 hover:text-gray-200" aria-label={t('create_list_search_clear_aria')}>
                                            <FaTimes className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            {/* Öneri Listesi */}
                            {showSuggestions && !selectedContent && (
                               <div className="absolute left-0 right-0 mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg z-30 max-h-48 overflow-y-auto custom-scrollbar">
                                    {suggestionsLoading && <div className="px-3 py-2 text-center text-gray-400 text-xs italic">{t('create_list_suggestions_loading')}</div>}
                                    {!suggestionsLoading && suggestions.length === 0 && searchTerm.length >= 2 && <div className="px-3 py-2 text-center text-gray-400 text-xs">{t('create_list_suggestions_no_results', { term: searchTerm })}</div>}
                                    {!suggestionsLoading && suggestions.length > 0 && (
                                        <ul className="divide-y divide-gray-600">
                                            {suggestions.map(item => (
                                                <li key={`${item.type}-${item.id}`}>
                                                     <button type="button" onClick={() => handleSelectSuggestion(item)} className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-600 transition-colors text-xs">
                                                         <img src={item.poster_path ? `${SUGGESTION_POSTER_BASE_URL}${item.poster_path}` : PLACEHOLDER_SUGGESTION_POSTER} alt="" className="w-6 h-9 mr-2 object-cover rounded-sm flex-shrink-0 bg-gray-600" loading="lazy"/>
                                                         <span className={`flex-shrink-0 mr-1.5 text-[9px] font-medium px-1 py-0.5 rounded ${item.type === 'movie' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
                                                             {item.type === 'movie' ? t('type_movie') : t('type_tv')}
                                                         </span>
                                                         <span className="flex-grow font-medium text-gray-100 truncate">{item.title}</span>
                                                         {item.year && <span className="ml-1.5 text-gray-400 text-[10px] flex-shrink-0">({item.year})</span>}
                                                     </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Seçili İçerik Bilgisi */}
                    {selectedContent && (
                        <div className="flex items-center justify-between bg-gray-700/70 p-1.5 pl-2 rounded-md border border-gray-600/80 text-xs">
                            <div className="flex items-center space-x-1.5 overflow-hidden">
                                <FaLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-300 flex-shrink-0">{selectedContent.type === 'movie' ? t('type_movie') : t('type_tv')}:</span>
                                <span className="text-gray-100 font-medium truncate">{selectedContent.title}</span>
                                {selectedContent.year && <span className="text-gray-400 flex-shrink-0">({selectedContent.year})</span>}
                            </div>
                            <button
                                type="button"
                                onClick={handleRemoveSelectedContent}
                                className="p-1 text-gray-400 hover:text-red-400 rounded-full hover:bg-red-900/30 disabled:opacity-50 transition-colors flex-shrink-0 ml-1"
                                title={t('post_form_remove_link_title', 'Bağlantıyı Kaldır')}
                                disabled={isSubmitting}
                            >
                                <FaTimesCircle className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Alt Butonlar ve Mesaj */}
                    <div className="flex items-center justify-between pt-1">
                        {/* Sol Butonlar */}
                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={() => setPostType(prev => prev === 'quote' ? 'text' : 'quote')}
                                className={`p-1.5 rounded-full transition-colors ${postType === 'quote' ? 'bg-purple-600/30 text-purple-300' : 'text-gray-400 hover:text-purple-400 hover:bg-purple-900/30'}`}
                                title={postType === 'quote' ? t('post_form_type_text_title', 'Normal Metin Olarak İşaretle') : t('post_form_type_quote_title', 'Alıntı Olarak İşaretle')}
                                disabled={isSubmitting}
                            >
                                <FaQuoteLeft className="w-4 h-4" />
                            </button>
                            {/* <<< YENİ: Fotoğraf Ekle Butonu >>> */}
                            <button
                                type="button"
                                onClick={triggerFileInput}
                                className={`p-1.5 rounded-full transition-colors ${previewUrl ? 'bg-green-600/30 text-green-300' : 'text-gray-400 hover:text-green-400 hover:bg-green-900/30'}`}
                                title={t('post_form_add_image_title', 'Fotoğraf Ekle')} // Çeviri anahtarı
                                disabled={isSubmitting}
                            >
                                <FaImage className="w-4 h-4" />
                            </button>
                            {/* <<< YENİ SONU >>> */}
                            <button
                                type="button"
                                onClick={() => setShowLinkContent(prev => !prev)}
                                className={`p-1.5 rounded-full transition-colors ${showLinkContent ? 'bg-cyan-600/30 text-cyan-300' : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-900/30'}`}
                                title={showLinkContent ? t('post_form_hide_link_title', 'İçerik Aramayı Gizle') : t('post_form_show_link_title', 'İçeriğe Bağla (Opsiyonel)')}
                                disabled={isSubmitting}
                            >
                                <FaLink className="w-4 h-4" />
                            </button>
                            {/* Gizli dosya input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept={ALLOWED_IMAGE_TYPES.join(',')} // Sadece izin verilen türler
                                className="hidden"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Sağ Buton: Gönder */}
                        <button
                            type="submit"
                            // <<< GÜNCELLEME: Metin veya fotoğraf varsa aktif >>>
                            disabled={isSubmitting || (!postText.trim() && !selectedFile)}
                            // <<< STİL GÜNCELLEMESİ: Kalın metin >>>
                            className="inline-flex items-center justify-center px-4 py-1.5 border border-gray-500 text-sm font-semibold rounded-full shadow-sm text-gray-800 dark:text-black bg-white hover:bg-gray-100 dark:bg-gray-200 dark:hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSubmitting && (
                                <FaSpinner className="animate-spin mr-2 h-4 w-4" />
                            )}
                            {isSubmitting ? t('post_form_submitting', 'Gönderiliyor...') : t('post_form_submit_button_send', 'Gönder')}
                        </button>
                    </div>
                    {/* Mesaj Alanı */}
                    {message && (
                        <p className={`text-xs text-center font-medium pt-2 ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
                            {isSuccess ? <FaCheckCircle className="inline w-3 h-3 mr-1 mb-px" /> : <FaTimesCircle className="inline w-3 h-3 mr-1 mb-px" />}
                            {message}
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
}

export default CreatePostForm;
