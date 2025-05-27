// frontend/src/components/AchievementIcons.jsx
// Başarımlar için SVG ikonlarını içeren React bileşenleri.
// Tasarımlar, başarım seviyesi arttıkça daha gösterişli hale gelir.

import React from 'react';

// --- Renk Paleti ---
const colors = {
    bronze: "#CD7F32",      // Kahverengi/Bronz
    silver: "#C0C0C0",      // Gümüş Gri
    gold: "#FFD700",        // Altın Sarısı
    platinum: "#E5E4E2",    // Platin (Açık Gri/Beyaz)
    emerald: "#50C878",     // Zümrüt Yeşili
    ruby: "#E0115F",        // Yakut Kırmızısı
    sapphire: "#0F52BA",    // Safir Mavisi
    amethyst: "#9966CC",    // Ametist Moru
    diamond: "#b9f2ff",     // Elmas (Çok Açık Mavi)
    darkMatter: "#4A5568",  // Koyu Gri (stroke için)
    accent: "#3D47FF",      // Marka Mavi
    accentDark: "#252fcc",  // Koyu Marka Mavi
    white: "#FFFFFF",
    grey: "#A0AEC0",
    red: "#E53E3E",         // Hata veya özel vurgu
    green: "#48BB78",       // Başarı veya özel vurgu
    yellow: "#ECC94B",      // Yıldız vb.
};

// --- Yardımcı Bileşenler (Opsiyonel) ---
// Örneğin, farklı seviyeler için ortak bir çerçeve
const BaseBadge = ({ bgColor = colors.grey, strokeColor = colors.darkMatter, children }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="32" cy="32" r="28" fill={bgColor} stroke={strokeColor} strokeWidth="2.5"/>
    {children}
  </svg>
);

// Yıldız
const Star = ({ x, y, size = 4, color = colors.yellow }) => (
    <path d={`M ${x} ${y-size} L ${x+size*0.29} ${y-size*0.29} L ${x+size} ${y-size*0.22} L ${x+size*0.43} ${y+size*0.18} L ${x+size*0.62} ${y+size*0.81} L ${x} ${y+size*0.4} L ${x-size*0.62} ${y+size*0.81} L ${x-size*0.43} ${y+size*0.18} L ${x-size} ${y-size*0.22} L ${x-size*0.29} ${y-size*0.29} Z`} fill={color}/>
);

// Defne Yaprağı (Basit)
const LaurelWreath = ({ color = colors.darkMatter }) => (
    <>
        <path d="M 18 50 Q 32 44, 46 50" stroke={color} strokeWidth="2" fill="none" />
        <path d="M 20 48 Q 32 42, 44 48" stroke={color} strokeWidth="1.5" fill="none" />
        {/* Yapraklar eklenebilir */}
    </>
);

// --- İkon Bileşenleri ---

