// backend/config/achievements.js

// Başarım ID'leri ve tanımları
// İkonlar frontend/src/components/AchievementIcons.jsx dosyasından gelecek.
// Burada 'icon' alanı, ilgili ikon bileşeninin adını temsil eder (string olarak).
// Badge.jsx bu string'i kullanarak doğru bileşeni import edecek.

const achievementDefinitions = {
    // --- Film Loglama Başarımları ---
    LOG_MOVIE_1:    { id: "LOG_MOVIE_1",    name: "İlk Film",          description: "İlk filmini başarıyla logladın!",         icon: "LogMovie1",    criteria: { type: "movieLogCount", value: 1 } },
    LOG_MOVIE_10:   { id: "LOG_MOVIE_10",   name: "Film Meraklısı",    description: "10 film logladın!",                     icon: "LogMovie10",   criteria: { type: "movieLogCount", value: 10 } },
    LOG_MOVIE_20:   { id: "LOG_MOVIE_20",   name: "Film Koleksiyoneri", description: "20 film logladın!",                     icon: "LogMovie20",   criteria: { type: "movieLogCount", value: 20 } },
    LOG_MOVIE_40:   { id: "LOG_MOVIE_40",   name: "Sinefil",           description: "40 film logladın!",                     icon: "LogMovie40",   criteria: { type: "movieLogCount", value: 40 } },
    LOG_MOVIE_80:   { id: "LOG_MOVIE_80",   name: "Film Gurusu",       description: "80 film logladın!",                     icon: "LogMovie80",   criteria: { type: "movieLogCount", value: 80 } },
    LOG_MOVIE_100:  { id: "LOG_MOVIE_100",  name: "Yüzler Kulübü (Film)", description: "100 film logladın!",                    icon: "LogMovie100",  criteria: { type: "movieLogCount", value: 100 } },
    LOG_MOVIE_150:  { id: "LOG_MOVIE_150",  name: "Film Arşivcisi",    description: "150 film logladın!",                    icon: "LogMovie150",  criteria: { type: "movieLogCount", value: 150 } },
    LOG_MOVIE_200:  { id: "LOG_MOVIE_200",  name: "Film Kütüphanesi",  description: "200 film logladın!",                    icon: "LogMovie200",  criteria: { type: "movieLogCount", value: 200 } },
    LOG_MOVIE_300:  { id: "LOG_MOVIE_300",  name: "Film Ansiklopedisi", description: "300 film logladın!",                    icon: "LogMovie300",  criteria: { type: "movieLogCount", value: 300 } },
    LOG_MOVIE_400:  { id: "LOG_MOVIE_400",  name: "Film Kaşifi",       description: "400 film logladın!",                    icon: "LogMovie400",  criteria: { type: "movieLogCount", value: 400 } },
    LOG_MOVIE_500:  { id: "LOG_MOVIE_500",  name: "Beş Yüz Film",      description: "500 film logladın! İnanılmaz!",         icon: "LogMovie500",  criteria: { type: "movieLogCount", value: 500 } },
    LOG_MOVIE_600:  { id: "LOG_MOVIE_600",  name: "Film Maratoncusu",  description: "600 film logladın!",                    icon: "LogMovie600",  criteria: { type: "movieLogCount", value: 600 } },
    LOG_MOVIE_700:  { id: "LOG_MOVIE_700",  name: "Film Tutkunu",      description: "700 film logladın!",                    icon: "LogMovie700",  criteria: { type: "movieLogCount", value: 700 } },
    LOG_MOVIE_800:  { id: "LOG_MOVIE_800",  name: "Film Efsanesi",     description: "800 film logladın!",                    icon: "LogMovie800",  criteria: { type: "movieLogCount", value: 800 } },
    LOG_MOVIE_900:  { id: "LOG_MOVIE_900",  name: "Film Devi",         description: "900 film logladın!",                    icon: "LogMovie900",  criteria: { type: "movieLogCount", value: 900 } },
    LOG_MOVIE_1000: { id: "LOG_MOVIE_1000", name: "Bin Film!",         description: "1000 film logladın! Sen bir efsanesin!", icon: "LogMovie1000", criteria: { type: "movieLogCount", value: 1000 } },

    // --- Dizi Bölümü Loglama Başarımları ---
    LOG_TV_EPISODE_1:    { id: "LOG_TV_EPISODE_1",    name: "İlk Bölüm",           description: "İlk dizi bölümünü logladın!",         icon: "LogTvEpisode1",    criteria: { type: "tvEpisodeLogCount", value: 1 } }, // Kriter tipi değişti
    LOG_TV_EPISODE_25:   { id: "LOG_TV_EPISODE_25",   name: "Dizi İzleyicisi",     description: "25 dizi bölümü logladın!",            icon: "LogTvEpisode25",   criteria: { type: "tvEpisodeLogCount", value: 25 } },
    LOG_TV_EPISODE_35:   { id: "LOG_TV_EPISODE_35",   name: "Sezon Avcısı",        description: "35 dizi bölümü logladın!",            icon: "LogTvEpisode35",   criteria: { type: "tvEpisodeLogCount", value: 35 } },
    LOG_TV_EPISODE_55:   { id: "LOG_TV_EPISODE_55",   name: "Dizi Maratonu Başlıyor", description: "55 dizi bölümü logladın!",            icon: "LogTvEpisode55",   criteria: { type: "tvEpisodeLogCount", value: 55 } },
    LOG_TV_EPISODE_100:  { id: "LOG_TV_EPISODE_100",  name: "Yüzler Kulübü (Dizi)", description: "100 dizi bölümü logladın!",           icon: "LogTvEpisode100",  criteria: { type: "tvEpisodeLogCount", value: 100 } },
    LOG_TV_EPISODE_120:  { id: "LOG_TV_EPISODE_120",  name: "Bölüm Canavarı",      description: "120 dizi bölümü logladın!",           icon: "LogTvEpisode120",  criteria: { type: "tvEpisodeLogCount", value: 120 } },
    LOG_TV_EPISODE_180:  { id: "LOG_TV_EPISODE_180",  name: "Dizi Bağımlısı",      description: "180 dizi bölümü logladın!",           icon: "LogTvEpisode180",  criteria: { type: "tvEpisodeLogCount", value: 180 } },
    LOG_TV_EPISODE_250:  { id: "LOG_TV_EPISODE_250",  name: "Ekran Kurdu",         description: "250 dizi bölümü logladın!",           icon: "LogTvEpisode250",  criteria: { type: "tvEpisodeLogCount", value: 250 } },
    LOG_TV_EPISODE_350:  { id: "LOG_TV_EPISODE_350",  name: "Dizi Profesörü",      description: "350 dizi bölümü logladın!",           icon: "LogTvEpisode350",  criteria: { type: "tvEpisodeLogCount", value: 350 } },
    LOG_TV_EPISODE_450:  { id: "LOG_TV_EPISODE_450",  name: "Dizi Ansiklopedisi",  description: "450 dizi bölümü logladın!",           icon: "LogTvEpisode450",  criteria: { type: "tvEpisodeLogCount", value: 450 } },
    LOG_TV_EPISODE_550:  { id: "LOG_TV_EPISODE_550",  name: "Dizi İmparatoru",     description: "550 dizi bölümü logladın!",           icon: "LogTvEpisode550",  criteria: { type: "tvEpisodeLogCount", value: 550 } },
    LOG_TV_EPISODE_650:  { id: "LOG_TV_EPISODE_650",  name: "Dizi Devi",           description: "650 dizi bölümü logladın!",           icon: "LogTvEpisode650",  criteria: { type: "tvEpisodeLogCount", value: 650 } },
    LOG_TV_EPISODE_750:  { id: "LOG_TV_EPISODE_750",  name: "Dizi Efsanesi",       description: "750 dizi bölümü logladın!",           icon: "LogTvEpisode750",  criteria: { type: "tvEpisodeLogCount", value: 750 } },
    LOG_TV_EPISODE_850:  { id: "LOG_TV_EPISODE_850",  name: "Dizi Tutkunu",        description: "850 dizi bölümü logladın!",           icon: "LogTvEpisode850",  criteria: { type: "tvEpisodeLogCount", value: 850 } },
    LOG_TV_EPISODE_950:  { id: "LOG_TV_EPISODE_950",  name: "Dizi Maratoncusu",    description: "950 dizi bölümü logladın!",           icon: "LogTvEpisode950",  criteria: { type: "tvEpisodeLogCount", value: 950 } },
    LOG_TV_EPISODE_1000: { id: "LOG_TV_EPISODE_1000", name: "Bin Bölüm!",          description: "1000 dizi bölümü logladın! Saygı!", icon: "LogTvEpisode1000", criteria: { type: "tvEpisodeLogCount", value: 1000 } },

    // --- Takip Etme Başarımları ---
    FOLLOWING_5:   { id: "FOLLOWING_5",   name: "Arkadaş Canlısı", description: "5 kişiyi takip ettin!",   icon: "Following5",   criteria: { type: "followingCount", value: 5 } },
    FOLLOWING_15:  { id: "FOLLOWING_15",  name: "Sosyal Ağ",       description: "15 kişiyi takip ettin!",  icon: "Following15",  criteria: { type: "followingCount", value: 15 } },
    FOLLOWING_30:  { id: "FOLLOWING_30",  name: "Popüler",         description: "30 kişiyi takip ettin!",  icon: "Following30",  criteria: { type: "followingCount", value: 30 } },
    FOLLOWING_50:  { id: "FOLLOWING_50",  name: "Network Uzmanı",  description: "50 kişiyi takip ettin!",  icon: "Following50",  criteria: { type: "followingCount", value: 50 } },
    FOLLOWING_75:  { id: "FOLLOWING_75",  name: "Topluluk Lideri", description: "75 kişiyi takip ettin!",  icon: "Following75",  criteria: { type: "followingCount", value: 75 } },

    // --- Takipçi Başarımları ---
    FOLLOWER_1:    { id: "FOLLOWER_1",    name: "İlk Takipçi",      description: "İlk takipçini kazandın!",         icon: "Follower1",    criteria: { type: "followerCount", value: 1 } },
    FOLLOWER_5:    { id: "FOLLOWER_5",    name: "Küçük Çevre",      description: "5 takipçi kazandın!",             icon: "Follower5",    criteria: { type: "followerCount", value: 5 } },
    FOLLOWER_10:   { id: "FOLLOWER_10",   name: "Tanınan Yüz",      description: "10 takipçi kazandın!",            icon: "Follower10",   criteria: { type: "followerCount", value: 10 } },
    FOLLOWER_25:   { id: "FOLLOWER_25",   name: "Topluluk Üyesi",   description: "25 takipçi kazandın!",            icon: "Follower25",   criteria: { type: "followerCount", value: 25 } },
    FOLLOWER_50:   { id: "FOLLOWER_50",   name: "Fenomen Adayı",    description: "50 takipçi kazandın!",            icon: "Follower50",   criteria: { type: "followerCount", value: 50 } },
    FOLLOWER_100:  { id: "FOLLOWER_100",  name: "Yüz Takipçi!",     description: "100 takipçiye ulaştın!",          icon: "Follower100",  criteria: { type: "followerCount", value: 100 } },
    FOLLOWER_250:  { id: "FOLLOWER_250",  name: "İlgi Odağı",       description: "250 takipçiye ulaştın!",          icon: "Follower250",  criteria: { type: "followerCount", value: 250 } },
    FOLLOWER_500:  { id: "FOLLOWER_500",  name: "Yarım Bin Takipçi", description: "500 takipçiye ulaştın! Vay canına!", icon: "Follower500",  criteria: { type: "followerCount", value: 500 } },
    FOLLOWER_1000: { id: "FOLLOWER_1000", name: "Bin Takipçi!",     description: "1000 takipçiye ulaştın! Yıldızsın!", icon: "Follower1000", criteria: { type: "followerCount", value: 1000 } },

    // --- Liste Oluşturma Başarımları ---
    LIST_1:  { id: "LIST_1",  name: "İlk Liste",       description: "İlk listeni oluşturdun!",        icon: "List1",  criteria: { type: "listCount", value: 1 } },
    LIST_3:  { id: "LIST_3",  name: "Liste Uzmanı",    description: "3 liste oluşturdun!",            icon: "List3",  criteria: { type: "listCount", value: 3 } },
    LIST_5:  { id: "LIST_5",  name: "Koleksiyoncu",    description: "5 liste oluşturdun!",            icon: "List5",  criteria: { type: "listCount", value: 5 } },
    LIST_10: { id: "LIST_10", name: "Liste Gurusu",    description: "10 liste oluşturdun!",           icon: "List10", criteria: { type: "listCount", value: 10 } },

    // --- İzleme Listesi Başarımları ---
    WATCHLIST_10:  { id: "WATCHLIST_10",  name: "Planlayıcı",      description: "İzleme listene 10 öğe ekledin!", icon: "Watchlist10",  criteria: { type: "watchlistCount", value: 10 } },
    WATCHLIST_20:  { id: "WATCHLIST_20",  name: "Geleceğe Yatırım", description: "İzleme listene 20 öğe ekledin!", icon: "Watchlist20",  criteria: { type: "watchlistCount", value: 20 } },
    WATCHLIST_50:  { id: "WATCHLIST_50",  name: "Bekleme Odası",   description: "İzleme listene 50 öğe ekledin!", icon: "Watchlist50",  criteria: { type: "watchlistCount", value: 50 } },
    WATCHLIST_100: { id: "WATCHLIST_100", name: "Sabırsız İzleyici", description: "İzleme listene 100 öğe ekledin!",icon: "Watchlist100", criteria: { type: "watchlistCount", value: 100 } },

    // --- Yönetmen Başarımları ---
    DIRECTOR_3:  { id: "DIRECTOR_3",  name: "Yönetmen Takipçisi", description: "Aynı yönetmenden 3 film izledin!", icon: "Director3",  criteria: { type: "sameDirectorCount", value: 3 } }, // Kriter tipi değişti
    DIRECTOR_4:  { id: "DIRECTOR_4",  name: "Yönetmen Hayranı",   description: "Aynı yönetmenden 4 film izledin!", icon: "Director4",  criteria: { type: "sameDirectorCount", value: 4 } },
    DIRECTOR_6:  { id: "DIRECTOR_6",  name: "Yönetmen Uzmanı",    description: "Aynı yönetmenden 6 film izledin!", icon: "Director6",  criteria: { type: "sameDirectorCount", value: 6 } },
    DIRECTOR_10: { id: "DIRECTOR_10", name: "Yönetmen Koleksiyoneri", description: "Aynı yönetmenden 10 film izledin!", icon: "Director10", criteria: { type: "sameDirectorCount", value: 10 } },

    // --- Yıl Özel Başarımları ---
    THIS_YEAR_3:  { id: "THIS_YEAR_3",  name: "Güncel İzleyici", description: "Bu yıl çıkan 3 filmi logladın!", icon: "ThisYear3",  criteria: { type: "thisYearMovieLogCount", value: 3 } }, // Kriter tipi değişti
    THIS_YEAR_5:  { id: "THIS_YEAR_5",  name: "Trend Takipçisi", description: "Bu yıl çıkan 5 filmi logladın!", icon: "ThisYear5",  criteria: { type: "thisYearMovieLogCount", value: 5 } },
    THIS_YEAR_10: { id: "THIS_YEAR_10", name: "Yılın Nabzı",     description: "Bu yıl çıkan 10 filmi logladın!", icon: "ThisYear10", criteria: { type: "thisYearMovieLogCount", value: 10 } },

    // --- Dizi Tamamlama Başarımları ---
    COMPLETE_SERIES: { id: "COMPLETE_SERIES", name: "Dizi Bitirici", description: "Bir dizinin tüm sezonlarını logladın!", icon: "CompleteSeries", criteria: { type: "completedSeriesCount", value: 1 } }, // Kriter tipi değişti

    // --- Tür Maratonu Başarımları ---
    HORROR_MARATHON_5:  { id: "HORROR_MARATHON_5",  name: "Korku Gecesi",    description: "5 korku filmi logladın!", icon: "HorrorMarathon5",  criteria: { type: "genreLogCount", genreId: 27, value: 5 } }, // Kriter tipi ve genreId eklendi
    HORROR_MARATHON_10: { id: "HORROR_MARATHON_10", name: "Korku Maratonu",  description: "10 korku filmi logladın!", icon: "HorrorMarathon10", criteria: { type: "genreLogCount", genreId: 27, value: 10 } },
    HORROR_MARATHON_20: { id: "HORROR_MARATHON_20", name: "Korku Ustası",    description: "20 korku filmi logladın!", icon: "HorrorMarathon20", criteria: { type: "genreLogCount", genreId: 27, value: 20 } },
    DOCU_MARATHON_3:    { id: "DOCU_MARATHON_3",    name: "Belgesel Meraklısı", description: "3 belgesel logladın!",   icon: "DocuMarathon3",    criteria: { type: "genreLogCount", genreId: 99, value: 3 } },
    DOCU_MARATHON_5:    { id: "DOCU_MARATHON_5",    name: "Belgesel Haftası", description: "5 belgesel logladın!",   icon: "DocuMarathon5",    criteria: { type: "genreLogCount", genreId: 99, value: 5 } },
    DOCU_MARATHON_10:   { id: "DOCU_MARATHON_10",   name: "Belgesel Arşivi",  description: "10 belgesel logladın!",  icon: "DocuMarathon10",   criteria: { type: "genreLogCount", genreId: 99, value: 10 } },

    // --- Farklı Tür Loglama Başarımları ---
    GENRE_EXPLORER_3: { id: "GENRE_EXPLORER_3", name: "Tür Kaşifi",    description: "En az 3 farklı türde içerik logladın!", icon: "GenreExplorer3", criteria: { type: "uniqueGenreCount", value: 3 } }, // Kriter tipi değişti
    GENRE_EXPLORER_5: { id: "GENRE_EXPLORER_5", name: "Tür Gezgini",   description: "En az 5 farklı türde içerik logladın!", icon: "GenreExplorer5", criteria: { type: "uniqueGenreCount", value: 5 } },
    GENRE_EXPLORER_10:{ id: "GENRE_EXPLORER_10",name: "Tür Uzmanı",    description: "En az 10 farklı türde içerik logladın!",icon: "GenreExplorer10",criteria: { type: "uniqueGenreCount", value: 10 } }, // Yeni 10 tür rozeti

    // --- Beğeni Başarımları ---
    LIKE_1:   { id: "LIKE_1",   name: "İlk Beğeni",      description: "İlk logunu beğendin!",          icon: "Like1",   criteria: { type: "likeGivenCount", value: 1 } }, // Kriter tipi değişti
    LIKE_5:   { id: "LIKE_5",   name: "Takdir Edici",    description: "5 log beğendin!",             icon: "Like5",   criteria: { type: "likeGivenCount", value: 5 } },
    LIKE_10:  { id: "LIKE_10",  name: "Beğeni Yağmuru",  description: "10 log beğendin!",            icon: "Like10",  criteria: { type: "likeGivenCount", value: 10 } },
    LIKE_25:  { id: "LIKE_25",  name: "Cömert Beğenici", description: "25 log beğendin!",            icon: "Like25",  criteria: { type: "likeGivenCount", value: 25 } },
    LIKE_100: { id: "LIKE_100", name: "Beğeni Kralı",    description: "100 log beğendin!",           icon: "Like100", criteria: { type: "likeGivenCount", value: 100 } },
    LIKE_250: { id: "LIKE_250", name: "Beğeni Efsanesi", description: "250 log beğendin!",           icon: "Like250", criteria: { type: "likeGivenCount", value: 250 } },

    // --- Loglama Serisi Başarımları ---
    STREAK_10: { id: "STREAK_10", name: "Günlük İzleyici", description: "10 gün aralıksız loglama yaptın!", icon: "Streak10", criteria: { type: "logStreak", value: 10 } }, // Kriter tipi değişti
    STREAK_20: { id: "STREAK_20", name: "Loglama Ustası",  description: "20 gün aralıksız loglama yaptın!", icon: "Streak20", criteria: { type: "logStreak", value: 20 } },

    // --- Özel Tarih Başarımları ---
    NEW_YEAR_LIST: { id: "NEW_YEAR_LIST", name: "Yeni Yıl Planı", description: "1 Ocak'ta yeni bir liste oluşturdun!", icon: "NewYearList", criteria: { type: "listCreatedOnDate", date: "01-01" } }, // Kriter tipi ve date eklendi
    ANNIVERSARY_LIST: { id: "ANNIVERSARY_LIST", name: "Monologed Yıldönümü", description: "23 Nisan'da bir liste oluşturdun!", icon: "AnniversaryList", criteria: { type: "listCreatedOnDate", date: "04-23" } }, // Kriter tipi ve date eklendi

    // --- Mevcut Başarımlar (Örnek, ID'leri ve kriterleri güncelledim) ---
    FIRST_LOG: { id: "FIRST_LOG", name: "İlk Adım (Genel)", description: "İlk logunu başarıyla girdin!", icon: "FirstLog", criteria: { type: "logCount", value: 1 } }, // Genel log sayısı
    FIRST_REVIEW: { id: "FIRST_REVIEW", name: "Eleştirmen", description: "İlk yorumunu yazdın!", icon: "FirstReview", criteria: { type: "reviewCount", value: 1 } },
    // SOCIAL_BUTTERFLY: { id: "SOCIAL_BUTTERFLY", name: "Sosyal Kelebek", description: "5 kullanıcıyı takip ettin!", icon: "SocialButterfly", criteria: { type: "followingCount", value: 5 } }, // Zaten yukarıda var

    // Diğer eski başarımlar buraya eklenebilir veya güncellenebilir.
};

module.exports = { achievementDefinitions };
