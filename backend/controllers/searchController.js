// backend/controllers/searchController.js
const axios = require('axios');

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;
const MIN_VOTE_COUNT_THRESHOLD = 5; // Multi-search için daha düşük bir eşik deneyebiliriz veya kaldırabiliriz

/**
 * TMDB'nin /search/multi endpoint'ini kullanarak film ve dizileri arar.
 * Sonuçları filtreleyebilir ve frontend'in beklediği formata dönüştürebilir.
 * @route GET /api/search/multi?query=...
 */
exports.multiSearch = async (req, res) => {
    const { query } = req.query;
    const page = req.query.page || 1;

    if (!API_KEY) {
        return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    }
    if (!query) {
        return res.status(400).json({ message: 'Arama yapmak için bir sorgu girmelisiniz (?query=...)' });
    }

    try {
        console.log(`"${query}" için TMDB API multi-search isteği gönderiliyor (Sayfa: ${page})...`);
        const response = await axios.get(`${TMDB_BASE_URL}/search/multi`, {
            params: {
                api_key: API_KEY,
                query: query,
                // language: 'tr-TR', // Eski Türkçe parametre
                language: 'en-US', // *** DİL GÜNCELLENDİ: İngilizce ***
                page: page,
                include_adult: false
            }
        });
        console.log(`"${query}" multi-search için TMDB API yanıtı alındı. Filtreleme ve formatlama uygulanıyor...`);

        const rawResults = response.data.results || [];

        // Sonuçları filtrele ve formatla (Sadece film ve TV, minimum oy, poster var mı?)
        const filteredAndFormattedResults = rawResults
            .filter(item =>
                (item.media_type === 'movie' || item.media_type === 'tv') && // Sadece film veya dizi
                item.vote_count >= MIN_VOTE_COUNT_THRESHOLD &&              // Minimum oy sayısı
                item.poster_path                                            // Posteri olanlar
            )
            .map(item => ({
                id: item.id,
                type: item.media_type, // 'movie' veya 'tv'
                name: item.media_type === 'movie' ? item.title : item.name, // İsmi ata
                title: item.title, // Orijinal title (movie için)
                original_title: item.original_title, // Orijinal title (movie için)
                original_name: item.original_name, // Orijinal name (tv için)
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                overview: item.overview,
                popularity: item.popularity,
                vote_average: item.vote_average,
                vote_count: item.vote_count,
                date: item.media_type === 'movie' ? item.release_date : item.first_air_date // Tarihi ata
            }));

        console.log(`Multi-search filtreleme sonrası ${filteredAndFormattedResults.length} sonuç kaldı.`);

        // Frontend'in beklediği yapıya benzer bir yanıt döndür
        const responseData = {
            page: response.data.page,
            results: filteredAndFormattedResults,
            total_pages: response.data.total_pages, // Gerçek toplam sayfa sayısı
            total_results: response.data.total_results // Gerçek toplam sonuç sayısı (filtrelenmemiş)
            // Not: total_results filtrelenmemiş sayıyı gösterir, frontend bunu dikkate almalı
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error(
            `TMDB API Hatası (Multi-Search: "${query}"):`,
            error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
        );
        res.status(error.response ? error.response.status : 500).json({
            message: 'Multi arama sırasında bir hata oluştu.',
            results: []
        });
    }
};