// --- Film Loglama ---
export const LogMovie1 = () => (
  <BaseBadge bgColor={colors.bronze}>
    <path d="M20 18H44V46H20V18Z" fill={colors.darkMatter} stroke={colors.white} strokeWidth="1.5"/>
    <rect x="23" y="21" width="18" height="3" fill={colors.white} rx="1"/>
    <rect x="23" y="31" width="18" height="3" fill={colors.white} rx="1"/>
    <rect x="23" y="41" width="18" height="3" fill={colors.white} rx="1"/>
  </BaseBadge>
);
export const LogMovie10 = () => (
  <BaseBadge bgColor={colors.silver}>
    <path d="M20 18H44V46H20V18Z" fill={colors.darkMatter} stroke={colors.white} strokeWidth="1.5"/>
    <rect x="23" y="21" width="18" height="3" fill={colors.white} rx="1"/>
    <rect x="23" y="26" width="18" height="3" fill={colors.white} rx="1"/>
    <rect x="23" y="31" width="18" height="3" fill={colors.white} rx="1"/>
    <rect x="23" y="36" width="18" height="3" fill={colors.white} rx="1"/>
    <rect x="23" y="41" width="18" height="3" fill={colors.white} rx="1"/>
    <Star x={32} y={14} color={colors.gold} />
  </BaseBadge>
);
export const LogMovie100 = () => (
  <BaseBadge bgColor={colors.gold}>
    <path d="M20 18H44V46H20V18Z" fill={colors.darkMatter} stroke={colors.white} strokeWidth="1.5"/>
    <rect x="23" y="21" width="18" height="3" fill={colors.white} rx="1"/>
    <rect x="23" y="26" width="18" height="3" fill={colors.white} rx="1"/>
    <rect x="23" y="31" width="18" height="3" fill={colors.white} rx="1"/>
    <rect x="23" y="36" width="18" height="3" fill={colors.white} rx="1"/>
    <rect x="23" y="41" width="18" height="3" fill={colors.white} rx="1"/>
    <Star x={32} y={12} color={colors.white} size={5}/>
    <LaurelWreath color={colors.darkMatter} />
  </BaseBadge>
);
export const LogMovie500 = () => (
  <BaseBadge bgColor={colors.platinum}>
    <path d="M20 18H44V46H20V18Z" fill={colors.darkMatter} stroke={colors.white} strokeWidth="1.5"/>
    <rect x="23" y="21" width="18" height="3" fill={colors.white} rx="1"/>
    <rect x="23" y="26" width="18" height="3" fill={colors.white} rx="1"/>
    <rect x="23" y="31" width="18" height="3" fill={colors.white} rx="1"/>
    <rect x="23" y="36" width="18" height="3" fill={colors.white} rx="1"/>
    <rect x="23" y="41" width="18" height="3" fill={colors.white} rx="1"/>
    <circle cx="32" cy="12" r="4" fill={colors.accent}/>
    <path d="M30 8 L 32 4 L 34 8 Z M 38 10 L 42 12 L 38 14 Z M 30 16 L 32 20 L 34 16 Z M 26 10 L 22 12 L 26 14 Z" fill={colors.white}/>
    <LaurelWreath color={colors.darkMatter} />
  </BaseBadge>
);
export const LogMovie1000 = () => (
  <BaseBadge bgColor={colors.diamond} strokeColor={colors.gold}>
     <defs>
      <radialGradient id="gradFilm1000" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <stop offset="0%" style={{stopColor:colors.white, stopOpacity:1}} />
        <stop offset="100%" style={{stopColor:colors.diamond, stopOpacity:1}} />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="26" fill="url(#gradFilm1000)" />
    <path d="M20 18H44V46H20V18Z" fill={colors.darkMatter} stroke={colors.gold} strokeWidth="1.5"/>
    <rect x="23" y="21" width="18" height="3" fill={colors.gold} rx="1"/>
    <rect x="23" y="26" width="18" height="3" fill={colors.gold} rx="1"/>
    <rect x="23" y="31" width="18" height="3" fill={colors.gold} rx="1"/>
    <rect x="23" y="36" width="18" height="3" fill={colors.gold} rx="1"/>
    <rect x="23" y="41" width="18" height="3" fill={colors.gold} rx="1"/>
    <path d="M24 14 L 32 6 L 40 14 L 36 18 L 28 18 Z" fill={colors.gold} stroke={colors.darkMatter} strokeWidth="1"/>
    <circle cx="32" cy="10" r="2" fill={colors.ruby}/>
    <LaurelWreath color={colors.gold} />
  </BaseBadge>
);
// Ara seviyeler için renk varyasyonları veya küçük eklemeler yapılabilir.
// Örneğin: LogMovie20, LogMovie40, LogMovie80, LogMovie150...900
export const LogMovie20 = () => <LogMovie10 />; // Şimdilik gümüş tekrar
export const LogMovie40 = () => <LogMovie10 />; // Şimdilik gümüş tekrar
export const LogMovie80 = () => <LogMovie10 />; // Şimdilik gümüş tekrar
export const LogMovie150 = () => <LogMovie100 />; // Şimdilik altın tekrar
export const LogMovie200 = () => <LogMovie100 />; // Şimdilik altın tekrar
export const LogMovie300 = () => <LogMovie100 />; // Şimdilik altın tekrar
export const LogMovie400 = () => <LogMovie100 />; // Şimdilik altın tekrar
export const LogMovie600 = () => <LogMovie500 />; // Şimdilik platin tekrar
export const LogMovie700 = () => <LogMovie500 />; // Şimdilik platin tekrar
export const LogMovie800 = () => <LogMovie500 />; // Şimdilik platin tekrar
export const LogMovie900 = () => <LogMovie500 />; // Şimdilik platin tekrar

