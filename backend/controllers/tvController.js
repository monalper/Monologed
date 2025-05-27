// backend/controllers/tvController.js
const axios = require('axios');
// QueryCommand ve docClient importları eklendi
const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require('../config/awsConfig');

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

// Hariç tutulacak TV türü ID'leri
const EXCLUDED_TV_GENRE_IDS = [
    10767, // Talk Show
    10763, // News
    10764  // Reality
].join(',');

const MIN_VOTE_COUNT_THRESHOLD = 15; // Arama sonuçları için minimum oy
const LOGS_TABLE = "Logs"; // Log tablosu adı
const USER_LOGS_INDEX = "UserLogsIndex"; // Loglar için GSI adı

/**
 * Popüler TV dizilerini TMDB'den belirli filtrelerle çeker.
 * @route GET /api/tv/popular
 */
exports.getPopularTvShows = async (req, res) => {
  if (!API_KEY) {
    console.error('Hata: TMDB_API_KEY ortam değişkeni tanımlanmamış!');
    return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
  }
  try {
    const page = req.query.page || 1;
    const voteCountThreshold = 500;

    console.log(`Popüler diziler için TMDB API (/discover/tv) isteği gönderiliyor... Min Vote: ${voteCountThreshold}, Excluded Genres: ${EXCLUDED_TV_GENRE_IDS}`);

    const response = await axios.get(`${TMDB_BASE_URL}/discover/tv`, {
      params: {
        api_key: API_KEY,
        language: 'en-US', // İngilizce
        page: page,
        sort_by: 'popularity.desc',
        include_adult: false,
        include_null_first_air_dates: false,
        'vote_count.gte': voteCountThreshold,
        'without_genres': EXCLUDED_TV_GENRE_IDS
      }
    });
    console.log(`Popüler diziler (filtrelenmiş) başarıyla alındı (Sayfa: ${page}).`);
    res.status(200).json(response.data);
  } catch (error) {
    console.error(
        'TMDB API Hatası (Discover TV):',
        error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
        );
    res.status(error.response ? error.response.status : 500).json({
      message: 'Popüler diziler alınırken bir hata oluştu.',
    });
  }
};

/**
 * Kullanıcının sorgusuna göre dizileri TMDB API'sinden arar ve filtreler.
 * @route GET /api/tv/search?query=arananKelime
 */
exports.searchTvShows = async (req, res) => {
  const { query } = req.query;
  const page = req.query.page || 1;

  if (!API_KEY) {
    console.error('Hata: TMDB_API_KEY ortam değişkeni tanımlanmamış!');
    return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
  }
  if (!query) {
    return res.status(400).json({ message: 'Arama yapmak için bir sorgu girmelisiniz (?query=...)' });
  }

  // Arama sorgusunu normalize et: tire, boşluk ve özel karakterleri kaldır, küçük harfe çevir
  const normalizedQuery = query.toLowerCase().replace(/[-\s]/g, '');

  try {
    console.log(`"${query}" (normalize edilmiş: "${normalizedQuery}") için TMDB API dizi arama isteği gönderiliyor (Sayfa: ${page})...`);
    const response = await axios.get(`${TMDB_BASE_URL}/search/tv`, {
      params: {
        api_key: API_KEY,
        query: query,
        language: 'en-US', // İngilizce
        page: page,
        include_adult: false
      }
    });
    console.log(`"${query}" dizi araması için TMDB API yanıtı alındı. Filtreleme uygulanıyor...`);

    const originalResults = response.data.results || [];
    const filteredResults = originalResults.filter(
        show => show.vote_count >= MIN_VOTE_COUNT_THRESHOLD && show.poster_path
    );

    console.log(`Filtreleme sonrası ${filteredResults.length} dizi sonucu kaldı.`);

    const filteredResponseData = {
        ...response.data,
        results: filteredResults,
        total_results: filteredResults.length, // Sadece bu sayfadaki filtrelenmiş sonuç sayısı
        // Gerçek toplam sonuç sayısı için response.data.total_results kullanılabilir ama filtreleme sonrası yanıltıcı olabilir.
    };

    res.status(200).json(filteredResponseData);

  } catch (error) {
    console.error(
        `TMDB API Hatası (Search TV: "${query}"):`,
        error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
    );
    res.status(error.response ? error.response.status : 500).json({
      message: 'Dizi araması sırasında bir hata oluştu.',
      results: []
    });
  }
};


/**
 * Belirtilen tvId için TMDB'den dizi detaylarını çeker.
 * @route GET /api/tv/:tvId
 */
