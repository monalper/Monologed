// backend/controllers/movieController.js
const axios = require('axios');

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY; // .env dosyasından okunan API anahtarı
const MIN_VOTE_COUNT_THRESHOLD = 15; // Arama sonuçlarında gösterilecek minimum oy sayısı

/**
 * TMDB'den popüler filmleri, belirli filtrelerle (oy sayısı gibi) çeker.
 * '/discover/movie' endpoint'ini kullanır.
 * @route GET /api/movies/popular
 */
exports.getPopularMovies = async (req, res) => {
  if (!API_KEY) {
    console.error('Hata: TMDB_API_KEY ortam değişkeni tanımlanmamış!');
    return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
  }
  try {
    const page = req.query.page || 1;
    const voteCountThreshold = 500; // Popülerler için eşik (isteğe bağlı olarak ayarlanabilir)

    console.log(`Popüler filmler için TMDB API (/discover/movie) isteği gönderiliyor... Min Vote: ${voteCountThreshold}`);

    const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
      params: {
        api_key: API_KEY,
        language: 'en-US', // İngilizce
        page: page,
        sort_by: 'popularity.desc', // Popülerliğe göre sırala
        include_adult: false,
        include_video: false,
        'vote_count.gte': voteCountThreshold // Minimum oy sayısı filtresi
      }
    });
    console.log(`Popüler filmler (filtrelenmiş) başarıyla alındı (Sayfa: ${page}).`);
    res.status(200).json(response.data);
  } catch (error) {
    console.error(
        'TMDB API Hatası (Discover Movie):',
        error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
        );
    res.status(error.response ? error.response.status : 500).json({
      message: 'Popüler filmler alınırken bir hata oluştu.',
    });
  }
};

/**
 * Kullanıcının sorgusuna göre filmleri TMDB API'sinden arar ve filtreler.
 * @route GET /api/movies/search?query=arananKelime
 */
exports.searchMovies = async (req, res) => {
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
    console.log(`"${query}" (normalize edilmiş: "${normalizedQuery}") için TMDB API film arama isteği gönderiliyor (Sayfa: ${page})...`);
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: {
        api_key: API_KEY,
        query: query,
        language: 'en-US', // İngilizce
        page: page,
        include_adult: false
      }
    });
    console.log(`"${query}" araması için TMDB API yanıtı alındı. Filtreleme uygulanıyor...`);

    // --- FİLTRELEME ---
    const originalResults = response.data.results || [];
    const filteredResults = originalResults.filter(
        movie => movie.vote_count >= MIN_VOTE_COUNT_THRESHOLD && movie.poster_path // Minimum oy sayısı ve poster kontrolü
    );
    // --- FİLTRELEME SONU ---

    console.log(`Filtreleme sonrası ${filteredResults.length} film sonucu kaldı.`);

    // Yanıt objesini filtrelenmiş sonuçlarla güncelle
    const filteredResponseData = {
        ...response.data,
        results: filteredResults,
        total_results: filteredResults.length, // Sadece bu sayfadaki filtrelenmiş sonuç sayısı
    };

    res.status(200).json(filteredResponseData);

  } catch (error) {
    console.error(
        `TMDB API Hatası (Search Movie: "${query}"):`,
        error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
    );
    res.status(error.response ? error.response.status : 500).json({
      message: 'Film araması sırasında bir hata oluştu.',
      results: [] // Hata durumunda boş results
    });
  }
};


/**
 * Belirtilen movieId için TMDB'den film detaylarını ve oyuncu/ekip bilgisini çeker.
 * @route GET /api/movies/:movieId
 */
exports.getMovieDetails = async (req, res) => {
    const { movieId } = req.params;

    if (!API_KEY) {
      console.error('Hata: getMovieDetails içinde TMDB_API_KEY eksik!');
      return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    }
    if (!movieId) {
        return res.status(400).json({ message: 'Film ID\'si belirtilmelidir.' });
    }

    try {
        console.log(`Film detayları çekiliyor (ID: ${movieId})...`);
        const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, {
            params: {
                api_key: API_KEY,
                language: 'en-US', // İngilizce
                append_to_response: 'credits,videos'
            }
        });
        console.log(`Film detayları başarıyla çekildi (ID: ${movieId}).`);
        res.status(200).json(response.data);
    } catch (error) {
        console.error(
            `TMDB API Hatası (Movie Details ID: ${movieId}):`,
            error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
        );
        const statusCode = error.response ? error.response.status : 500;
        const message = statusCode === 404 ? 'Film bulunamadı.' : 'Film detayları alınırken bir hata oluştu.';
        res.status(statusCode).json({ message: message });
    }
};

