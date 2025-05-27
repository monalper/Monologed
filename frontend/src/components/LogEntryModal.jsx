// src/components/LogEntryModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StarRating from './StarRating';
import { FaTrash, FaSpinner } from 'react-icons/fa';
import { useTranslation } from 'react-i18next'; // *** useTranslation import edildi ***
import { useAuth } from '../context/AuthContext'; // Token almak için

function LogEntryModal({
    isOpen, onClose, contentId, contentType,
    existingLogData, onLogSaved, onLogDeleted,
    numberOfSeasons, initialSeason = null, initialEpisode = null
}) {
    const { t } = useTranslation(); // *** t fonksiyonu alındı ***
    const { token } = useAuth(); // Token'ı al
    const [watchedDate, setWatchedDate] = useState('');
    const [rating, setRating] = useState('');
    const [review, setReview] = useState('');
    const [isRewatch, setIsRewatch] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [selectedEpisode, setSelectedEpisode] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Formu doldurma
    useEffect(() => {
        setMessage(''); setIsSubmitting(false); setIsDeleting(false);
        let defaultSeason = ''; let defaultEpisode = '';
        if (contentType === 'tv') {
            if (initialSeason === 'all') defaultSeason = '';
            else if (initialSeason !== null && initialSeason !== undefined) {
                defaultSeason = String(initialSeason);
                if(initialEpisode !== null && initialEpisode !== undefined) defaultEpisode = String(initialEpisode);
            }
        }
        if (isOpen && existingLogData) {
            const formattedDate = existingLogData.watchedDate ? new Date(existingLogData.watchedDate).toISOString().split('T')[0] : '';
            setWatchedDate(formattedDate);
            setRating(existingLogData.rating !== undefined && existingLogData.rating !== null ? String(existingLogData.rating) : '');
            setReview(existingLogData.review || '');
            setIsRewatch(existingLogData.isRewatch || false);
            const seasonFromLog = existingLogData.seasonNumber !== undefined && existingLogData.seasonNumber !== null ? String(existingLogData.seasonNumber) : '';
            const episodeFromLog = existingLogData.episodeNumber !== undefined && existingLogData.episodeNumber !== null ? String(existingLogData.episodeNumber) : '';
            setSelectedSeason(initialSeason !== null ? defaultSeason : seasonFromLog);
            setSelectedEpisode(initialEpisode !== null ? defaultEpisode : episodeFromLog);
        } else if (isOpen) {
            setWatchedDate(new Date().toISOString().split('T')[0]);
            setRating(''); setReview(''); setIsRewatch(false);
            setSelectedSeason(defaultSeason); setSelectedEpisode(defaultEpisode);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, existingLogData, initialSeason, initialEpisode, contentType]);

    if (!isOpen) return null;

    const handleRatingChange = (newRating) => { setRating(newRating === null ? '' : String(newRating)); };

    // Formu gönderme
    const handleSubmit = async (event) => {
        event.preventDefault(); setMessage(''); setIsSubmitting(true);
        let numericRating = null;
        if (rating !== '' && rating !== null) {
            numericRating = Number(rating);
            if (isNaN(numericRating) || numericRating < 0.5 || numericRating > 10) { setMessage(t('log_modal_error_rating')); setIsSubmitting(false); return; }
        }
        if (!watchedDate) { setMessage(t('log_modal_error_date')); setIsSubmitting(false); return; }
        let seasonToSend = null; let episodeToSend = null;
        if (contentType === 'tv' && selectedSeason !== '') {
             const parsedSeason = parseInt(selectedSeason, 10);
             if (!isNaN(parsedSeason) && Number.isInteger(parsedSeason) && parsedSeason >= 0) {
                 seasonToSend = parsedSeason;
                 if (selectedEpisode !== '') {
                     const parsedEpisode = parseInt(selectedEpisode, 10);
                     if (!isNaN(parsedEpisode) && Number.isInteger(parsedEpisode) && parsedEpisode >= 1) episodeToSend = parsedEpisode;
                     else { setMessage(t('log_modal_error_episode')); setIsSubmitting(false); return; } // Bölüm geçersizse dur
                 }
             }
         }
        const logDataPayload = {
            watchedDate, rating: numericRating, review: review || "", isRewatch,
            ...(contentType === 'tv' && { seasonNumber: seasonToSend }),
            ...(contentType === 'tv' && episodeToSend !== null && { episodeNumber: episodeToSend }),
            ...( !existingLogData && { contentId: contentId, contentType: contentType })
        };
        try {
            let response; let actionVerb = ''; const apiPrefix = '/api';
            const headers = { Authorization: `Bearer ${token}` }; // Token ekle
            if (existingLogData?.logId) {
                response = await axios.put(`${apiPrefix}/logs/${existingLogData.logId}`, logDataPayload, { headers });
                actionVerb = t('log_modal_success_update');
            } else {
                response = await axios.post(`${apiPrefix}/logs`, logDataPayload, { headers });
                 actionVerb = t('log_modal_success_save');
            }
            setMessage(actionVerb);
            if(onLogSaved) onLogSaved(response.data.log);
             setTimeout(onClose, 1200);
        } catch (error) {
            console.error(`Log ${existingLogData ? 'güncelleme' : 'kaydetme'} API hatası:`, error.response?.data || error.message);
            setMessage(t('log_modal_error_generic_save', { message: error.response?.data?.message || 'Bir hata oluştu.' }));
            setIsSubmitting(false);
        }
    };

    // Log silme
    const handleDelete = async () => {
         if (!existingLogData?.logId || !token) return;
         const confirmDelete = window.confirm(t('log_modal_confirm_delete')); // *** Çeviri kullanıldı ***
         if (confirmDelete) {
             setIsDeleting(true); setMessage('');
             try {
                 await axios.delete(`/api/logs/${existingLogData.logId}`, { headers: { Authorization: `Bearer ${token}` } }); // Token ekle
                 if(onLogDeleted) onLogDeleted(existingLogData.logId);
                 onClose();
             } catch (error) {
                 console.error("Log silme hatası:", error.response?.data || error.message);
                 setMessage(t('log_modal_error_generic_delete', { message: error.response?.data?.message || 'Bir hata oluştu.' }));
                 setIsDeleting(false);
             }
         }
    };

    // Sezon/Bölüm Dropdown/Input
    const renderSeasonDropdown = () => {
        if (contentType !== 'tv' || !numberOfSeasons || numberOfSeasons <= 0) return null;
        const seasonOptions = [<option key="all" value="">{t('log_modal_season_all')}</option>]; // *** Çeviri kullanıldı ***
        for (let i = 1; i <= numberOfSeasons; i++) {
            seasonOptions.push(<option key={i} value={String(i)}>{t('log_modal_season_prefix')} {i}</option>); // *** Çeviri kullanıldı ***
        }
        return (
            <div>
                <label htmlFor="seasonSelectModal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('log_modal_season_label')}</label>
                <select id="seasonSelectModal" value={selectedSeason} onChange={(e) => { setSelectedSeason(e.target.value); setSelectedEpisode(''); }} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 dark:bg-gray-600 dark:text-gray-200" disabled={isSubmitting || isDeleting}>
                    {seasonOptions}
                </select>
            </div>
        );
    };
    const renderEpisodeInput = () => {
        if (contentType !== 'tv' || selectedSeason === '' || selectedSeason === null) return null;
        return (
            <div>
                <label htmlFor="episodeNumberModal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('log_modal_episode_label')}</label>
                <input type="number" id="episodeNumberModal" value={selectedEpisode} onChange={(e) => setSelectedEpisode(e.target.value)} min="1" step="1" placeholder={t('log_modal_episode_placeholder')} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 dark:bg-gray-600 dark:text-gray-200" disabled={isSubmitting || isDeleting} />
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Kapat">✕</button>
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
                    {existingLogData ? t('log_modal_edit_title') : t('log_modal_new_title')}
                    {contentType === 'tv' && selectedSeason !== '' && ` - ${t('log_modal_season_prefix')} ${selectedSeason}${selectedEpisode !== '' ? `, ${t('log_modal_episode_label').split(':')[0]} ${selectedEpisode}` : ''}`}
                    {contentType === 'tv' && selectedSeason === '' && ` - ${t('log_modal_season_all')}`}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                         <label htmlFor="watchedDateModal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('log_modal_watched_date_label')} <span className="text-red-500">{t('log_modal_required_field')}</span></label>
                         <input type="date" id="watchedDateModal" value={watchedDate} onChange={(e) => setWatchedDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 dark:bg-gray-600 dark:text-gray-200" required disabled={isSubmitting || isDeleting} />
                    </div>
                    {renderSeasonDropdown()}
                    {renderEpisodeInput()}
                    <div className="flex items-center">
                         <input type="checkbox" id="isRewatchModal" checked={isRewatch} onChange={(e) => setIsRewatch(e.target.checked)} disabled={isSubmitting || isDeleting} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"/>
                         <label htmlFor="isRewatchModal" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">{t('log_modal_rewatch_label')}</label>
                    </div>
                     <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('log_modal_rating_label')}</label>
                         <StarRating rating={rating === '' ? null : Number(rating)} onRatingChange={handleRatingChange} interactive={!isSubmitting && !isDeleting} size="text-2xl"/>
                    </div>
                    <div>
                         <label htmlFor="reviewModal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('log_modal_review_label')}</label>
                         <textarea id="reviewModal" rows="3" value={review} onChange={(e) => setReview(e.target.value)} placeholder={t('log_modal_review_placeholder')} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 dark:bg-gray-600 dark:text-gray-200" disabled={isSubmitting || isDeleting}></textarea>
                    </div>
                     <div className="flex items-center justify-end space-x-3 pt-2">
                          {existingLogData && (
                             <button type="button" onClick={handleDelete} disabled={isSubmitting || isDeleting} className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50">
                                 {isDeleting ? <FaSpinner className="animate-spin w-4 h-4 mr-1"/> : <FaTrash className="w-4 h-4 mr-1"/>} {isDeleting ? t('log_modal_delete_button_loading') : t('log_modal_delete_button')}
                             </button>
                          )}
                         <button type="submit" disabled={isSubmitting || isDeleting} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                             {isSubmitting ? <FaSpinner className="animate-spin w-4 h-4 mr-1"/> : null} {isSubmitting ? t('log_modal_save_button_loading') : (existingLogData ? t('log_modal_update_button') : t('log_modal_save_button'))}
                         </button>
                         <button type="button" onClick={onClose} disabled={isSubmitting || isDeleting} className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-500 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                              {t('log_modal_cancel_button')}
                         </button>
                     </div>
                     {message && <p className={`mt-3 text-sm text-center ${message.includes('başarısız') || message.includes('silinemedi') || message.includes('hata') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{message}</p>}
                </form>
            </div>
        </div>
    );
}

export default LogEntryModal;