// --- Dizi Bölümü Loglama ---
export const LogTvEpisode1 = () => (
  <BaseBadge bgColor={colors.bronze}>
    <rect x="16" y="20" width="32" height="20" rx="3" fill={colors.darkMatter} stroke={colors.white} strokeWidth="1.5"/>
    <rect x="20" y="24" width="24" height="12" fill={colors.accent} rx="1"/>
    <line x1="28" y1="42" x2="36" y2="42" stroke={colors.white} strokeWidth="2"/>
    <line x1="32" y1="42" x2="32" y2="46" stroke={colors.white} strokeWidth="2"/>
  </BaseBadge>
);
export const LogTvEpisode25 = () => (
  <BaseBadge bgColor={colors.silver}>
    <rect x="16" y="20" width="32" height="20" rx="3" fill={colors.darkMatter} stroke={colors.white} strokeWidth="1.5"/>
    <rect x="20" y="24" width="24" height="12" fill={colors.accent} rx="1"/>
    <line x1="28" y1="42" x2="36" y2="42" stroke={colors.white} strokeWidth="2"/>
    <line x1="32" y1="42" x2="32" y2="46" stroke={colors.white} strokeWidth="2"/>
    <Star x={32} y={16} color={colors.gold} />
  </BaseBadge>
);
// ... (35, 55 için benzer)
export const LogTvEpisode35 = () => <LogTvEpisode25 />;
export const LogTvEpisode55 = () => <LogTvEpisode25 />;
export const LogTvEpisode100 = () => (
  <BaseBadge bgColor={colors.gold}>
    <rect x="16" y="20" width="32" height="20" rx="3" fill={colors.darkMatter} stroke={colors.white} strokeWidth="1.5"/>
    <rect x="20" y="24" width="24" height="12" fill={colors.accent} rx="1"/>
    <line x1="28" y1="42" x2="36" y2="42" stroke={colors.white} strokeWidth="2"/>
    <line x1="32" y1="42" x2="32" y2="46" stroke={colors.white} strokeWidth="2"/>
    <Star x={32} y={14} color={colors.white} size={5}/>
    <LaurelWreath color={colors.darkMatter} />
  </BaseBadge>
);
// ... (120, 180, 250, 350, 450 için benzer)
export const LogTvEpisode120 = () => <LogTvEpisode100 />;
export const LogTvEpisode180 = () => <LogTvEpisode100 />;
export const LogTvEpisode250 = () => <LogTvEpisode100 />;
export const LogTvEpisode350 = () => <LogTvEpisode100 />;
export const LogTvEpisode450 = () => <LogTvEpisode100 />;
export const LogTvEpisode550 = () => ( // Platinum
  <BaseBadge bgColor={colors.platinum}>
    <rect x="16" y="20" width="32" height="20" rx="3" fill={colors.darkMatter} stroke={colors.white} strokeWidth="1.5"/>
    <rect x="20" y="24" width="24" height="12" fill={colors.accent} rx="1"/>
    <line x1="28" y1="42" x2="36" y2="42" stroke={colors.white} strokeWidth="2"/>
    <line x1="32" y1="42" x2="32" y2="46" stroke={colors.white} strokeWidth="2"/>
    <circle cx="32" cy="14" r="4" fill={colors.accent}/>
    <path d="M30 10 L 32 6 L 34 10 Z M 38 12 L 42 14 L 38 16 Z M 30 18 L 32 22 L 34 18 Z M 26 12 L 22 14 L 26 16 Z" fill={colors.white}/>
    <LaurelWreath color={colors.darkMatter} />
  </BaseBadge>
);
// ... (650, 750, 850, 950 için benzer)
export const LogTvEpisode650 = () => <LogTvEpisode550 />;
export const LogTvEpisode750 = () => <LogTvEpisode550 />;
export const LogTvEpisode850 = () => <LogTvEpisode550 />;
export const LogTvEpisode950 = () => <LogTvEpisode550 />;
export const LogTvEpisode1000 = () => ( // Diamond
  <BaseBadge bgColor={colors.diamond} strokeColor={colors.gold}>
     <defs>
      <radialGradient id="gradTV1000" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <stop offset="0%" style={{stopColor:colors.white, stopOpacity:1}} />
        <stop offset="100%" style={{stopColor:colors.diamond, stopOpacity:1}} />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="26" fill="url(#gradTV1000)" />
    <rect x="16" y="20" width="32" height="20" rx="3" fill={colors.darkMatter} stroke={colors.gold} strokeWidth="1.5"/>
    <rect x="20" y="24" width="24" height="12" fill={colors.sapphire} rx="1"/>
    <line x1="28" y1="42" x2="36" y2="42" stroke={colors.gold} strokeWidth="2"/>
    <line x1="32" y1="42" x2="32" y2="46" stroke={colors.gold} strokeWidth="2"/>
    <path d="M24 14 L 32 6 L 40 14 L 36 18 L 28 18 Z" fill={colors.gold} stroke={colors.darkMatter} strokeWidth="1"/>
    <circle cx="32" cy="10" r="2" fill={colors.sapphire}/>
     <LaurelWreath color={colors.gold} />
  </BaseBadge>
);

// --- Takip Etme ---
export const Following5 = () => (
  <BaseBadge bgColor={colors.bronze}>
    <circle cx="32" cy="26" r="8" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <path d="M20 46 C 20 36, 44 36, 44 46 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <path d="M44 28 L 50 28 L 50 34 L 44 34 M 47 28 L 47 34" stroke={colors.darkMatter} strokeWidth="1.5" fill="none"/>
  </BaseBadge>
);
export const Following15 = () => (
  <BaseBadge bgColor={colors.silver}>
    <circle cx="32" cy="26" r="7" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <path d="M22 44 C 22 35, 42 35, 42 44 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <path d="M46 28 L 52 28 L 52 34 L 46 34 M 49 28 L 49 34" stroke={colors.darkMatter} strokeWidth="1.5" fill="none"/>
    <path d="M18 28 L 12 28 L 12 34 L 18 34 M 15 28 L 15 34" stroke={colors.darkMatter} strokeWidth="1.5" fill="none"/>
  </BaseBadge>
);
export const Following30 = () => ( // Gold seviyesi gibi
  <BaseBadge bgColor={colors.gold}>
    <circle cx="32" cy="26" r="6" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <path d="M24 42 C 24 34, 40 34, 40 42 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <path d="M48 28 L 54 28 L 54 34 L 48 34 M 51 28 L 51 34" stroke={colors.darkMatter} strokeWidth="1.5" fill="none"/>
    <path d="M16 28 L 10 28 L 10 34 L 16 34 M 13 28 L 13 34" stroke={colors.darkMatter} strokeWidth="1.5" fill="none"/>
    <path d="M32 44 L 32 50 L 38 50 L 38 56 M 32 50 L 38 50" stroke={colors.darkMatter} strokeWidth="1.5" fill="none"/>
  </BaseBadge>
);
export const Following50 = () => <Following30 />; // Şimdilik Gold tekrar
export const Following75 = () => ( // Platinum seviyesi gibi
  <BaseBadge bgColor={colors.platinum}>
    <circle cx="32" cy="26" r="5" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <path d="M26 40 C 26 33, 38 33, 38 40 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    {/* Connections */}
    <line x1="32" y1="31" x2="18" y2="38" stroke={colors.darkMatter} strokeWidth="1" strokeDasharray="2 2"/>
    <line x1="32" y1="31" x2="46" y2="38" stroke={colors.darkMatter} strokeWidth="1" strokeDasharray="2 2"/>
    <line x1="32" y1="38" x2="32" y2="50" stroke={colors.darkMatter} strokeWidth="1" strokeDasharray="2 2"/>
    {/* Other Users */}
    <circle cx="18" cy="38" r="4" fill={colors.silver} stroke={colors.darkMatter} strokeWidth="1"/>
    <circle cx="46" cy="38" r="4" fill={colors.silver} stroke={colors.darkMatter} strokeWidth="1"/>
    <circle cx="32" cy="50" r="4" fill={colors.silver} stroke={colors.darkMatter} strokeWidth="1"/>
  </BaseBadge>
);

