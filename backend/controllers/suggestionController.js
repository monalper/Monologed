// backend/controllers/suggestionController.js
const axios = require('axios');

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;
const MAX_SUGGESTIONS = 8; // Öneri sayısını biraz azaltabiliriz

/**
 * Fetches search suggestions using TMDB's multi search endpoint.
 * Returns a combined list of movies and TV shows, sorted by popularity.
 * @route GET /api/suggestions?query=searchQuery
 */
exports.getSuggestions = async (req, res) => {
    const { query } = req.query;

    if (!API_KEY) {
        console.error("FATAL ERROR: TMDB_API_KEY is not configured!");
        return res.status(500).json([]);
    }

    if (!query || query.trim().length < 2) {
        return res.status(200).json([]);
    }

    const trimmedQuery = query.trim();

    try {
        console.log(`Fetching multi-search suggestions for query: "${trimmedQuery}"`);

        // <<< DEĞİŞİKLİK: /search/multi endpoint'i kullanılıyor >>>
        const response = await axios.get(`${TMDB_BASE_URL}/search/multi`, {
            params: {
                api_key: API_KEY,
                query: trimmedQuery,
                // language: 'tr-TR', // Eski Türkçe parametre
                language: 'en-US', // *** DİL GÜNCELLENDİ: İngilizce ***
                page: 1,
                include_adult: false
            }
        });

        const results = response.data?.results || [];

        // Sadece film ve dizileri al, posteri olanları filtrele ve formatla
        const suggestions = results
            .filter(item =>
                (item.media_type === 'movie' || item.media_type === 'tv') &&
                item.poster_path // Posteri olanları seç
            )
            .map(item => ({
                id: item.id,
                // title veya name kullan (hangisi varsa)
                title: item.title || item.name,
                // Yılı al (movie için release_date, tv için first_air_date)
                year: item.release_date?.substring(0, 4) || item.first_air_date?.substring(0, 4) || null,
                type: item.media_type,
                poster_path: item.poster_path // <<< YENİ: Poster path eklendi
            }))
            .slice(0, MAX_SUGGESTIONS); // Sonuçları limitle

        console.log(`Found ${suggestions.length} movie/tv suggestions for "${trimmedQuery}".`);
        res.status(200).json(suggestions);

    } catch (error) {
        console.error(`Error fetching multi-search suggestions for query "${trimmedQuery}":`, error.response?.data || error.message);
        res.status(500).json([]); // Hata durumunda boş dizi döndür
    }
};