exports.getTvShowDetails = async (req, res) => {
    const { tvId } = req.params;

    if (!API_KEY) {
        console.error('Hata: getTvShowDetails içinde TMDB_API_KEY eksik!');
        return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    }
    if (!tvId) {
        return res.status(400).json({ message: 'Dizi ID\'si belirtilmelidir.' });
    }

    try {
        console.log(`Dizi detayları çekiliyor (ID: ${tvId})...`);
        const response = await axios.get(`${TMDB_BASE_URL}/tv/${tvId}`, {
            params: {
                api_key: API_KEY,
                language: 'en-US', // İngilizce
                append_to_response: 'credits,videos,aggregate_credits,external_ids' // Gerekli ek bilgiler
            }
        });
        console.log(`Dizi detayları başarıyla çekildi (ID: ${tvId}).`);
        res.status(200).json(response.data);
    } catch (error) {
        console.error(
            `TMDB API Hatası (TV Details ID: ${tvId}):`,
            error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
        );
        const statusCode = error.response ? error.response.status : 500;
        const message = statusCode === 404 ? 'Dizi bulunamadı.' : 'Dizi detayları alınırken bir hata oluştu.';
        res.status(statusCode).json({ message: message });
    }
};

/**
 * Belirtilen tvId için TMDB'den dizi önerilerini çeker.
 * @route GET /api/tv/:tvId/similar
 */
exports.getRecommendedTvShows = async (req, res) => {
    const { tvId } = req.params;

    if (!API_KEY) {
        console.error('Hata: getRecommendedTvShows içinde TMDB_API_KEY eksik!');
        return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    }
    if (!tvId) {
        return res.status(400).json({ message: 'Dizi ID\'si belirtilmelidir.' });
    }

    try {
        console.log(`Dizi önerileri çekiliyor (ID: ${tvId})...`);
        const response = await axios.get(`${TMDB_BASE_URL}/tv/${tvId}/recommendations`, {
            params: {
                api_key: API_KEY,
                language: 'en-US', // İngilizce
                page: 1
            }
        });
        console.log(`Dizi önerileri başarıyla çekildi (ID: ${tvId}).`);
        res.status(200).json(response.data);
    } catch (error) {
        console.error(
            `TMDB API Hatası (TV Recommendations ID: ${tvId}):`,
            error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
        );
        res.status(error.response ? error.response.status : 500).json({
            message: 'Dizi önerileri alınırken bir hata oluştu.',
            results: []
        });
    }
};

/**
 * Belirtilen dizi ID'si ve sezon numarası için TMDB'den bölüm detaylarını çeker.
 * @route GET /api/tv/:tvId/season/:seasonNumber/episodes
 */
exports.getSeasonEpisodes = async (req, res) => {
    const { tvId, seasonNumber } = req.params;

    if (!API_KEY) {
        console.error('Hata: getSeasonEpisodes içinde TMDB_API_KEY eksik!');
        return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    }
    if (!tvId || isNaN(Number(tvId))) {
        return res.status(400).json({ message: 'Geçerli bir dizi ID\'si (tvId) belirtilmelidir.' });
    }
    if (seasonNumber === undefined || seasonNumber === null || isNaN(Number(seasonNumber)) || Number(seasonNumber) < 0) {
        return res.status(400).json({ message: 'Geçerli bir sezon numarası (0 veya daha büyük) belirtilmelidir.' });
    }

    const numericTvId = Number(tvId);
    const numericSeasonNumber = Number(seasonNumber);

    try {
        console.log(`Bilgi: Dizi ${numericTvId}, Sezon ${numericSeasonNumber} bölüm detayları TMDB'den çekiliyor...`);
        const response = await axios.get(`${TMDB_BASE_URL}/tv/${numericTvId}/season/${numericSeasonNumber}`, {
            params: {
                api_key: API_KEY,
                language: 'en-US' // İngilizce
            }
        });

        if (response.data && Array.isArray(response.data.episodes)) {
            console.log(`Bilgi: Dizi ${numericTvId}, Sezon ${numericSeasonNumber} için ${response.data.episodes.length} bölüm bulundu.`);
            // Sadece bölüm listesini döndür
            res.status(200).json({ episodes: response.data.episodes });
        } else {
            console.warn(`Uyarı: Dizi ${numericTvId}, Sezon ${numericSeasonNumber} için bölüm bilgisi TMDB'den alınamadı veya format hatalı.`);
            res.status(404).json({ message: 'Belirtilen sezon için bölüm bilgisi bulunamadı.', episodes: [] });
        }
    } catch (error) {
        console.error(
            `TMDB API Hatası (getSeasonEpisodes - TV: ${numericTvId}, Season: ${numericSeasonNumber}):`,
            error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
        );
        const statusCode = error.response?.status === 404 ? 404 : 500;
        const message = statusCode === 404 ? 'Belirtilen sezon bulunamadı.' : 'Bölüm detayları alınırken bir hata oluştu.';
        res.status(statusCode).json({ message: message, episodes: [] });
    }
};

/**
 * Kullanıcının belirli bir dizi için izleme ilerlemesini getirir.
 * @route GET /api/tv/:tvId/progress
 */