// --- Takipçi ---
export const Follower1 = () => (
  <BaseBadge bgColor={colors.bronze}>
    <circle cx="32" cy="26" r="8" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <path d="M20 46 C 20 36, 44 36, 44 46 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <circle cx="18" cy="38" r="4" fill={colors.accent} stroke={colors.darkMatter} strokeWidth="1"/>
    <path d="M14 48 C 14 44, 22 44, 22 48 Z" fill={colors.accent} stroke={colors.darkMatter} strokeWidth="1"/>
  </BaseBadge>
);
export const Follower5 = () => (
  <BaseBadge bgColor={colors.silver}>
    <circle cx="32" cy="26" r="7" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <path d="M22 44 C 22 35, 42 35, 42 44 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <circle cx="16" cy="38" r="4" fill={colors.accent} stroke={colors.darkMatter} strokeWidth="1"/>
    <path d="M12 48 C 12 44, 20 44, 20 48 Z" fill={colors.accent} stroke={colors.darkMatter} strokeWidth="1"/>
    <circle cx="48" cy="38" r="4" fill={colors.accent} stroke={colors.darkMatter} strokeWidth="1"/>
    <path d="M44 48 C 44 44, 52 44, 52 48 Z" fill={colors.accent} stroke={colors.darkMatter} strokeWidth="1"/>
  </BaseBadge>
);
// ... (Follower10, 25, 50, 100, 250, 500 için daha fazla takipçi, renk değişimi)
export const Follower10 = () => <Follower5 />;
export const Follower25 = () => <Follower5 />;
export const Follower50 = () => ( // Gold
  <BaseBadge bgColor={colors.gold}>
    <circle cx="32" cy="26" r="6" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <path d="M24 42 C 24 34, 40 34, 40 42 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    {/* Followers */}
    <circle cx="15" cy="35" r="3" fill={colors.accent} />
    <circle cx="49" cy="35" r="3" fill={colors.accent} />
    <circle cx="20" cy="50" r="3" fill={colors.accent} />
    <circle cx="44" cy="50" r="3" fill={colors.accent} />
    <circle cx="32" cy="55" r="3" fill={colors.accent} />
  </BaseBadge>
);
export const Follower100 = () => <Follower50 />;
export const Follower250 = () => <Follower50 />;
export const Follower500 = () => ( // Platinum
  <BaseBadge bgColor={colors.platinum}>
    <circle cx="32" cy="26" r="5" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <path d="M26 40 C 26 33, 38 33, 38 40 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    {/* Many Followers */}
    <circle cx="15" cy="35" r="3" fill={colors.accent} />
    <circle cx="49" cy="35" r="3" fill={colors.accent} />
    <circle cx="20" cy="50" r="3" fill={colors.accent} />
    <circle cx="44" cy="50" r="3" fill={colors.accent} />
    <circle cx="32" cy="55" r="3" fill={colors.accent} />
    <circle cx="25" cy="20" r="3" fill={colors.accent} />
    <circle cx="39" cy="20" r="3" fill={colors.accent} />
     <circle cx="12" cy="48" r="3" fill={colors.accent} />
     <circle cx="52" cy="48" r="3" fill={colors.accent} />
  </BaseBadge>
);
export const Follower1000 = () => ( // Diamond
  <BaseBadge bgColor={colors.diamond} strokeColor={colors.gold}>
    <defs>
      <radialGradient id="gradFollower1k" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <stop offset="0%" style={{stopColor:colors.white, stopOpacity:1}} />
        <stop offset="100%" style={{stopColor:colors.diamond, stopOpacity:1}} />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="26" fill="url(#gradFollower1k)" />
    <circle cx="32" cy="26" r="5" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <path d="M26 40 C 26 33, 38 33, 38 40 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    {/* Many Followers */}
    <circle cx="15" cy="35" r="2.5" fill={colors.gold} /> <circle cx="49" cy="35" r="2.5" fill={colors.gold} />
    <circle cx="20" cy="50" r="2.5" fill={colors.gold} /> <circle cx="44" cy="50" r="2.5" fill={colors.gold} />
    <circle cx="32" cy="55" r="2.5" fill={colors.gold} /> <circle cx="25" cy="20" r="2.5" fill={colors.gold} />
    <circle cx="39" cy="20" r="2.5" fill={colors.gold} /> <circle cx="12" cy="48" r="2.5" fill={colors.gold} />
    <circle cx="52" cy="48" r="2.5" fill={colors.gold} /> <circle cx="10" cy="30" r="2.5" fill={colors.gold} />
    <circle cx="54" cy="30" r="2.5" fill={colors.gold} /> <circle cx="32" cy="12" r="2.5" fill={colors.gold} />
    <path d="M24 14 L 32 6 L 40 14 L 36 18 L 28 18 Z" fill={colors.gold} stroke={colors.darkMatter} strokeWidth="1"/>
    <circle cx="32" cy="10" r="2" fill={colors.ruby}/>
  </BaseBadge>
);

