// backend/controllers/watchlistController.js
const { v4: uuidv4 } = require('uuid');
const {
    PutCommand, DeleteCommand, QueryCommand, GetCommand, UpdateCommand
} = require("@aws-sdk/lib-dynamodb");
const { docClient } = require('../config/awsConfig');
const { checkAndAwardAchievements } = require('../services/achievementService');
const USERS_TABLE = "Users";

const WATCHLIST_TABLE = 'Watchlist'; // DynamoDB Tablo Adı
const USER_WATCHLIST_INDEX = 'UserWatchlistIndex'; // GSI Adı

/**
 * Bir film veya diziyi kullanıcının izleme listesine ekler.
 * @route POST /api/watchlist
 */
exports.addItemToWatchlist = async (req, res) => {
    const userId = req.user?.userId;
    const { contentId, contentType } = req.body;

    // --- Doğrulamalar ---
    if (!userId) { return res.status(401).json({ message: 'Bu işlem için giriş yapmalısınız.' }); }
    if (!contentId || isNaN(Number(contentId))) { return res.status(400).json({ message: 'Geçerli bir içerik ID\'si (contentId) gönderilmelidir.' }); }
    if (!contentType || (contentType !== 'movie' && contentType !== 'tv')) { return res.status(400).json({ message: 'İçerik tipi (contentType) "movie" veya "tv" olmalıdır.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' }); }
    // --- Doğrulama Sonu ---

    const numericContentId = Number(contentId);
    const itemId = uuidv4(); // Her öğe için benzersiz PK
    const timestamp = new Date().toISOString();

    const newItem = {
        itemId: itemId, // Yeni PK
        userId: userId,
        contentId: numericContentId,
        contentType: contentType,
        addedAt: timestamp,
    };

    // Aynı öğenin tekrar eklenmesini önlemek için GSI üzerinden sorgu
    const checkParams = {
        TableName: WATCHLIST_TABLE,
        IndexName: USER_WATCHLIST_INDEX,
        KeyConditionExpression: "userId = :uid",
        FilterExpression: "contentId = :cid AND contentType = :ctype",
        ExpressionAttributeValues: {
            ":uid": userId,
            ":cid": numericContentId,
            ":ctype": contentType
        },
        ProjectionExpression: "itemId"
    };

    let mainOperationSuccessful = false; // Ana işlemin başarılı olup olmadığını takip et

    try {
        console.log(`Bilgi: İçerik ${contentType}/${numericContentId} watchlist'e eklenmeden önce kontrol ediliyor. UserId: ${userId}`);
        const { Items: existingItems } = await docClient.send(new QueryCommand(checkParams));

        if (existingItems && existingItems.length > 0) {
            console.warn(`Bilgi: İçerik ${contentType}/${numericContentId} zaten kullanıcının ${userId} watchlist'inde.`);
            return res.status(200).json({ message: 'İçerik zaten izleme listenizde.', itemId: existingItems[0].itemId });
        }

        // Öğeyi ekle
        const putParams = { TableName: WATCHLIST_TABLE, Item: newItem };
        console.log(`Bilgi: İçerik ${contentType}/${numericContentId} watchlist'e ekleniyor. UserId: ${userId}, ItemId: ${itemId}`);
        await docClient.send(new PutCommand(putParams));
        mainOperationSuccessful = true;
        console.log(`Bilgi: İçerik ${contentType}/${numericContentId} başarıyla watchlist'e eklendi.`);

        // Kullanıcı watchlistCount istatistiğini güncelle
        try {
            const updateUserStatsCommand = new UpdateCommand({
                TableName: USERS_TABLE, Key: { userId: userId },
                UpdateExpression: "ADD watchlistCount :inc",
                ExpressionAttributeValues: { ":inc": 1 },
                ReturnValues: "NONE"
            });
            await docClient.send(updateUserStatsCommand);
            console.log(`Bilgi: Kullanıcı ${userId} watchlistCount istatistiği güncellendi.`);
            // await checkAndAwardAchievements(userId); // Gerekirse başarım kontrolü
        } catch (statsError) {
            console.error(`HATA (İkincil): Kullanıcı ${userId} watchlistCount güncellenirken hata:`, statsError);
        }

        res.status(201).json({ message: 'İçerik izleme listesine eklendi.', item: newItem });

    } catch (error) {
        console.error(`HATA (Ana): Watchlist'e içerik eklenirken hata (UserId: ${userId}, Content: ${contentType}/${numericContentId}):`, error);
        if (mainOperationSuccessful) {
             console.error("KRİTİK: Ana işlem başarılı olmasına rağmen catch bloğuna girildi!");
        }
        res.status(500).json({ message: 'İçerik izleme listesine eklenirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Bir öğeyi (itemId ile belirtilen) kullanıcının izleme listesinden kaldırır.
 * @route DELETE /api/watchlist/:itemId
 */
exports.removeItemFromWatchlist = async (req, res) => {
    const userId = req.user?.userId;
    const { itemId } = req.params;

    if (!userId) { return res.status(401).json({ message: 'Bu işlem için giriş yapmalısınız.' }); }
    if (!itemId) { return res.status(400).json({ message: 'Geçerli bir öğe ID\'si (itemId) gönderilmelidir.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' }); }

    let mainOperationSuccessful = false;

    try {
        // Önce sahibini kontrol et
        const { Item: existingItem } = await docClient.send(new GetCommand({ TableName: WATCHLIST_TABLE, Key: { itemId: itemId }, ProjectionExpression: "userId" }));
        if (!existingItem) { return res.status(404).json({ message: 'Öğe bulunamadı.' }); }
        if (existingItem.userId !== userId) { return res.status(403).json({ message: 'Bu öğeyi silme yetkiniz yok.' }); }

        // Öğeyi sil
        const deleteParams = { TableName: WATCHLIST_TABLE, Key: { itemId: itemId } };
        console.log(`Bilgi: Watchlist öğesi siliniyor. ItemId: ${itemId}, UserId: ${userId}`);
        await docClient.send(new DeleteCommand(deleteParams));
        mainOperationSuccessful = true;
        console.log(`Bilgi: Watchlist öğesi ${itemId} başarıyla silindi.`);

        // Kullanıcı watchlistCount istatistiğini güncelle
         try {
             const updateUserStatsCommand = new UpdateCommand({
                 TableName: USERS_TABLE, Key: { userId: userId },
                 UpdateExpression: "SET watchlistCount = watchlistCount - :dec",
                 ConditionExpression: "watchlistCount > :zero",
                 ExpressionAttributeValues: { ":dec": 1, ":zero": 0 },
                 ReturnValues: "NONE"
             });
             await docClient.send(updateUserStatsCommand);
             console.log(`Bilgi: Kullanıcı ${userId} watchlistCount istatistiği güncellendi (azaltıldı).`);
         } catch (statsError) {
             if (statsError.name === 'ConditionalCheckFailedException') {
                  console.warn(`Uyarı: Kullanıcı ${userId} için watchlistCount azaltılamadı (muhtemelen zaten 0).`);
              } else {
                  console.error(`HATA (İkincil): Watchlist öğesi silindikten sonra kullanıcı ${userId} watchlistCount güncellenirken hata:`, statsError);
              }
         }

        res.status(200).json({ message: 'Öğe izleme listesinden kaldırıldı.' });

    } catch (error) {
        console.error(`HATA (Ana): Watchlist'ten öğe silinirken hata oluştu (UserId: ${userId}, ItemId: ${itemId}):`, error);
        if (mainOperationSuccessful) {
             console.error("KRİTİK: Ana silme işlemi başarılı olmasına rağmen catch bloğuna girildi!");
        }
        res.status(500).json({ message: 'Öğe izleme listesinden silinirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Giriş yapmış kullanıcının tüm izleme listesi öğelerini getirir.
 * @route GET /api/watchlist
 */
exports.getUserWatchlist = async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) { return res.status(401).json({ message: 'İzleme listesini görmek için giriş yapmalısınız.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' }); }

    const params = {
        TableName: WATCHLIST_TABLE,
        IndexName: USER_WATCHLIST_INDEX,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
        ProjectionExpression: "itemId, contentId, contentType, addedAt",
        ScanIndexForward: false // En yeniden eskiye sırala
    };

    try {
        console.log(`Bilgi: Kullanıcı ${userId} için watchlist sorgulanıyor...`);
        const { Items } = await docClient.send(new QueryCommand(params));
        console.log(`Bilgi: Kullanıcı ${userId} için ${Items ? Items.length : 0} adet watchlist öğesi bulundu.`);
        res.status(200).json({ watchlist: Items || [] });
    } catch (error) {
        console.error(`HATA: Kullanıcı ${userId} watchlist'i getirilirken hata oluştu:`, error);
        res.status(500).json({ message: 'İzleme listesi getirilirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Belirtilen kullanıcının tüm izleme listesi öğelerini getirir (Public).
 * @route GET /api/watchlist/user/:userId
 */
exports.getPublicUserWatchlist = async (req, res) => {
    const { userId: targetUserId } = req.params;

    if (!targetUserId) { return res.status(400).json({ message: 'Kullanıcı ID\'si belirtilmelidir.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' }); }

    // GSI üzerinden kullanıcının tüm öğelerini çek
    const params = {
        TableName: WATCHLIST_TABLE,
        IndexName: USER_WATCHLIST_INDEX, // GSI Adı
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": targetUserId },
        // Frontend'in detayları çekmesi için gerekli alanlar
        ProjectionExpression: "itemId, contentId, contentType, addedAt",
        ScanIndexForward: false // En yeniden eskiye sırala (addedAt'e göre)
    };

    try {
        console.log(`Bilgi: Kullanıcı ${targetUserId} için public watchlist sorgulanıyor...`);
        const { Items } = await docClient.send(new QueryCommand(params));
        console.log(`Bilgi: Kullanıcı ${targetUserId} için ${Items ? Items.length : 0} adet public watchlist öğesi bulundu.`);
        res.status(200).json({ watchlist: Items || [] });
    } catch (error) {
        console.error(`HATA: Kullanıcı ${targetUserId} public watchlist'i getirilirken hata oluştu:`, error);
        res.status(500).json({ message: 'Kullanıcının izleme listesi getirilirken bir sunucu hatası oluştu.' });
    }
};


/**
 * Belirli bir içeriğin kullanıcının izleme listesinde olup olmadığını kontrol eder.
 * @route GET /api/watchlist/status/:contentType/:contentId
 */
exports.getWatchlistStatusForItem = async (req, res) => {
    const userId = req.user?.userId;
    const { contentType, contentId } = req.params;

    if (!userId) { return res.status(200).json({ isInWatchlist: false, itemId: null }); }
    if (!contentId || isNaN(Number(contentId))) { return res.status(400).json({ message: 'Geçerli bir içerik ID\'si (contentId) gönderilmelidir.' }); }
    if (!contentType || (contentType !== 'movie' && contentType !== 'tv')) { return res.status(400).json({ message: 'İçerik tipi (contentType) "movie" veya "tv" olmalıdır.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' }); }

    const numericContentId = Number(contentId);

    const params = {
        TableName: WATCHLIST_TABLE,
        IndexName: USER_WATCHLIST_INDEX,
        KeyConditionExpression: "userId = :uid",
        FilterExpression: "contentId = :cid AND contentType = :ctype",
        ExpressionAttributeValues: { ":uid": userId, ":cid": numericContentId, ":ctype": contentType },
        ProjectionExpression: "itemId",
        Limit: 1
    };

    try {
        console.log(`Bilgi: İçerik ${contentType}/${numericContentId} için watchlist durumu sorgulanıyor. UserId: ${userId}`);
        const { Items, Count } = await docClient.send(new QueryCommand(params));
        const isInWatchlist = Count > 0;
        const itemId = isInWatchlist ? Items[0].itemId : null;
        console.log(`Bilgi: İçerik ${contentType}/${numericContentId} watchlist durumu: ${isInWatchlist}, ItemId: ${itemId}`);
        res.status(200).json({ isInWatchlist: isInWatchlist, itemId: itemId });
    } catch (error) {
        console.error(`HATA: Watchlist durumu sorgulanırken hata (UserId: ${userId}, Content: ${contentType}/${numericContentId}):`, error);
        res.status(500).json({ message: 'Durum kontrol edilirken hata oluştu.', isInWatchlist: false, itemId: null });
    }
};
