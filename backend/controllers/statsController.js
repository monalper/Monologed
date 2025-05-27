// backend/controllers/statsController.js
const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require('../config/awsConfig');
const axios = require('axios'); // TMDB genre listesi için

const LOGS_TABLE = "Logs";
const USER_LOGS_INDEX = "UserLogsIndex"; // Kullanıcının loglarını çekmek için GSI

// TMDB Ayarları
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

// Tür isimlerini cache'lemek için basit bir obje
let genreCache = {
    movie: null,
    tv: null,
    lastFetched: 0
};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 saat (milisaniye cinsinden)

/**
 * TMDB'den film ve dizi tür listelerini çeker ve cache'ler.
 */
async function fetchAndCacheGenres() {
    const now = Date.now();
    if (!genreCache.movie || !genreCache.tv || (now - genreCache.lastFetched > CACHE_DURATION)) {
        console.log("Bilgi: TMDB tür listeleri çekiliyor/güncelleniyor...");
        if (!API_KEY) { console.error("HATA: fetchAndCacheGenres içinde TMDB_API_KEY eksik!"); return; }
        try {
            const [movieGenresRes, tvGenresRes] = await Promise.all([
                axios.get(`${TMDB_BASE_URL}/genre/movie/list`, { params: { api_key: API_KEY, language: 'tr-TR' } }),
                axios.get(`${TMDB_BASE_URL}/genre/tv/list`, { params: { api_key: API_KEY, language: 'tr-TR' } })
            ]);
            const movieGenreMap = new Map();
            if (movieGenresRes.data?.genres) { movieGenresRes.data.genres.forEach(g => movieGenreMap.set(g.id, g.name)); }
            genreCache.movie = movieGenreMap;
            const tvGenreMap = new Map();
            if (tvGenresRes.data?.genres) { tvGenresRes.data.genres.forEach(g => tvGenreMap.set(g.id, g.name)); }
            genreCache.tv = tvGenreMap;
            genreCache.lastFetched = now;
            console.log(`Bilgi: TMDB tür listeleri başarıyla çekildi ve cache'lendi. Film: ${movieGenreMap.size}, Dizi: ${tvGenreMap.size}`);
        } catch (error) { console.error("HATA: TMDB tür listeleri çekilirken hata:", error.response?.data || error.message); }
    }
}

/**
 * Belirtilen kullanıcının izleme istatistiklerini hesaplar.
 * @route GET /api/users/:userId/stats
 */