// --- Liste Oluşturma ---
export const List1 = () => (
  <BaseBadge bgColor={colors.bronze}>
    <rect x="18" y="18" width="28" height="32" rx="3" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <line x1="24" y1="26" x2="40" y2="26" stroke={colors.grey} strokeWidth="2"/>
    <line x1="24" y1="32" x2="40" y2="32" stroke={colors.grey} strokeWidth="2"/>
    <line x1="24" y1="38" x2="35" y2="38" stroke={colors.grey} strokeWidth="2"/>
  </BaseBadge>
);
export const List3 = () => (
  <BaseBadge bgColor={colors.silver}>
    <rect x="18" y="18" width="28" height="32" rx="3" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <line x1="24" y1="26" x2="40" y2="26" stroke={colors.accent} strokeWidth="2"/>
    <line x1="24" y1="32" x2="40" y2="32" stroke={colors.accent} strokeWidth="2"/>
    <line x1="24" y1="38" x2="35" y2="38" stroke={colors.accent} strokeWidth="2"/>
    <Star x={44} y={46} color={colors.gold} size={3}/>
  </BaseBadge>
);
export const List5 = () => (
  <BaseBadge bgColor={colors.gold}>
    <rect x="18" y="16" width="28" height="36" rx="3" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <line x1="24" y1="24" x2="40" y2="24" stroke={colors.accent} strokeWidth="2"/>
    <line x1="24" y1="30" x2="40" y2="30" stroke={colors.accent} strokeWidth="2"/>
    <line x1="24" y1="36" x2="40" y2="36" stroke={colors.accent} strokeWidth="2"/>
    <line x1="24" y1="42" x2="36" y2="42" stroke={colors.accent} strokeWidth="2"/>
    <Star x={32} y={12} color={colors.white} size={4}/>
  </BaseBadge>
);
export const List10 = () => (
  <BaseBadge bgColor={colors.platinum}>
    <rect x="18" y="16" width="28" height="36" rx="3" fill={colors.darkMatter} stroke={colors.white} strokeWidth="1.5"/>
    <line x1="24" y1="24" x2="40" y2="24" stroke={colors.gold} strokeWidth="2"/>
    <line x1="24" y1="30" x2="40" y2="30" stroke={colors.gold} strokeWidth="2"/>
    <line x1="24" y1="36" x2="40" y2="36" stroke={colors.gold} strokeWidth="2"/>
    <line x1="24" y1="42" x2="36" y2="42" stroke={colors.gold} strokeWidth="2"/>
    <Star x={32} y={12} color={colors.gold} size={5}/>
    <Star x={16} y={48} color={colors.gold} size={3}/>
    <Star x={48} y={48} color={colors.gold} size={3}/>
  </BaseBadge>
);

// --- İzleme Listesi ---
export const Watchlist10 = () => (
  <BaseBadge bgColor={colors.bronze}>
    <circle cx="32" cy="32" r="14" stroke={colors.white} strokeWidth="2"/>
    <line x1="32" y1="22" x2="32" y2="32" stroke={colors.white} strokeWidth="2"/>
    <line x1="32" y1="32" x2="40" y2="36" stroke={colors.white} strokeWidth="2"/>
  </BaseBadge>
);
export const Watchlist20 = () => (
  <BaseBadge bgColor={colors.silver}>
    <circle cx="32" cy="32" r="14" stroke={colors.white} strokeWidth="2.5"/>
    <line x1="32" y1="22" x2="32" y2="32" stroke={colors.white} strokeWidth="2.5"/>
    <line x1="32" y1="32" x2="40" y2="36" stroke={colors.white} strokeWidth="2.5"/>
    <Star x={46} y={20} color={colors.gold} size={3}/>
  </BaseBadge>
);
export const Watchlist50 = () => (
  <BaseBadge bgColor={colors.gold}>
    <circle cx="32" cy="32" r="14" stroke={colors.darkMatter} strokeWidth="2.5" fill={colors.white}/>
    <line x1="32" y1="20" x2="32" y2="32" stroke={colors.accent} strokeWidth="3"/>
    <line x1="32" y1="32" x2="42" y2="36" stroke={colors.accent} strokeWidth="3"/>
    <Star x={32} y={12} color={colors.white} size={4}/>
  </BaseBadge>
);
export const Watchlist100 = () => (
  <BaseBadge bgColor={colors.platinum}>
    <circle cx="32" cy="32" r="14" stroke={colors.darkMatter} strokeWidth="3" fill={colors.white}/>
    <line x1="32" y1="18" x2="32" y2="32" stroke={colors.accentDark} strokeWidth="3.5"/>
    <line x1="32" y1="32" x2="44" y2="36" stroke={colors.accentDark} strokeWidth="3.5"/>
    <Star x={32} y={10} color={colors.gold} size={5}/>
    <Star x={18} y={48} color={colors.gold} size={3}/>
    <Star x={46} y={48} color={colors.gold} size={3}/>
  </BaseBadge>
);

