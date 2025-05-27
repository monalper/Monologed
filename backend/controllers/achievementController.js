// backend/controllers/achievementController.js
const { docClient } = require('../config/awsConfig');
const { QueryCommand, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { achievementDefinitions } = require('../config/achievements'); // Başarım tanımlarını import et
const achievementService = require('../services/achievementService');

const ACHIEVEMENTS_TABLE = "UserAchievements";
const USER_ACHIEVEMENTS_INDEX = "UserAchievementsIndex"; // Kullanıcının başarımlarını sorgulamak için

/**
 * Belirli bir kullanıcının kazandığı başarımları getirir.
 * @route GET /api/achievements/user/:userId
 */
exports.getUserAchievements = async (req, res) => {
    const { userId } = req.params;
    
    if (!userId) {
        console.error("Hata: Kullanıcı ID'si belirtilmemiş.");
        return res.status(400).json({ message: "Kullanıcı ID'si gerekli." });
    }

    if (!docClient) {
        console.error("Hata: DynamoDB DocumentClient başlatılamadı.");
        return res.status(500).json({ message: "Veritabanı bağlantısı kurulamadı." });
    }

    const params = {
        TableName: ACHIEVEMENTS_TABLE,
        IndexName: USER_ACHIEVEMENTS_INDEX,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: {
            ":uid": userId
        }
    };

    try {
        console.log(`Bilgi: Kullanıcı ${userId} için başarımlar sorgulanıyor...`);
        const { Items } = await docClient.send(new QueryCommand(params));
        
        if (!Items) {
            console.log(`Bilgi: Kullanıcı ${userId} için başarım bulunamadı.`);
            return res.status(200).json({ achievements: [] });
        }

        // Başarımları tanımlarla birleştir
        const enrichedAchievements = Items.map(earned => {
            const definition = achievementDefinitions.find(def => def.id === earned.achievementId);
            return {
                ...earned,
                name: definition?.name || 'Bilinmeyen Başarım',
                description: definition?.description || '',
                iconName: definition?.iconName || 'default',
                level: definition?.level,
                type: definition?.type
            };
        }).sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));

        console.log(`Bilgi: Kullanıcı ${userId} için ${enrichedAchievements.length} başarım bulundu.`);
        res.status(200).json({ achievements: enrichedAchievements });
    } catch (error) {
        console.error(`HATA: Kullanıcı başarımları getirilirken hata (UserId: ${userId}):`, error);
        
        // DynamoDB hata kodlarına göre özel mesajlar
        if (error.name === 'ResourceNotFoundException') {
            return res.status(404).json({ 
                message: "Başarımlar tablosu veya index bulunamadı. Lütfen sistem yöneticisiyle iletişime geçin." 
            });
        }
        
        if (error.name === 'ValidationException') {
            return res.status(400).json({ 
                message: "Geçersiz sorgu parametreleri. Lütfen sistem yöneticisiyle iletişime geçin." 
            });
        }

        res.status(500).json({ 
            message: "Başarımlar getirilirken bir sunucu hatası oluştu.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Tüm başarım tanımlarını döndürür.
 * @route GET /api/achievements/definitions
 */
exports.getAchievementDefinitions = (req, res) => {
    try {
        // achievementDefinitions doğrudan config dosyasından alınır
        if (!achievementDefinitions || !Array.isArray(achievementDefinitions)) {
             console.error("Hata: Başarım tanımları config dosyasında bulunamadı veya formatı hatalı.");
             return res.status(500).json({ message: "Sunucu yapılandırma hatası: Başarım tanımları eksik." });
        }
        // Tanımları döndür
        res.status(200).json({ definitions: achievementDefinitions });
    } catch (error) {
        console.error("Başarım tanımları getirilirken hata:", error);
        res.status(500).json({ message: "Başarım tanımları getirilirken bir sunucu hatası oluştu." });
    }
};


/**
 * Kullanıcının başarımlarını kontrol eder ve yenilerini ekler (Servis tarafından çağrılır).
 * Bu fonksiyon genellikle doğrudan API route'u olarak kullanılmaz,
 * log ekleme, takip etme gibi olaylar sonrası servis tarafından tetiklenir.
 */
exports.checkUserAchievements = async (userId) => {
    if (!userId) {
        console.error("Başarım kontrolü için userId gerekli.");
        return;
    }
    console.log(`Kullanıcı ${userId} için başarım kontrolü başlatılıyor...`);
    try {
        await achievementService.checkAndGrantAchievements(userId);
        console.log(`Kullanıcı ${userId} için başarım kontrolü tamamlandı.`);
    } catch (error) {
        console.error(`Kullanıcı ${userId} için başarım kontrolü sırasında hata:`, error);
    }
};