exports.getUserStats = async (req, res) => {
    const { userId: targetUserId } = req.params;
    if (!targetUserId) { return res.status(400).json({ message: 'Kullanıcı ID\'si belirtilmelidir.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }

    await fetchAndCacheGenres(); // Tür isimlerini al/güncelle

    const queryParams = {
        TableName: LOGS_TABLE,
        IndexName: USER_LOGS_INDEX,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": targetUserId },
        // İstatistik için gerekli alanları çek: contentType, runtimeMinutes, genreIds, rating, watchedDate
        ProjectionExpression: "contentType, runtimeMinutes, genreIds, rating, watchedDate" // <<< rating ve watchedDate eklendi
    };

    let totalMovieMinutes = 0;
    let totalTvMinutes = 0;
    const genreCounts = {};
    // <<< YENİ: İstatistik değişkenleri >>>
    let totalMovieRatingSum = 0;
    let ratedMovieCount = 0;
    let totalTvRatingSum = 0;
    let ratedTvCount = 0;
    const ratingDistribution = {}; // { '0.5': count, '1.0': count, ... '10.0': count }
    const monthlyActivity = {}; // { 'YYYY-MM': count }
    // <<< YENİ SONU >>>

    let lastEvaluatedKey;
    let scannedCount = 0;

    console.log(`Bilgi: Kullanıcı ${targetUserId} için istatistik hesaplama başlıyor...`);

    try {
        // Tüm logları tara (performans uyarısı!)
        do {
            const command = new QueryCommand({ ...queryParams, ExclusiveStartKey: lastEvaluatedKey });
            const { Items, LastEvaluatedKey } = await docClient.send(command);
            lastEvaluatedKey = LastEvaluatedKey;

            if (Items) {
                scannedCount += Items.length;
                Items.forEach(log => {
                    // Süreleri topla
                    if (log.runtimeMinutes && typeof log.runtimeMinutes === 'number' && log.runtimeMinutes > 0) {
                        if (log.contentType === 'movie') totalMovieMinutes += log.runtimeMinutes;
                        else if (log.contentType === 'tv') totalTvMinutes += log.runtimeMinutes;
                    }
                    // Türleri say
                    if (log.genreIds && Array.isArray(log.genreIds)) {
                        log.genreIds.forEach(genreId => {
                            if (typeof genreId === 'number') genreCounts[genreId] = (genreCounts[genreId] || 0) + 1;
                        });
                    }
                    // <<< YENİ: Puanları işle >>>
                    if (log.rating && typeof log.rating === 'number' && log.rating >= 0.5 && log.rating <= 10) {
                        const ratingStr = log.rating.toFixed(1); // '1.0', '7.5' gibi string key kullan
                        ratingDistribution[ratingStr] = (ratingDistribution[ratingStr] || 0) + 1;

                        if (log.contentType === 'movie') {
                            totalMovieRatingSum += log.rating;
                            ratedMovieCount++;
                        } else if (log.contentType === 'tv') {
                            totalTvRatingSum += log.rating;
                            ratedTvCount++;
                        }
                    }
                    // <<< YENİ: Aylık aktiviteyi işle >>>
                    if (log.watchedDate && typeof log.watchedDate === 'string') {
                        try {
                            // Tarihi doğrula ve YYYY-MM formatına getir
                            const date = new Date(log.watchedDate);
                            // Geçersiz tarihleri atla
                            if (!isNaN(date.getTime())) {
                                const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                                monthlyActivity[yearMonth] = (monthlyActivity[yearMonth] || 0) + 1;
                            } else {
                                console.warn(`Uyarı: Geçersiz watchedDate formatı bulundu: ${log.watchedDate}`);
                            }
                        } catch (dateError) {
                            console.warn(`Uyarı: watchedDate işlenirken hata: ${log.watchedDate}`, dateError);
                        }
                    }
                    // <<< YENİ SONU >>>
                });
            }
        } while (lastEvaluatedKey);

        console.log(`Bilgi: Kullanıcı ${targetUserId} için ${scannedCount} log tarandı.`);

        // En çok izlenen türleri bul ve isimlerini ekle
        const sortedGenres = Object.entries(genreCounts)
            .sort(([, countA], [, countB]) => countB - countA)
            .slice(0, 5)
            .map(([genreId, count]) => {
                const id = Number(genreId);
                const name = genreCache.movie?.get(id) || genreCache.tv?.get(id) || `Tür ID: ${id}`;
                return { id, name, count };
            });

        // <<< YENİ: Ortalama puanları hesapla >>>
        const averageMovieRating = ratedMovieCount > 0 ? (totalMovieRatingSum / ratedMovieCount) : null;
        const averageTvRating = ratedTvCount > 0 ? (totalTvRatingSum / ratedTvCount) : null;

        // <<< YENİ: Aylık aktiviteyi sırala (isteğe bağlı olarak son 12 ay) >>>
        const sortedMonthlyActivity = Object.entries(monthlyActivity)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB)) // Tarihe göre sırala (eskiden yeniye)
            // .slice(-12) // Son 12 ayı almak için bu satırı açabilirsiniz
            .map(([yearMonth, count]) => ({ yearMonth, count }));

        const stats = {
            userId: targetUserId,
            totalLogs: scannedCount,
            totalMovieWatchTimeMinutes: totalMovieMinutes,
            totalTvWatchTimeMinutes: totalTvMinutes,
            topGenres: sortedGenres,
            // <<< YENİ: Yeni istatistikleri ekle >>>
            averageMovieRating: averageMovieRating ? parseFloat(averageMovieRating.toFixed(2)) : null, // 2 ondalık basamak
            averageTvRating: averageTvRating ? parseFloat(averageTvRating.toFixed(2)) : null,
            ratingDistribution: ratingDistribution, // { '0.5': count, ... }
            monthlyActivity: sortedMonthlyActivity // [{ yearMonth: 'YYYY-MM', count: ... }]
            // <<< YENİ SONU >>>
        };

        console.log(`Bilgi: Kullanıcı ${targetUserId} detaylı istatistikleri hesaplandı:`, stats);
        res.status(200).json(stats);

    } catch (error) {
        console.error(`HATA: Kullanıcı ${targetUserId} istatistikleri hesaplanırken hata:`, error);
        res.status(500).json({ message: 'Kullanıcı istatistikleri hesaplanırken bir sunucu hatası oluştu.' });
    }
};