// --- Yönetmen ---
export const Director3 = () => ( // Bronze
  <BaseBadge bgColor={colors.bronze}>
    {/* Megafon */}
    <path d="M 18 24 L 28 20 L 46 20 L 46 44 L 28 44 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <circle cx="46" cy="32" r="4" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
  </BaseBadge>
);
export const Director10 = () => ( // Gold
  <BaseBadge bgColor={colors.gold}>
    <path d="M 16 22 L 28 18 L 48 18 L 48 46 L 28 46 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="2"/>
    <circle cx="48" cy="32" r="5" fill={colors.white} stroke={colors.darkMatter} strokeWidth="2"/>
    <Star x={32} y={12} color={colors.white} size={4}/>
    <path d="M 24 50 L 40 50" stroke={colors.darkMatter} strokeWidth="2"/>
  </BaseBadge>
);
export const Director4 = () => <Director3 />; // Ara seviye
export const Director6 = () => <Director3 />; // Ara seviye

// --- Bu Yıl ---
export const ThisYear3 = () => ( // Bronze
  <BaseBadge bgColor={colors.bronze}>
    {/* Calendar */}
    <rect x="18" y="20" width="28" height="28" rx="3" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <rect x="18" y="20" width="28" height="8" rx="3" fill={colors.accent}/>
    <circle cx="25" cy="24" r="1.5" fill={colors.white}/>
    <circle cx="39" cy="24" r="1.5" fill={colors.white}/>
    <text x="32" y="42" textAnchor="middle" fontSize="14" fill={colors.darkMatter} fontWeight="bold">3</text>
  </BaseBadge>
);
export const ThisYear10 = () => ( // Gold
  <BaseBadge bgColor={colors.gold}>
    <rect x="18" y="20" width="28" height="28" rx="3" fill={colors.white} stroke={colors.darkMatter} strokeWidth="2"/>
    <rect x="18" y="20" width="28" height="8" rx="3" fill={colors.accentDark}/>
    <circle cx="25" cy="24" r="1.5" fill={colors.white}/>
    <circle cx="39" cy="24" r="1.5" fill={colors.white}/>
    <text x="32" y="42" textAnchor="middle" fontSize="14" fill={colors.darkMatter} fontWeight="bold">10</text>
     <Star x={32} y={12} color={colors.white} size={4}/>
  </BaseBadge>
);
export const ThisYear5 = () => <ThisYear3 />; // Ara seviye

// --- Dizi Bitirici ---
export const CompleteSeries = () => ( // Gold
  <BaseBadge bgColor={colors.gold}>
    <rect x="16" y="20" width="32" height="20" rx="3" fill={colors.darkMatter} stroke={colors.white} strokeWidth="1.5"/>
    <rect x="20" y="24" width="24" height="12" fill={colors.green} rx="1"/> {/* Yeşil ekran */}
    <line x1="28" y1="42" x2="36" y2="42" stroke={colors.white} strokeWidth="2"/>
    <line x1="32" y1="42" x2="32" y2="46" stroke={colors.white} strokeWidth="2"/>
    {/* Kupa */}
    <path d="M 24 48 C 24 54, 40 54, 40 48 L 40 44 L 24 44 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <path d="M 28 44 L 36 44" stroke={colors.darkMatter} strokeWidth="1.5"/>
    <path d="M 22 46 A 4 4 0 0 1 22 50" stroke={colors.darkMatter} strokeWidth="1.5" fill="none"/>
    <path d="M 42 46 A 4 4 0 0 0 42 50" stroke={colors.darkMatter} strokeWidth="1.5" fill="none"/>
  </BaseBadge>
);

