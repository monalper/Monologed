// src/components/UserCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserCircle, FaCheckCircle } from 'react-icons/fa'; // İkonlar

const DEFAULT_AVATAR_URL = 'https://journal-app-avatars.s3.eu-north-1.amazonaws.com/avatars/SPRK_default_preset_name_custom+%E2%80%93+1.svg';

// Varsayılan Avatar (Daha küçük)
const DefaultAvatarSmall = () => (
    <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0"> {/* Boyut küçültüldü */}
        <FaUserCircle className="w-8 h-8 text-gray-400" />
    </div>
);

function UserCard({ user }) {
    // Eğer kullanıcı verisi yoksa veya ID eksikse null dön
    if (!user || !user.userId) {
        return null;
    }

    const { userId, username, name, avatarUrl, isVerified } = user;
    const displayName = name || username; // Görünen isim yoksa kullanıcı adını kullan
    const profileLink = `/user/${userId}`;

    return (
        // <<< DEĞİŞİKLİK: Yatay layout için flex kullanıldı >>>
        <Link
            to={profileLink}
            className="flex items-center space-x-3 group/usercard bg-gray-800/50 hover:bg-gray-700/70 border border-gray-700 hover:border-gray-600 rounded-lg p-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-brand"
        >
            {/* Avatar Alanı */}
            <div className="flex-shrink-0">
                <img
                    src={avatarUrl || DEFAULT_AVATAR_URL}
                    alt={`${username} avatarı`}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-600 group-hover/usercard:border-brand-hover transition-colors"
                    loading="lazy"
                />
            </div>

            {/* Kullanıcı Bilgileri Alanı */}
            <div className="flex-1 min-w-0"> {/* min-w-0 taşmayı önler */}
                <h3
                    className="font-semibold text-sm text-gray-100 group-hover/usercard:text-brand-hover transition-colors truncate flex items-center" // justify-center kaldırıldı
                    title={displayName}
                >
                    {displayName}
                    {isVerified && (
                        <FaCheckCircle className="w-3 h-3 text-blue-400 ml-1.5 flex-shrink-0" title="Onaylanmış Hesap" /> // ml-1.5 eklendi
                    )}
                </h3>
                {name && username && ( // Eğer hem isim hem kullanıcı adı varsa, kullanıcı adını daha küçük göster
                    <p className="text-xs text-gray-400 truncate" title={`@${username}`}>
                        @{username}
                    </p>
                )}
                 {/* İsteğe bağlı: Takipçi sayısı vb. eklenebilir */}
                 {/* <p className="text-xs text-gray-500 mt-0.5">X takipçi</p> */}
            </div>
        </Link>
    );
}

export default UserCard;
