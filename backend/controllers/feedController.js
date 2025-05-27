// backend/controllers/feedController.js
const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { BatchGetItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const { docClient, ddbClient } = require('../config/awsConfig');

const FOLLOWS_TABLE = 'Follows'; // Takip tablosu adı
const LOGS_TABLE = 'Logs'; // Log tablosu adı
const USERS_TABLE = 'Users'; // Kullanıcı tablosu adı
const USER_LOGS_INDEX = 'UserLogsIndex'; // Loglar için GSI adı
const MAX_LOGS_PER_FOLLOWED_USER = 5; // Her takip edilen için en fazla kaç log getirilecek (filtreleme öncesi)
const MAX_FEED_ITEMS = 30; // Akışta gösterilecek toplam maksimum log sayısı (filtreleme sonrası)

/**
 * Giriş yapmış kullanıcının aktivite akışını (takip ettiklerinin logları) getirir.
 * Sadece isActivity=true olan logları alır.
 * @route GET /api/feed
 */
exports.getFeed = async (req, res) => {
    const loggedInUserId = req.user?.userId; // Giriş yapmış kullanıcının ID'si

    // Giriş kontrolü
    if (!loggedInUserId) {
        return res.status(401).json({ message: 'Akışı görmek için giriş yapmalısınız.' });
    }
    // Veritabanı istemcileri kontrolü
    if (!docClient || !ddbClient) {
        console.error("feedController HATA: docClient veya ddbClient başlatılamamış!");
        return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' });
    }

    try {
        // 1. Kullanıcının takip ettiği kişilerin ID'lerini al
        const followingParams = {
            TableName: FOLLOWS_TABLE,
            KeyConditionExpression: "followerUserId = :uid", // Takip eden ID'sine göre sorgula
            ExpressionAttributeValues: { ":uid": loggedInUserId },
            ProjectionExpression: "followingUserId" // Sadece takip edilen ID'yi al
        };
        const { Items: followingItems } = await docClient.send(new QueryCommand(followingParams));

        // Eğer kimseyi takip etmiyorsa boş akış döndür
        if (!followingItems || followingItems.length === 0) {
            console.log(`Bilgi: Kullanıcı ${loggedInUserId} kimseyi takip etmiyor.`);
            return res.status(200).json({ feed: [] });
        }

        // Takip edilen kullanıcı ID'lerini bir diziye aktar
        const followingUserIds = followingItems.map(item => item.followingUserId);
        console.log(`Bilgi: Kullanıcı ${loggedInUserId}, ${followingUserIds.length} kişiyi takip ediyor.`);
        // Geçerli ID'leri filtrele (null/undefined olmamalı)
        const validFollowingUserIds = followingUserIds.filter(id => id && typeof id === 'string');
        if (validFollowingUserIds.length === 0) {
             return res.status(200).json({ feed: [] });
         }

        // 2. Her geçerli takip edilen kullanıcının son AKTİVİTE loglarını çek
        let allLogs = []; // Tüm logları tutacak dizi
        // Her takip edilen kullanıcı için log çekme promise'ları oluştur
        const logPromises = validFollowingUserIds.map(followedUserId => {
            const logParams = {
                TableName: LOGS_TABLE,
                IndexName: USER_LOGS_INDEX, // GSI kullanarak kullanıcıya göre sorgula
                KeyConditionExpression: "userId = :uid",
                // <<< YENİ: Sadece aktivite sayılanları filtrele >>>
                FilterExpression: "isActivity = :trueVal", // isActivity alanı true olanları filtrele
                ExpressionAttributeValues: {
                    ":uid": followedUserId,
                    ":trueVal": true // isActivity=true olanlar
                },
                // <<< YENİ SONU >>>
                ScanIndexForward: false, // En yeniden eskiye sırala (createdAt'e göre)
                Limit: MAX_LOGS_PER_FOLLOWED_USER // Her kullanıcı için limit
            };
            // Sorguyu gönder, hata olursa boş dizi döndür
            return docClient.send(new QueryCommand(logParams)).catch(err => {
                console.error(`HATA: Kullanıcı ${followedUserId} için aktivite logları çekilirken hata:`, err);
                return { Items: [] };
            });
        });

        // Tüm log çekme promise'larının tamamlanmasını bekle
        const logResults = await Promise.all(logPromises);
        // Sonuçları tek bir diziye topla
        logResults.forEach(result => { if (result && result.Items) allLogs = allLogs.concat(result.Items); });

        // Eğer hiç log bulunamadıysa boş akış döndür
        if (allLogs.length === 0) {
            console.log(`Bilgi: Takip edilen kullanıcılardan hiç aktivite logu bulunamadı.`);
            return res.status(200).json({ feed: [] });
        }

        // 3. Logları tarihe göre sırala ve genel akış limitini uygula
        allLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const limitedLogs = allLogs.slice(0, MAX_FEED_ITEMS);
        console.log(`Bilgi: Akış için ${limitedLogs.length} aktivite logu bulundu ve sıralandı.`);

        // 4. Loglardaki kullanıcı ID'lerini topla ve kullanıcı bilgilerini (avatar, username, isVerified) çek
        const userIdsInFeed = [...new Set(limitedLogs.map(log => log.userId).filter(id => !!id))];
        let userInfoMap = {}; // Kullanıcı bilgilerini { userId: userInfo } şeklinde tutacak map

        // Eğer çekilecek kullanıcı ID'si varsa BatchGetItem kullan
        if (userIdsInFeed.length > 0) {
            const userKeys = userIdsInFeed.map(id => marshall({ userId: id })); // DynamoDB formatına çevir
            const batchGetParams = {
                RequestItems: {
                    [USERS_TABLE]: { // Users tablosundan
                        Keys: userKeys,
                        ProjectionExpression: "userId, username, avatarUrl, isVerified" // İstenen alanlar
                    }
                }
            };
            try {
                 // Kullanıcı bilgilerini toplu olarak çek
                 const batchData = await ddbClient.send(new BatchGetItemCommand(batchGetParams));
                 // Başarılı yanıtları işle ve userInfoMap'e ekle
                 if (batchData.Responses && batchData.Responses[USERS_TABLE]) {
                     batchData.Responses[USERS_TABLE].forEach(marshalledItem => {
                         const user = unmarshall(marshalledItem); // DynamoDB formatından çevir
                         userInfoMap[user.userId] = {
                             username: user.username,
                             avatarUrl: user.avatarUrl, // undefined olabilir
                             isVerified: user.isVerified ?? false // isVerified eklendi (yoksa false)
                         };
                     });
                 }
                 console.log(`Bilgi: ${Object.keys(userInfoMap).length} kullanıcının bilgisi bulundu ve map'e eklendi.`);
                 // İşlenemeyen anahtarlar varsa uyar
                 if (batchData.UnprocessedKeys && batchData.UnprocessedKeys[USERS_TABLE]?.Keys?.length > 0) {
                      console.warn(`Uyarı: ${batchData.UnprocessedKeys[USERS_TABLE].Keys.length} kullanıcının bilgisi BatchGet ile alınamadı (Feed).`);
                 }
             } catch (batchError) {
                  // BatchGet hatasını logla ama devam et
                  console.error(`HATA: BatchGetItemCommand sırasında hata oluştu (Feed):`, batchError);
             }
        } else {
             console.log("Bilgi: Akıştaki loglarda geçerli kullanıcı ID'si bulunamadı.");
        }

        // 5. Kullanıcı bilgilerini loglara ekle
        const feedItems = limitedLogs.map(log => ({
            ...log,
            // userInfoMap'ten bilgileri al, yoksa varsayılanı kullan
            userInfo: userInfoMap[log.userId] || { username: 'Bilinmeyen Kullanıcı', avatarUrl: null, isVerified: false }
        }));

        console.log(`Bilgi: Son akış öğesi sayısı: ${feedItems.length}`);
        // Sonucu döndür
        res.status(200).json({ feed: feedItems });

    } catch (error) {
        // Genel hata durumunu logla ve 500 döndür
        console.error(`HATA: Akış getirilirken genel hata oluştu (Kullanıcı: ${loggedInUserId}):`, error);
        res.status(500).json({ message: 'Akış getirilirken bir sunucu hatası oluştu.' });
    }
};