exports.getProgressForShow = async (req, res) => {
    const userId = req.user?.userId;
    const { tvId } = req.params;

    if (!userId) {
        return res.status(200).json({ progress: null }); // Giriş yapmamışsa ilerleme yok
    }
    if (!tvId || isNaN(Number(tvId))) {
        return res.status(400).json({ message: 'Geçerli bir dizi ID\'si (tvId) belirtilmelidir.' });
    }
    if (!docClient) {
        return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    }

    const numericTvId = Number(tvId);

    const params = {
        TableName: LOGS_TABLE,
        IndexName: USER_LOGS_INDEX,
        KeyConditionExpression: "userId = :uid",
        FilterExpression: "contentId = :cid AND contentType = :ctype",
        ExpressionAttributeValues: {
            ":uid": userId,
            ":cid": numericTvId,
            ":ctype": "tv"
        },
        ProjectionExpression: "seasonNumber, episodeNumber, createdAt",
        ScanIndexForward: false // Sıralama önemli değil, aşağıda hesaplayacağız
    };

    try {
        console.log(`Bilgi: Kullanıcı ${userId} için Dizi ${numericTvId} ilerleme durumu sorgulanıyor...`);
        const { Items: userLogs } = await docClient.send(new QueryCommand(params));

        if (!userLogs || userLogs.length === 0) {
            console.log(`Bilgi: Kullanıcı ${userId} için Dizi ${numericTvId} hakkında log bulunamadı.`);
            return res.status(200).json({ progress: null });
        }

        // En son izlenen sezon ve bölümü bul
        let lastWatched = null;
        let maxSeason = -1;
        let maxEpisodeInMaxSeason = -1;

        userLogs.forEach(log => {
            const season = log.seasonNumber !== undefined && log.seasonNumber !== null ? log.seasonNumber : -1;
            const episode = log.episodeNumber !== undefined && log.episodeNumber !== null ? log.episodeNumber : -1;

            if (season > maxSeason) {
                maxSeason = season;
                maxEpisodeInMaxSeason = episode;
                lastWatched = log;
            } else if (season === maxSeason && episode > maxEpisodeInMaxSeason) {
                maxEpisodeInMaxSeason = episode;
                lastWatched = log;
            }
        });

        const lastSeasonWatched = lastWatched?.seasonNumber;
        const lastEpisodeWatched = lastWatched?.episodeNumber;

        console.log(`Bilgi: Kullanıcı ${userId} için Dizi ${numericTvId} en son izlenen: Sezon ${lastSeasonWatched ?? 'Yok'}, Bölüm ${lastEpisodeWatched ?? 'Yok'}`);

        const progress = {
            lastWatchedSeason: lastSeasonWatched,
            lastWatchedEpisode: lastEpisodeWatched
        };

        res.status(200).json({ progress: progress });

    } catch (error) {
        console.error(`HATA: Dizi ilerlemesi getirilirken hata (UserId: ${userId}, TV ID: ${numericTvId}):`, error);
        res.status(500).json({ message: 'İlerleme durumu getirilirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Belirtilen dizi için izleme sağlayıcılarını getirir (Belirtilen bölge için).
 * @route GET /api/tv/:tvId/watch-providers?region=XX
 */
exports.getWatchProviders = async (req, res) => {
    const { tvId } = req.params;
    // Bölge kodunu query'den al, varsayılan 'TR'
    const region = req.query.region?.toUpperCase() || 'TR'; // Bölge kodunu büyük harfe çevir

    if (!API_KEY) {
        console.error('Hata: getWatchProviders (TV) içinde TMDB_API_KEY eksik!');
        return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    }
    if (!tvId) {
        return res.status(400).json({ message: 'Dizi ID\'si belirtilmelidir.' });
    }

    try {
        console.log(`Dizi izleme sağlayıcıları çekiliyor (ID: ${tvId}, Bölge: ${region})...`);
        // TMDB API'sinden tüm bölgeler için izleme sağlayıcılarını çek
        const response = await axios.get(`${TMDB_BASE_URL}/tv/${tvId}/watch/providers`, {
            params: { api_key: API_KEY }
        });

        // İstenen bölgeye ait sonuçları al
        const providersForRegion = response.data?.results?.[region] || null;

        if (providersForRegion) {
             console.log(`Dizi izleme sağlayıcıları başarıyla çekildi (ID: ${tvId}, Bölge: ${region}).`);
             // Sadece istenen bölgenin verisini gönder
             res.status(200).json({ providers: providersForRegion });
        } else {
             console.log(`Dizi izleme sağlayıcıları bulunamadı (ID: ${tvId}, Bölge: ${region}).`);
             // Sağlayıcı yoksa null döndür
             res.status(200).json({ providers: null });
        }

    } catch (error) {
        console.error(
            `TMDB API Hatası (TV Watch Providers ID: ${tvId}, Bölge: ${region}):`,
            error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
        );
        // 404 hatası sağlayıcı olmadığı anlamına gelebilir, bu yüzden hata yerine boş sonuç döndürelim
        if (error.response && error.response.status === 404) {
             console.log(`Dizi izleme sağlayıcıları bulunamadı (ID: ${tvId}, TMDB 404).`);
             res.status(200).json({ providers: null });
        } else {
            // Diğer hatalar için 500 döndür
            res.status(error.response ? error.response.status : 500).json({
                message: 'Dizi izleme sağlayıcıları alınırken bir hata oluştu.',
                providers: null
            });
        }
    }
};
