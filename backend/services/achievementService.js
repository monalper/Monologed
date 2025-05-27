// backend/services/achievementService.js
const { GetCommand, QueryCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require('../config/awsConfig');
const { ACHIEVEMENTS } = require('../config/achievements'); // Tanımları import et

const USERS_TABLE = "Users";
const USER_ACHIEVEMENTS_TABLE = "UserAchievements";

/**
 * Kullanıcının istatistiklerine göre hak ettiği ama henüz kazanmadığı
 * başarımları kontrol eder ve UserAchievements tablosuna ekler.
 * @param {string} userId - Başarımları kontrol edilecek kullanıcının ID'si.
 */
async function checkAndAwardAchievements(userId) {
    if (!userId || !docClient) {
        console.error("checkAndAwardAchievements: Geçersiz userId veya docClient.");
        return;
    }

    console.log(`Bilgi: Kullanıcı ${userId} için başarımlar kontrol ediliyor...`);

    try {
        // 1. Kullanıcının güncel istatistiklerini çek
        const userStatsCmd = new GetCommand({
            TableName: USERS_TABLE,
            Key: { userId: userId },
            ProjectionExpression: "logCount, reviewCount, listCount, followingCount, followerCount, watchlistCount" // İhtiyaç duyulan sayaçlar
        });
        const { Item: userStats } = await docClient.send(userStatsCmd);

        if (!userStats) {
            console.warn(`Uyarı: Kullanıcı ${userId} istatistikleri bulunamadı.`);
            return;
        }

        // 2. Kullanıcının mevcut başarımlarını çek (sadece ID'ler yeterli)
        const earnedAchievementsCmd = new QueryCommand({
            TableName: USER_ACHIEVEMENTS_TABLE,
            KeyConditionExpression: "userId = :uid",
            ExpressionAttributeValues: { ":uid": userId },
            ProjectionExpression: "achievementId"
        });
        const { Items: earnedItems } = await docClient.send(earnedAchievementsCmd);
        const earnedAchievementIds = new Set(earnedItems.map(item => item.achievementId)); // Hızlı kontrol için Set kullan

        // 3. Tüm tanımlı başarımları döngüye al
        for (const achievementId in ACHIEVEMENTS) {
            const achievement = ACHIEVEMENTS[achievementId];

            // 4. Kullanıcı bu başarımı zaten kazanmış mı?
            if (earnedAchievementIds.has(achievement.id)) {
                continue; // Zaten kazanılmış, sonraki başarıma geç
            }

            // 5. Kriterleri kontrol et
            let criteriaMet = false;
            const criteria = achievement.criteria;
            const userStatValue = userStats[criteria.type]; // İlgili istatistiği al (örn: userStats.logCount)

            if (userStatValue !== undefined && userStatValue !== null) {
                 // Şimdilik sadece >= kontrolü yapalım
                 if (userStatValue >= criteria.value) {
                     criteriaMet = true;
                 }
                 // İleride daha karmaşık kriterler (örn: türe göre log sayısı) eklenebilir
            }

            // 6. Kriter karşılandıysa ve başarım kazanılmadıysa, kazandır!
            if (criteriaMet) {
                console.log(`Bilgi: Kullanıcı ${userId}, "${achievement.name}" (${achievement.id}) başarımı için kriterleri karşıladı!`);
                const newAchievementItem = {
                    userId: userId,
                    achievementId: achievement.id,
                    earnedAt: new Date().toISOString()
                };

                const awardCmd = new PutCommand({
                    TableName: USER_ACHIEVEMENTS_TABLE,
                    Item: newAchievementItem,
                    // Koşul: Aynı userId ve achievementId ile başka kayıt yoksa ekle (önemli!)
                    ConditionExpression: "attribute_not_exists(achievementId)"
                });

                try {
                    await docClient.send(awardCmd);
                    console.log(`Bilgi: Kullanıcı ${userId} için "${achievement.name}" başarımı başarıyla kaydedildi.`);
                    // TODO: İsteğe bağlı olarak burada kullanıcıya bildirim gönderme mantığı eklenebilir.
                } catch (awardError) {
                    if (awardError.name === 'ConditionalCheckFailedException') {
                        // Bu beklenen bir durum olabilir (çok hızlı işlemler sonucu race condition)
                        console.warn(`Uyarı: Kullanıcı ${userId} için ${achievement.id} başarımı zaten eklenmiş veya eklenirken çakışma oldu.`);
                    } else {
                        console.error(`HATA: Başarım ${achievement.id} kullanıcı ${userId} için kaydedilirken hata:`, awardError);
                    }
                }
            }
        }
        console.log(`Bilgi: Kullanıcı ${userId} için başarım kontrolü tamamlandı.`);

    } catch (error) {
        console.error(`HATA: Kullanıcı ${userId} için başarım kontrolü sırasında genel hata:`, error);
    }
}

module.exports = { checkAndAwardAchievements };