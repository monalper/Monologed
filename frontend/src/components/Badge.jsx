// src/components/Badge.jsx
import React from 'react';
import AchievementIcons from './AchievementIcons'; // İkonları import et
import { useTranslation } from 'react-i18next';
import { FaAward } from 'react-icons/fa'; // Varsayılan ikon için import

function Badge({ achievement, isEarned = false }) {
    const { t, i18n } = useTranslation();
    if (!achievement) return null;

    const { id, name, description, iconName, level, earnedAt } = achievement;

    // *** DÜZELTME: IconComponent'in undefined olmamasını sağla ***
    // İlgili ikonu AchievementIcons'dan al. Bulunamazsa veya AchievementIcons.default yoksa FaAward kullan.
    const SpecificIcon = AchievementIcons && iconName && AchievementIcons[iconName];
    const DefaultIcon = AchievementIcons && AchievementIcons['default'] ? AchievementIcons['default'] : FaAward; // Eğer default yoksa FaAward kullan
    const IconComponent = SpecificIcon || DefaultIcon;
    // *** DÜZELTME SONU ***


    // Kazanılma tarihini formatla
    const formattedEarnedDate = earnedAt
        ? new Date(earnedAt).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' })
        : null;

    return (
        <div
            className={`
                flex flex-col items-center text-center p-4 rounded-xl transition-all duration-300 ease-in-out
                ${isEarned
                    ? 'bg-gradient-to-br from-yellow-100 via-yellow-50 to-white dark:from-yellow-900/50 dark:via-yellow-800/30 dark:to-gray-800/40 border border-yellow-300 dark:border-yellow-700/60 shadow-lg hover:shadow-yellow-500/20 dark:hover:shadow-yellow-400/10'
                    : 'bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 opacity-60 hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700/80'
                }
            `}
            title={isEarned && formattedEarnedDate ? t('badge_earned_on', { date: formattedEarnedDate }) : description}
        >
            {/* İkon Alanı */}
            <div className={`
                w-16 h-16 sm:w-20 sm:h-20 mb-3 rounded-full flex items-center justify-center
                ${isEarned
                    ? 'bg-yellow-400/20 dark:bg-yellow-500/30 border-2 border-yellow-500 dark:border-yellow-400'
                    : 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
                }
            `}>
                {/* IconComponent artık her zaman geçerli bir bileşen olmalı */}
                <IconComponent className={`
                    w-8 h-8 sm:w-10 sm:h-10
                    ${isEarned ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}
                `} />
            </div>

            {/* Metin Alanı */}
            <div className="w-full">
                <h4 className={`
                    font-semibold text-sm sm:text-base mb-0.5 truncate
                    ${isEarned ? 'text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}
                `} title={name}>
                    {name}
                    {level && <span className="ml-1 text-xs font-normal opacity-70">{t('badge_level_prefix', { level })}</span>}
                </h4>
                <p className={`
                    text-xs sm:text-sm leading-tight line-clamp-2
                    ${isEarned ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}
                `}>
                    {description}
                </p>
                {/* Kazanılma Tarihi */}
                {isEarned && formattedEarnedDate && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                        {formattedEarnedDate}
                    </p>
                )}
            </div>
        </div>
    );
}

export default Badge;