// --- Tür Maratonları ---
// Korku (Örnek)
export const HorrorMarathon5 = () => ( // Bronze
  <BaseBadge bgColor={colors.bronze}>
    {/* Ghost Icon */}
    <path d="M 24 48 Q 32 54 40 48 L 42 30 Q 32 36 22 30 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <circle cx="28" cy="34" r="2" fill={colors.darkMatter}/>
    <circle cx="36" cy="34" r="2" fill={colors.darkMatter}/>
    <text x="32" y="18" textAnchor="middle" fontSize="12" fill={colors.white} fontWeight="bold">5</text>
  </BaseBadge>
);
export const HorrorMarathon20 = () => ( // Gold
  <BaseBadge bgColor={colors.gold}>
    <path d="M 24 48 Q 32 54 40 48 L 42 30 Q 32 36 22 30 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="2"/>
    <circle cx="28" cy="34" r="2" fill={colors.red}/>
    <circle cx="36" cy="34" r="2" fill={colors.red}/>
    <text x="32" y="18" textAnchor="middle" fontSize="14" fill={colors.darkMatter} fontWeight="bold">20</text>
    <Star x={18} y={24} color={colors.red} size={3}/>
    <Star x={46} y={24} color={colors.red} size={3}/>
  </BaseBadge>
);
export const HorrorMarathon10 = () => <HorrorMarathon5 />; // Ara seviye
// Belgesel (Örnek)
export const DocuMarathon3 = () => ( // Bronze
  <BaseBadge bgColor={colors.bronze}>
    {/* Globe Icon */}
    <circle cx="32" cy="32" r="14" fill={colors.sapphire} stroke={colors.white} strokeWidth="1.5"/>
    <path d="M 32 18 Q 40 24 46 32 Q 40 40 32 46 Q 24 40 18 32 Q 24 24 32 18" stroke={colors.white} strokeWidth="1" fill="none"/>
    <line x1="18" y1="32" x2="46" y2="32" stroke={colors.white} strokeWidth="1"/>
    <text x="32" y="54" textAnchor="middle" fontSize="12" fill={colors.white} fontWeight="bold">3</text>
  </BaseBadge>
);
export const DocuMarathon10 = () => ( // Gold
  <BaseBadge bgColor={colors.gold}>
    <circle cx="32" cy="32" r="14" fill={colors.sapphire} stroke={colors.white} strokeWidth="2"/>
    <path d="M 32 18 Q 40 24 46 32 Q 40 40 32 46 Q 24 40 18 32 Q 24 24 32 18" stroke={colors.white} strokeWidth="1.5" fill="none"/>
    <line x1="18" y1="32" x2="46" y2="32" stroke={colors.white} strokeWidth="1.5"/>
    <text x="32" y="54" textAnchor="middle" fontSize="14" fill={colors.darkMatter} fontWeight="bold">10</text>
    <Star x={32} y={14} color={colors.white} size={4}/>
  </BaseBadge>
);
export const DocuMarathon5 = () => <DocuMarathon3 />; // Ara seviye

// --- Farklı Tür Kaşifi ---
export const GenreExplorer3 = () => ( // Bronze
  <BaseBadge bgColor={colors.bronze}>
    {/* Compass Rose */}
    <path d="M 32 18 L 36 30 L 46 32 L 36 34 L 32 46 L 28 34 L 18 32 L 28 30 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <circle cx="32" cy="32" r="3" fill={colors.accent}/>
  </BaseBadge>
);
export const GenreExplorer10 = () => ( // Gold
  <BaseBadge bgColor={colors.gold}>
    <path d="M 32 16 L 37 29 L 50 32 L 37 35 L 32 48 L 27 35 L 14 32 L 27 29 Z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="2"/>
    <circle cx="32" cy="32" r="4" fill={colors.accentDark}/>
    <Star x={32} y={10} color={colors.white} size={4}/>
  </BaseBadge>
);
export const GenreExplorer5 = () => <GenreExplorer3 />; // Ara seviye

// --- Beğeni ---
export const Like1 = () => (
  <BaseBadge bgColor={colors.bronze}>
    <path d="M32 48 L18 34 C14 30, 18 20, 32 28 C 46 20, 50 30, 46 34 Z" fill={colors.ruby} stroke={colors.white} strokeWidth="1.5"/>
  </BaseBadge>
);
export const Like10 = () => (
  <BaseBadge bgColor={colors.silver}>
    <path d="M32 48 L18 34 C14 30, 18 20, 32 28 C 46 20, 50 30, 46 34 Z" fill={colors.ruby} stroke={colors.white} strokeWidth="2"/>
    <Star x={46} y={24} color={colors.gold} size={3}/>
  </BaseBadge>
);
export const Like100 = () => (
  <BaseBadge bgColor={colors.gold}>
    <path d="M32 48 L18 34 C14 30, 18 20, 32 28 C 46 20, 50 30, 46 34 Z" fill={colors.ruby} stroke={colors.white} strokeWidth="2.5"/>
    <Star x={32} y={14} color={colors.white} size={5}/>
    <circle cx="48" cy="24" r="3" fill={colors.white} opacity="0.7"/>
    <circle cx="16" cy="24" r="3" fill={colors.white} opacity="0.7"/>
  </BaseBadge>
);
export const Like5 = () => <Like1 />;
export const Like25 = () => <Like10 />;
export const Like250 = () => <Like100 />;