/**
 * Belirtilen movieId için TMDB'den film önerilerini çeker.
 * @route GET /api/movies/:movieId/similar
 */
exports.getSimilarMovies = async (req, res) => {
    const { movieId } = req.params;

    if (!API_KEY) {
        console.error('Hata: getSimilarMovies içinde TMDB_API_KEY eksik!');
        return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    }
    if (!movieId) {
        return res.status(400).json({ message: 'Film ID\'si belirtilmelidir.' });
    }

    try {
        console.log(`Film önerileri çekiliyor (ID: ${movieId})...`);
        const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}/recommendations`, {
            params: {
                api_key: API_KEY,
                language: 'en-US', // İngilizce
                page: 1
            }
        });
        console.log(`Film önerileri başarıyla çekildi (ID: ${movieId}).`);
        res.status(200).json(response.data);
    } catch (error) {
        console.error(
            `TMDB API Hatası (Movie Recommendations ID: ${movieId}):`,
            error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
        );
        res.status(error.response ? error.response.status : 500).json({
            message: 'Film önerileri alınırken bir hata oluştu.',
            results: []
        });
    }
};

/**
 * Kullanıcının sorgusuna göre film önerileri (autocomplete) sunar.
 * @route GET /api/movies/suggest?query=arananKelime
 */
exports.getMovieSuggestions = async (req, res) => {
    const { query } = req.query;

     if (!API_KEY) {
        console.error('Hata: getMovieSuggestions içinde TMDB_API_KEY eksik!');
        return res.status(500).json([]);
     }
     if (!query || query.trim().length < 2) { return res.status(200).json([]); }

    try {
        const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
            params: {
                api_key: API_KEY,
                query: query,
                language: 'en-US', // İngilizce
                page: 1,
                include_adult: false
            }
        });

        const suggestions = (response.data.results || [])
            .slice(0, 7) // İlk 7 sonucu al
            .map(movie => ({
                id: movie.id,
                title: movie.title,
                year: movie.release_date ? movie.release_date.substring(0, 4) : null
            }));
        res.status(200).json(suggestions);
    } catch (error) {
        console.error(
            `TMDB API Hatası (Movie Suggestions: "${query}"):`,
            error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
        );
        res.status(200).json([]); // Hata durumunda boş dizi döndür
    }
};

/**
 * Belirtilen film için izleme sağlayıcılarını getirir (Belirtilen bölge için).
 * @route GET /api/movies/:movieId/watch-providers?region=XX
 */
exports.getWatchProviders = async (req, res) => {
    const { movieId } = req.params;
    // Bölge kodunu query'den al, varsayılan 'TR'
    const region = req.query.region?.toUpperCase() || 'TR'; // Bölge kodunu büyük harfe çevir

    if (!API_KEY) {
        console.error('Hata: getWatchProviders (Movie) içinde TMDB_API_KEY eksik!');
        return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    }
    if (!movieId) {
        return res.status(400).json({ message: 'Film ID\'si belirtilmelidir.' });
    }

    try {
        console.log(`Film izleme sağlayıcıları çekiliyor (ID: ${movieId}, Bölge: ${region})...`);
        // TMDB API'sinden tüm bölgeler için izleme sağlayıcılarını çek
        const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}/watch/providers`, {
            params: { api_key: API_KEY }
        });

        // İstenen bölgeye ait sonuçları al
        const providersForRegion = response.data?.results?.[region] || null;

        if (providersForRegion) {
             console.log(`Film izleme sağlayıcıları başarıyla çekildi (ID: ${movieId}, Bölge: ${region}).`);
             // Sadece istenen bölgenin verisini gönder
             res.status(200).json({ providers: providersForRegion });
        } else {
             console.log(`Film izleme sağlayıcıları bulunamadı (ID: ${movieId}, Bölge: ${region}).`);
             // Sağlayıcı yoksa null döndür
             res.status(200).json({ providers: null });
        }

    } catch (error) {
        console.error(
            `TMDB API Hatası (Movie Watch Providers ID: ${movieId}, Bölge: ${region}):`,
            error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
        );
        // 404 hatası sağlayıcı olmadığı anlamına gelebilir, bu yüzden hata yerine boş sonuç döndürelim
        if (error.response && error.response.status === 404) {
             console.log(`Film izleme sağlayıcıları bulunamadı (ID: ${movieId}, TMDB 404).`);
             res.status(200).json({ providers: null });
        } else {
            // Diğer hatalar için 500 döndür
            res.status(error.response ? error.response.status : 500).json({
                message: 'Film izleme sağlayıcıları alınırken bir hata oluştu.',
                providers: null
            });
        }
    }
};
