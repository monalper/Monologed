// src/components/ListPreviewCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaTrash, FaSpinner, FaFilm } from 'react-icons/fa';
import { useTranslation } from 'react-i18next'; // *** useTranslation import edildi ***

// TMDB Poster URL'si ve Placeholder
const IMAGE_BASE_URL_W342 = 'https://image.tmdb.org/t/p/w342';
const PLACEHOLDER_IMAGE_ASPECT = 'https://via.placeholder.com/342x513.png?text=Poster+Yok';

// Stil sabitleri
const POSTER_WIDTH_CLASS = 'w-20 sm:w-24';
const MAX_VISIBLE_POSTERS = 5;
const POSTER_OVERLAP_PERCENT = 15;

function ListPreviewCard({ list, onDelete, isDeleting, to, style }) {
    const { t } = useTranslation(); // *** t fonksiyonu alındı ***

    if (!list) return null;

    const {
        listId,
        listName = t('list_preview_default_name'), // *** Varsayılan isim çevirisi ***
        itemCount = 0,
        previewPosters = []
    } = list;

    const postersToShow = previewPosters.slice(0, MAX_VISIBLE_POSTERS);
    const posterCount = postersToShow.length;

    // Poster dizilimi mantığı
    let posterArea;
    if (posterCount === 5) {
        posterArea = (
            <div className={`relative h-28 sm:h-36 mb-2 bg-gradient-to-r from-gray-700/40 via-gray-800/30 to-gray-700/40 dark:from-gray-800/60 dark:via-gray-900/50 dark:to-gray-800/60 rounded-lg shadow-inner overflow-hidden border border-gray-300 dark:border-gray-700 group-hover/listcard:border-gray-400 dark:group-hover/listcard:border-gray-600 transition-colors`}>
                {postersToShow.map((posterPath, index) => {
                    const leftPercent = (index * 100) / 4;
                    return (
                        <div
                            key={posterPath ? `${listId}-poster-${index}` : `${listId}-ph-${index}`}
                            className={`absolute top-0 bottom-0 ${POSTER_WIDTH_CLASS} aspect-[2/3] rounded shadow-lg overflow-hidden transition-all duration-300 ease-in-out group-hover/listcard:shadow-xl border border-black/60`}
                            style={{ left: `${leftPercent}%`, zIndex: MAX_VISIBLE_POSTERS - index }}
                        >
                            <img
                                src={posterPath ? `${IMAGE_BASE_URL_W342}${posterPath}` : PLACEHOLDER_IMAGE_ASPECT}
                                alt=""
                                className="w-full h-full object-cover bg-gray-500 dark:bg-gray-700"
                                loading="lazy"
                            />
                        </div>
                    );
                })}
            </div>
        );
    } else if (posterCount > 1) {
        posterArea = (
            <div className={`flex flex-row items-center justify-center gap-2 sm:gap-3 h-28 sm:h-36 mb-2 bg-gradient-to-r from-gray-700/40 via-gray-800/30 to-gray-700/40 dark:from-gray-800/60 dark:via-gray-900/50 dark:to-gray-800/60 rounded-lg shadow-inner overflow-hidden border border-gray-300 dark:border-gray-700 group-hover/listcard:border-gray-400 dark:group-hover/listcard:border-gray-600 transition-colors`}>
                {postersToShow.map((posterPath, index) => (
                    <div
                        key={posterPath ? `${listId}-poster-${index}` : `${listId}-ph-${index}`}
                        className={`${POSTER_WIDTH_CLASS} aspect-[2/3] rounded shadow-lg overflow-hidden border border-black/60`}
                    >
                        <img
                            src={posterPath ? `${IMAGE_BASE_URL_W342}${posterPath}` : PLACEHOLDER_IMAGE_ASPECT}
                            alt=""
                            className="w-full h-full object-cover bg-gray-500 dark:bg-gray-700"
                            loading="lazy"
                        />
                    </div>
                ))}
            </div>
        );
    } else {
        posterArea = (
            <div className={`flex items-center justify-center h-28 sm:h-36 mb-2 bg-gradient-to-r from-gray-700/40 via-gray-800/30 to-gray-700/40 dark:from-gray-800/60 dark:via-gray-900/50 dark:to-gray-800/60 rounded-lg shadow-inner overflow-hidden border border-gray-300 dark:border-gray-700 group-hover/listcard:border-gray-400 dark:group-hover/listcard:border-gray-600 transition-colors`}>
                {postersToShow.length === 0 ? (
                    <FaFilm className="text-gray-500 dark:text-gray-600 w-8 h-8 opacity-50" />
                ) : (
                    <div className={`${POSTER_WIDTH_CLASS} aspect-[2/3] rounded shadow-lg overflow-hidden border border-black/60`}>
                        <img
                            src={postersToShow[0] ? `${IMAGE_BASE_URL_W342}${postersToShow[0]}` : PLACEHOLDER_IMAGE_ASPECT}
                            alt=""
                            className="w-full h-full object-cover bg-gray-500 dark:bg-gray-700"
                            loading="lazy"
                        />
                    </div>
                )}
            </div>
        );
    }

    const linkTo = to || `/list/${listId}`;
    return (
        <Link
            to={linkTo}
            className="relative group/listcard transition-all duration-300 ease-in-out transform hover:-translate-y-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 rounded-lg cursor-pointer block"
            style={style}
            tabIndex={0}
        >
            {/* Poster Kolaj Alanı */}
            {posterArea}
            {/* Liste Bilgileri Alanı */}
            <div className="px-1 py-1">
                <h3
                    className="font-semibold text-sm sm:text-base text-gray-800 dark:text-gray-100 truncate group-hover/listcard:text-blue-600 dark:group-hover/listcard:text-blue-400 transition-colors"
                    title={listName}
                >
                    {listName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('item_count', { count: itemCount })}
                </p>
            </div>
            {/* Sil Butonu */}
            {typeof onDelete === 'function' && (
                <div className="absolute top-2 right-2 opacity-0 group-hover/listcard:opacity-100 transition-opacity duration-200 z-10">
                    <button
                        onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(listId, listName);
                        }}
                        disabled={isDeleting}
                        className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-gray-800"
                        title={t('list_preview_delete_button_title')}
                        aria-label={t('list_preview_delete_button_title')}
                    >
                        {isDeleting ? (
                            <FaSpinner className="animate-spin h-4 w-4" />
                        ) : (
                            <FaTrash className="w-3.5 h-3.5" />
                        )}
                    </button>
                </div>
            )}
        </Link>
    );
}

export default ListPreviewCard;