// --- Loglama Serisi ---
export const Streak10 = () => ( // Bronze
  <BaseBadge bgColor={colors.bronze}>
    {/* Flame Icon */}
    <path d="M 32 18 C 40 24, 40 34, 32 46 C 24 34, 24 24, 32 18 Z M 30 34 Q 32 38 34 34" fill={colors.accent} stroke={colors.white} strokeWidth="1.5"/>
    <text x="32" y="56" textAnchor="middle" fontSize="10" fill={colors.white}>10 Gün</text>
  </BaseBadge>
);
export const Streak20 = () => ( // Silver
  <BaseBadge bgColor={colors.silver}>
    <path d="M 32 16 C 42 24, 42 36, 32 48 C 22 36, 22 24, 32 16 Z M 28 36 Q 32 42 36 36" fill={colors.accentDark} stroke={colors.white} strokeWidth="2"/>
    <text x="32" y="58" textAnchor="middle" fontSize="10" fill={colors.darkMatter}>20 Gün</text>
    <Star x={46} y={22} color={colors.gold} size={3}/>
  </BaseBadge>
);

// --- Özel Tarih ---
export const NewYearList = () => ( // Special Color
  <BaseBadge bgColor={colors.sapphire}>
    {/* Fireworks */}
    <line x1="32" y1="32" x2="32" y2="20" stroke={colors.gold} strokeWidth="2"/>
    <line x1="32" y1="32" x2="42" y2="26" stroke={colors.gold} strokeWidth="2"/>
    <line x1="32" y1="32" x2="42" y2="38" stroke={colors.gold} strokeWidth="2"/>
    <line x1="32" y1="32" x2="32" y2="44" stroke={colors.gold} strokeWidth="2"/>
    <line x1="32" y1="32" x2="22" y2="38" stroke={colors.gold} strokeWidth="2"/>
    <line x1="32" y1="32" x2="22" y2="26" stroke={colors.gold} strokeWidth="2"/>
    <circle cx="32" cy="32" r="3" fill={colors.ruby}/>
    <text x="32" y="54" textAnchor="middle" fontSize="10" fill={colors.white}>1 Ocak</text>
  </BaseBadge>
);
export const AnniversaryList = () => ( // Special Color
  <BaseBadge bgColor={colors.emerald}>
    {/* Cake/Present */}
    <rect x="22" y="30" width="20" height="16" rx="2" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <rect x="20" y="26" width="24" height="4" rx="1" fill={colors.ruby} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <line x1="32" y1="26" x2="32" y2="20" stroke={colors.ruby} strokeWidth="2"/>
    <path d="M 30 20 A 2 2 0 0 1 34 20" fill={colors.yellow} stroke={colors.darkMatter} strokeWidth="1.5"/>
    <text x="32" y="54" textAnchor="middle" fontSize="10" fill={colors.white}>23 Nisan</text>
  </BaseBadge>
);

// --- Eski Genel Başarımlar (Yeni ikonlara yönlendirme veya basit ikonlar) ---
export const FirstLog = LogMovie1; // İlk film logu ile aynı olabilir
export const FirstReview = () => (
  <BaseBadge bgColor={colors.bronze}>
    <path d="M20 20h24v20h-12l-6 6v-6h-6z" fill={colors.white} stroke={colors.darkMatter} strokeWidth="1.5" />
    <path d="M26 26 L 38 26 M 26 32 L 34 32" stroke={colors.darkMatter} strokeWidth="1.5" fill="none"/>
  </BaseBadge>
);

// İkonları ID ile eşleştiren nesne (Badge.jsx'te kullanılacak)
const icons = {
  LogMovie1, LogMovie10, LogMovie20, LogMovie40, LogMovie80, LogMovie100, LogMovie150, LogMovie200, LogMovie300, LogMovie400, LogMovie500, LogMovie600, LogMovie700, LogMovie800, LogMovie900, LogMovie1000,
  LogTvEpisode1, LogTvEpisode25, LogTvEpisode35, LogTvEpisode55, LogTvEpisode100, LogTvEpisode120, LogTvEpisode180, LogTvEpisode250, LogTvEpisode350, LogTvEpisode450, LogTvEpisode550, LogTvEpisode650, LogTvEpisode750, LogTvEpisode850, LogTvEpisode950, LogTvEpisode1000,
  Following5, Following15, Following30, Following50, Following75,
  Follower1, Follower5, Follower10, Follower25, Follower50, Follower100, Follower250, Follower500, Follower1000,
  List1, List3, List5, List10,
  Watchlist10, Watchlist20, Watchlist50, Watchlist100,
  Director3, Director4, Director6, Director10,
  ThisYear3, ThisYear5, ThisYear10,
  CompleteSeries,
  HorrorMarathon5, HorrorMarathon10, HorrorMarathon20,
  DocuMarathon3, DocuMarathon5, DocuMarathon10,
  GenreExplorer3, GenreExplorer5, GenreExplorer10,
  Like1, Like5, Like10, Like25, Like100, Like250,
  Streak10, Streak20,
  NewYearList, AnniversaryList,
  FirstLog, FirstReview,
  // Eski ikon adları (varsa ve yeni ID'lerle eşleşiyorsa):
  FIRST_LOG: FirstLog,
  TEN_LOGS: LogMovie10, // Veya LogTvEpisode10 gibi, hangisi uygunsa
  FIRST_REVIEW: FirstReview,
  FIRST_LIST: List1,
  SOCIAL_BUTTERFLY: Following5,
};

export default icons;
