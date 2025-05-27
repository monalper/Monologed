// src/pages/LetterboxdImportPage.jsx
import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FaFileUpload, FaSpinner, FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next'; // *** useTranslation import edildi ***

// Desteklenen Letterboxd CSV başlıkları
const DIARY_HEADERS = ['Watched Date', 'Name', 'Year'];
const RATINGS_HEADERS = ['Rating', 'Name', 'Year'];
const WATCHED_HEADERS = ['Date', 'Name', 'Year', 'Letterboxd URI'];
const WATCHLIST_HEADERS = ['Date', 'Name', 'Year'];

function LetterboxdImportPage() {
    const { t } = useTranslation(); // *** t fonksiyonu alındı ***
    const { token } = useAuth();
    const [fileInfo, setFileInfo] = useState(null);
    const [importedData, setImportedData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [progress, setProgress] = useState({ processed: 0, total: 0, errors: 0 });
    const fileInputRef = useRef(null);

    const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
        setError(null); setSuccessMessage(null); setImportedData(null);
        setProgress({ processed: 0, total: 0, errors: 0 }); setFileInfo(null);

        if (rejectedFiles && rejectedFiles.length > 0) {
            const rejectReason = rejectedFiles[0].errors[0]?.code;
            // *** Hata mesajları çevirisi ***
            if (rejectReason === 'file-invalid-type') setError(t('letterboxd_import_error_reject_type'));
            else if (rejectReason === 'file-too-large') setError(t('letterboxd_import_error_reject_size'));
            else setError(t('letterboxd_import_error_reject_generic', { message: rejectedFiles[0].errors[0]?.message || 'Bilinmeyen hata' }));
            return;
        }
        const file = acceptedFiles[0];
        if (!file) { setError(t('letterboxd_import_error_select')); return; }
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) { setError(t('letterboxd_import_error_reject_type')); return; }
        setFileInfo({ name: file.name, size: file.size });
        parseCsvFile(file);
    }, [t]); // t bağımlılıklara eklendi

    const parseCsvFile = (file) => {
        setIsLoading(true); setError(null); setSuccessMessage(null); setImportedData(null);
        try {
            Papa.parse(file, {
                header: true, skipEmptyLines: true,
                complete: (results) => {
                    setIsLoading(false);
                    if (results.errors && results.errors.length > 0) {
                        setError(t('letterboxd_import_error_parse_generic', { message: results.errors[0].message }));
                        setFileInfo(null); return;
                    }
                    if (!results.data || results.data.length === 0) {
                        setError(t('letterboxd_import_error_parse_empty'));
                        setFileInfo(null); return;
                    }
                    let fileType = 'unknown'; const headers = results.meta.fields;
                    if (DIARY_HEADERS.every(h => headers.includes(h))) fileType = 'diary';
                    else if (RATINGS_HEADERS.every(h => headers.includes(h))) fileType = 'ratings';
                    else if (WATCHED_HEADERS.every(h => headers.includes(h))) fileType = 'watched';
                    else if (WATCHLIST_HEADERS.every(h => headers.includes(h))) fileType = 'watchlist';
                    if (fileType === 'unknown') {
                         setError(t('letterboxd_import_error_unknown_type'));
                         setFileInfo(null); return;
                    }
                    setImportedData({ type: fileType, data: results.data });
                },
                error: (parseError) => {
                    setIsLoading(false);
                    setError(t('letterboxd_import_error_parse_unknown', { message: parseError.message }));
                    setFileInfo(null);
                }
            });
        } catch (e) {
             setIsLoading(false);
             setError(t('letterboxd_import_error_parse_unexpected', { message: e.message }));
             setFileInfo(null);
        }
    };

    const handleImport = async () => {
        if (!importedData || !token) { setError(t('letterboxd_import_error_no_data')); return; }
        setIsLoading(true); setError(null); setSuccessMessage(null);
        setProgress({ processed: 0, total: importedData.data.length, errors: 0 });
        try {
            const response = await axios.post('/api/import/letterboxd', importedData, { // Proxy varsayımı
                headers: { Authorization: `Bearer ${token}` } // Token ekle
            });
            setSuccessMessage(response.data.message || t('letterboxd_import_success')); // *** Çeviri kullanıldı ***
            setProgress(prev => ({
                ...prev,
                processed: response.data.processedCount || prev.total,
                errors: response.data.errorCount || 0
            }));
            setFileInfo(null); setImportedData(null);
        } catch (apiError) {
            console.error("Import API Error:", apiError.response?.data || apiError.message);
            // *** Çeviri kullanıldı (değişken ile) ***
            setError(apiError.response?.data?.message
                ? t('letterboxd_import_fail_specific', { message: apiError.response.data.message })
                : t('letterboxd_import_fail_generic')
            );
             if (apiError.response?.data?.processedCount !== undefined) {
                 setProgress(prev => ({
                     ...prev,
                     processed: apiError.response.data.processedCount,
                     errors: apiError.response.data.errorCount || prev.total - apiError.response.data.processedCount
                 }));
             }
        } finally { setIsLoading(false); }
    };

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop, accept: { 'text/csv': ['.csv'] }, multiple: false
    });

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            {/* *** Başlık çevirisi *** */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
                {t('letterboxd_import_page_title')}
            </h1>
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg shadow-md p-6 space-y-6">
                {/* Açıklama */}
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    {/* *** Açıklama metinleri çevirisi *** */}
                    <p className="flex items-center"><FaInfoCircle className="w-4 h-4 mr-2 text-blue-500" /> {t('letterboxd_import_info_1')}</p>
                    <p><strong>{t('letterboxd_import_info_2_q')}</strong> {t('letterboxd_import_info_2_a')}</p>
                    <p><strong>{t('letterboxd_import_info_3_q')}</strong> {t('letterboxd_import_info_3_a')}</p>
                </div>
                {/* Dosya Yükleme Alanı */}
                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ease-in-out ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'} ${isDragReject ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}>
                    <input {...getInputProps()} ref={fileInputRef} />
                    <FaFileUpload className={`w-10 h-10 mx-auto mb-3 ${isDragReject ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`} />
                    {/* *** Dropzone metinleri çevirisi *** */}
                    {isDragActive ? (<p className="text-blue-600 dark:text-blue-300 font-semibold">{t('letterboxd_import_dropzone_active')}</p>)
                    : isDragReject ? (<p className="text-red-600 dark:text-red-400 font-semibold">{t('letterboxd_import_dropzone_reject')}</p>)
                    : (<>
                            <p className="text-gray-700 dark:text-gray-300 font-semibold">{t('letterboxd_import_dropzone_idle')}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('letterboxd_import_dropzone_hint')}</p>
                        </>)}
                </div>
                {/* Yüklenen Dosya Bilgisi */}
                {fileInfo && !error && (
                    <div className="text-sm text-gray-600 dark:text-gray-400" key={fileInfo.name}>
                        {/* *** Metin çevirisi (değişken ile) *** */}
                        {t('letterboxd_import_uploaded_prefix')} <strong>{fileInfo.name}</strong> {t('letterboxd_import_uploaded_size', { size: Math.round(fileInfo.size / 1024) })}
                        {isLoading && !importedData && <span className="ml-2 italic">{t('letterboxd_import_parsing')}</span>}
                    </div>
                )}
                {/* Hata Mesajı */}
                {error && ( <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-md text-sm text-red-700 dark:text-red-300 flex items-center"> <FaTimesCircle className="w-4 h-4 mr-2 flex-shrink-0" /> {error} </div> )}
                {/* Başarı Mesajı */}
                 {successMessage && ( <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded-md text-sm text-green-700 dark:text-green-300 flex items-center"> <FaCheckCircle className="w-4 h-4 mr-2 flex-shrink-0" /> <div> {successMessage} {progress.total > 0 && ( <span className="block text-xs mt-1"> {t('letterboxd_import_success_details', { processed: progress.processed, total: progress.total, errors: progress.errors })} </span> )} </div> </div> )}
                {/* İçe Aktarma Butonu */}
                {importedData && !error && !successMessage && (
                    <div className="text-center space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                         {/* *** Metin çevirisi (değişken ile) *** */}
                         <p className="text-sm text-gray-600 dark:text-gray-300"> {t('letterboxd_import_ready_message', { count: importedData.data.length, type: importedData.type })} </p>
                        <button onClick={handleImport} disabled={isLoading} className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed">
                            {isLoading ? ( <> <FaSpinner className="animate-spin -ml-1 mr-2 h-5 w-5" /> {t('letterboxd_import_button_loading')} </> ) : ( t('letterboxd_import_button', { type: importedData.type }) )}
                        </button>
                         {isLoading && progress.total > 0 && (
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-linear" style={{ width: `${progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0}%` }}></div>
                                {/* *** Metin çevirisi (değişken ile) *** */}
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1"> {t('letterboxd_import_progress', { processed: progress.processed, total: progress.total })} </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default LetterboxdImportPage;
