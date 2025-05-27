// backend/controllers/mainController.js
const { ListTablesCommand } = require("@aws-sdk/client-dynamodb");
const { ddbClient } = require('../config/awsConfig');
const axios = require('axios');

// TMDB Ayarları
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;
const MAX_HERO_ITEMS = 10; // Frontend'e gönderilecek maksimum öğe sayısı

// Veritabanı bağlantısını test eden fonksiyon (Mevcut)
exports.testDbConnection = async (req, res) => {
    // ... (kod aynı kalır) ...
     if (!ddbClient) {
         console.error("DB Test: DynamoDB istemcisi yapılandırılamadığı için test başarısız.");
         return res.status(500).json({ message: 'DynamoDB istemcisi yapılandırılamadı (Erişim bilgileri eksik olabilir). Lütfen sunucu loglarını kontrol edin.' });
    }
    try {
        console.log("DB Test: DynamoDB bağlantısı test ediliyor (ListTables komutu)...");
        const command = new ListTablesCommand({});
        const data = await ddbClient.send(command);
        console.log("DB Test: DynamoDB bağlantısı başarılı. Mevcut Tablolar:", data.TableNames);
        res.status(200).json({
            message: "DynamoDB bağlantısı başarılı!",
            region: process.env.AWS_REGION,
            tables: data.TableNames || []
        });
    } catch (error) {
        console.error("DB Test: DynamoDB bağlantı/komut hatası:", error);
        res.status(500).json({
            message: "DynamoDB bağlantısı veya komut yürütme başarısız!",
            error: error.message,
            errorCode: error.name
        });
    }
};


// --- GÜNCELLENMİŞ FONKSİYON: Öne Çıkan İçerik Listesini Getir ---
/**
 * TMDB'den günün trend içeriklerini alır ve uygun olan ilk N tanesini döndürür.
 * @route GET /api/main/featured
 */
exports.getFeaturedContent = async (req, res) => {
    if (!API_KEY) {
        console.error('Hata: getFeaturedContent içinde TMDB_API_KEY eksik!');
        return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    }

    try {
        console.log("Bilgi: Günün trend içerikleri TMDB'den çekiliyor (/trending/all/day)...");
        const trendingResponse = await axios.get(`${TMDB_BASE_URL}/trending/all/day`, {
            params: { api_key: API_KEY, language: 'tr-TR' }
        });

        const results = trendingResponse.data?.results || [];

        // Sadece backdrop ve poster resmi olan film veya dizileri filtrele ve formatla
        const validAndFormattedItems = results
            .filter(item =>
                (item.media_type === 'movie' || item.media_type === 'tv') &&
                item.backdrop_path && item.poster_path // Poster path kontrolü de eklendi
            )
            .map(item => {
                // Detayları çekmeye gerek yok, trending endpoint'indeki veriler yeterli
                return {
                    id: item.id,
                    media_type: item.media_type,
                    title: item.title || item.name,
                    overview: item.overview,
                    backdrop_path: item.backdrop_path,
                    poster_path: item.poster_path,
                    vote_average: item.vote_average ? item.vote_average.toFixed(1) : null,
                    // Türler ve yapımcı/yönetmen bilgisi şimdilik dahil edilmedi
                    release_date: item.release_date,
                    first_air_date: item.first_air_date
                };
            })
            .slice(0, MAX_HERO_ITEMS); // İlk N tanesini al

        if (validAndFormattedItems.length === 0) {
            console.warn("Uyarı: Bugün için uygun trend içerik bulunamadı.");
            return res.status(200).json({ items: [] });
        }

        console.log(`Bilgi: Öne çıkan içerik listesi (${validAndFormattedItems.length} adet) başarıyla alındı ve formatlandı.`);
        // "items" anahtarıyla dizi döndürülüyor
        res.status(200).json({ items: validAndFormattedItems });

    } catch (error) {
        console.error(
            'TMDB API Hatası (getFeaturedContent - Trending):',
            error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
        );
        res.status(error.response ? error.response.status : 500).json({
            message: 'Trend içerik alınırken bir hata oluştu.',
            items: [] // Hata durumunda boş dizi döndür
        });
    }
};
// --- GÜNCELLENMİŞ FONKSİYON SONU ---
