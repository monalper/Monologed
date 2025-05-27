// src/components/StarRating.jsx
import React, { useState } from 'react';

const FILLED_STAR = '★';
const EMPTY_STAR = '☆';

function StarRating({
    rating,
    onRatingChange,
    interactive = true,
    size = "text-2xl" // Bu sınıf genel konteynere uygulanacak
}) {
    const [hoverRating, setHoverRating] = useState(0);

    const currentRatingValue = rating === '' || rating === null ? 0 : Number(rating);
    const displayRatingValue = hoverRating > 0 ? hoverRating : currentRatingValue;

    const handleClick = (value) => {
        if (!interactive) return;
        if (value === currentRatingValue) { onRatingChange(null); }
        else { onRatingChange(value); }
    };

    const handleMouseEnter = (value) => { if (interactive) setHoverRating(value); };
    const handleMouseLeave = () => { if (interactive) setHoverRating(0); };

    return (
        <div
            className={`flex items-center ${interactive ? 'cursor-pointer' : ''} ${size}`} // Boyut sınıfını dış div'e taşıdık
            onMouseLeave={handleMouseLeave}
            style={{ lineHeight: 1 }} // Yıldızların dikey hizalamasını iyileştirebilir
        >
            {[...Array(5)].map((_, starIndex) => {
                const ratingValueHalf = (starIndex * 2) + 1;
                const ratingValueFull = (starIndex * 2) + 2;

                // Bu yıldız için doluluk yüzdesini hesapla
                let fillPercentage = '0%';
                if (displayRatingValue >= ratingValueFull) {
                    fillPercentage = '100%';
                } else if (displayRatingValue >= ratingValueHalf) {
                    fillPercentage = '50%';
                }

                return (
                    // Her yıldız için bir kapsayıcı (relative)
                    <div
                        key={starIndex}
                        style={{ position: 'relative', display: 'inline-block' }}
                        className="leading-none" // Satır yüksekliğini sıfırla
                    >
                        {/* Alt Katman: Boş Yıldız (Her zaman görünür) */}
                        <span className={`text-gray-300 ${size}`}>{EMPTY_STAR}</span>

                        {/* Üst Katman: Dolu Yıldız (Genişliği ayarlanır) */}
                        <span
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: fillPercentage, // Dinamik genişlik
                                overflow: 'hidden', // Taşanı gizle
                                whiteSpace: 'nowrap' // Yıldızın bölünmesini engelle
                            }}
                            className={`text-yellow-500 ${size} pointer-events-none`} // Rengi sarı yap, fare olaylarını engelle
                        >
                            {FILLED_STAR}
                        </span>

                        {/* Görünmez Tıklama Alanları (Üstte kalmalı) */}
                        {interactive && (
                            <>
                                <span
                                     style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', zIndex: 1, cursor: 'pointer' }}
                                     onMouseEnter={() => handleMouseEnter(ratingValueHalf)}
                                     onClick={() => handleClick(ratingValueHalf)}
                                     title={`${ratingValueHalf / 2} yıldız`}
                                ></span>
                                 <span
                                     style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', zIndex: 1, cursor: 'pointer' }}
                                     onMouseEnter={() => handleMouseEnter(ratingValueFull)}
                                     onClick={() => handleClick(ratingValueFull)}
                                     title={`${ratingValueFull / 2} yıldız`}
                                 ></span>
                             </>
                        )}
                    </div>
                );
            })}
            {/* Puanı Metin Olarak Gösterme */}
            {currentRatingValue > 0 && (
                <span className={`text-sm text-gray-600 ml-2 ${size === 'text-3xl' ? 'align-middle' : ''}`}>{currentRatingValue / 2}/5</span> // Boyuta göre hizalama
            )}
            {!interactive && currentRatingValue === 0 && (
                <span className={`text-sm text-gray-500 ml-2 ${size === 'text-3xl' ? 'align-middle' : ''}`}>(Puanlanmamış)</span>
            )}
        </div>
    );
}

export default StarRating;