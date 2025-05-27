// Monologed/backend/controllers/adminController.js
const { PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require('../config/awsConfig');
const crypto = require('crypto');

const USERS_TABLE = "Users";
const LOGS_TABLE = "Logs";
const EDITORIAL_PAGES_TABLE = 'EditorialPages';
// Adminin kendi sayfalarını çekmek için GSI adı (opsiyonel, ama önerilir)
const AUTHOR_ADMIN_ID_INDEX = 'AuthorAdminIdIndex'; // Örnek GSI adı: PK: authorAdminId, SK: createdAt

/**
 * Genel site istatistiklerini getirir (Admin yetkisi gerektirir).
 */
exports.getSiteStats = async (req, res) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ message: 'Bu işlem için yönetici yetkiniz bulunmamaktadır.' });
    }
    if (!docClient) {
        return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' });
    }
    try {
        const userCountParams = { TableName: USERS_TABLE, Select: "COUNT" };
        const { Count: totalUsers } = await docClient.send(new ScanCommand(userCountParams));

        const logCountParams = { TableName: LOGS_TABLE, Select: "COUNT" };
        const { Count: totalLogs } = await docClient.send(new ScanCommand(logCountParams));

        let uniqueMovies = new Set();
        let uniqueTvs = new Set();
        let lastEvaluatedKeyLogs;
        const logScanParams = {
            TableName: LOGS_TABLE,
            ProjectionExpression: "contentId, contentType"
        };
        do {
            const scanLogsCommand = new ScanCommand({ ...logScanParams, ExclusiveStartKey: lastEvaluatedKeyLogs });
            const { Items: logItems, LastEvaluatedKey } = await docClient.send(scanLogsCommand);
            lastEvaluatedKeyLogs = LastEvaluatedKey;
            if (logItems) {
                logItems.forEach(item => {
                    if (item.contentType === 'movie' && item.contentId) uniqueMovies.add(item.contentId);
                    else if (item.contentType === 'tv' && item.contentId) uniqueTvs.add(item.contentId);
                });
            }
        } while (lastEvaluatedKeyLogs);

        const stats = {
            totalUsers: totalUsers ?? 0,
            totalLogs: totalLogs ?? 0,
            totalUniqueMoviesLogged: uniqueMovies.size,
            totalUniqueTvsLogged: uniqueTvs.size,
        };
        res.status(200).json(stats);
    } catch (error) {
        console.error("HATA: Site istatistikleri getirilirken hata:", error);
        res.status(500).json({ message: 'Site istatistikleri getirilirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Yeni bir editöryel sayfa oluşturur. (Admin yetkisi gerektirir)
 * @route POST /api/admin/editorial-pages
 */
exports.createEditorialPage = async (req, res) => {
    const adminUserId = req.user?.userId;
    const adminUsername = req.user?.username;
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Yetkisiz işlem." });

    const {
        pageTitle,
        pageSlug,
        customBody,
        contentType,
        contentId,
        tmdbTitle,
        coverImageUrl,
        isPublished = false // Frontend'den boolean gelmeli
    } = req.body;

    if (!pageTitle || !pageSlug || !customBody) {
        return res.status(400).json({ message: "Sayfa başlığı, slug ve içerik alanları zorunludur." });
    }
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });

    const pageId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const newPage = {
        pageId,
        pageTitle: pageTitle.trim(),
        pageSlug: pageSlug.trim().toLowerCase().replace(/\s+/g, '-'),
        customBody,
        contentType: contentType || null,
        contentId: contentId ? Number(contentId) : null,
        tmdbTitle: tmdbTitle || null,
        coverImageUrl: coverImageUrl || null,
        authorAdminId: adminUserId, // Bu alanın kaydedildiğinden emin olun
        authorUsername: adminUsername,
        isPublished: typeof isPublished === 'boolean' ? isPublished : false, // Boolean olarak kaydedildiğinden emin ol
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    try {
        await docClient.send(new PutCommand({ TableName: EDITORIAL_PAGES_TABLE, Item: newPage }));
        console.log(`[createEditorialPage] Editöryel sayfa oluşturuldu: ID ${pageId}, Başlık: ${newPage.pageTitle}, Yazar: ${adminUsername}, Yayınlandı: ${newPage.isPublished}`);
        res.status(201).json({ message: "Editöryel sayfa başarıyla oluşturuldu.", page: newPage });
    } catch (error) {
        console.error("HATA: Editöryel sayfa oluşturulurken:", error);
        res.status(500).json({ message: "Sayfa oluşturulurken bir sunucu hatası oluştu." });
    }
};

/**
 * Adminin oluşturduğu tüm editöryel sayfaları listeler.
 * @route GET /api/admin/editorial-pages
 */
exports.getAdminEditorialPages = async (req, res) => {
    const adminUserId = req.user?.userId;
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Yetkisiz işlem." });
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });

    console.log(`[getAdminEditorialPages] Admin ${adminUserId} için sayfalar çekiliyor.`);

    // Tercihen GSI kullanın: AuthorAdminIdIndex (PK: authorAdminId, SK: createdAt)
    // Eğer GSI varsa:
    /*
    const params = {
        TableName: EDITORIAL_PAGES_TABLE,
        IndexName: AUTHOR_ADMIN_ID_INDEX,
        KeyConditionExpression: "authorAdminId = :adminIdVal",
        ExpressionAttributeValues: {
            ":adminIdVal": adminUserId
        },
        ProjectionExpression: "pageId, pageTitle, pageSlug, isPublished, createdAt, updatedAt, contentType, tmdbTitle, authorUsername",
        ScanIndexForward: false // En yeni başta
    };
    const command = new QueryCommand(params);
    */

    // GSI yoksa, Scan ile FilterExpression kullanın (daha az verimli)
     const params = {
        TableName: EDITORIAL_PAGES_TABLE,
        FilterExpression: "authorAdminId = :adminIdVal",
        ExpressionAttributeValues: {
            ":adminIdVal": adminUserId
        },
        ProjectionExpression: "pageId, pageTitle, pageSlug, isPublished, createdAt, updatedAt, contentType, tmdbTitle, authorUsername"
    };
    const command = new ScanCommand(params);


    try {
        console.log(`[getAdminEditorialPages] DynamoDB sorgu parametreleri:`, JSON.stringify(params, null, 2));
        const { Items } = await docClient.send(command);
        
        if (!Items) {
            console.log(`[getAdminEditorialPages] Admin ${adminUserId} için Items dizisi null/undefined döndü.`);
            return res.status(200).json({ pages: [] });
        }
        
        console.log(`[getAdminEditorialPages] Admin ${adminUserId} için sorgu sonucu ${Items.length} öğe bulundu (sıralama öncesi).`);

        const sortedItems = Items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        console.log(`[getAdminEditorialPages] Admin ${adminUserId} için ${sortedItems.length} sayfa bulundu (sıralama sonrası).`);
        res.status(200).json({ pages: sortedItems });
    } catch (error) {
        console.error(`HATA: Admin editöryel sayfaları listelenirken (AdminID: ${adminUserId}):`, error);
        if (error.name === 'ResourceNotFoundException') {
             console.error(`[getAdminEditorialPages] HATA: Tablo (${EDITORIAL_PAGES_TABLE}) veya Index (${AUTHOR_ADMIN_ID_INDEX} - eğer kullanılıyorsa) bulunamadı.`);
        }
        res.status(500).json({ message: "Sayfalar listelenirken bir sunucu hatası oluştu." });
    }
};

/**
 * Belirli bir editöryel sayfayı ID ile getirir (düzenleme için).
 * @route GET /api/admin/editorial-pages/:pageId
 */
exports.getAdminEditorialPageById = async (req, res) => {
    const { pageId } = req.params;
    const adminUserId = req.user?.userId;
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Yetkisiz işlem." });
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    console.log(`[getAdminEditorialPageById] Admin ${adminUserId}, sayfa ID ${pageId} için detayları çekiyor.`);
    try {
        const { Item } = await docClient.send(new GetCommand({ TableName: EDITORIAL_PAGES_TABLE, Key: { pageId } }));
        if (!Item) {
            console.log(`[getAdminEditorialPageById] Sayfa ID ${pageId} bulunamadı.`);
            return res.status(404).json({ message: "Editöryel sayfa bulunamadı." });
        }
        if (Item.authorAdminId !== adminUserId) {
            console.warn(`[getAdminEditorialPageById] Yetkisiz erişim denemesi: Admin ${adminUserId}, sayfa ${pageId}'nin sahibi değil (Sahip: ${Item.authorAdminId}).`);
            return res.status(403).json({ message: "Bu sayfayı görüntüleme/düzenleme yetkiniz yok." });
        }
        console.log(`[getAdminEditorialPageById] Sayfa ${pageId} bulundu: ${Item.pageTitle}`);
        res.status(200).json({ page: Item });
    } catch (error) {
        console.error(`HATA: Admin editöryel sayfa getirilirken (ID: ${pageId}):`, error);
        res.status(500).json({ message: "Sayfa getirilirken bir sunucu hatası oluştu." });
    }
};

/**
 * Bir editöryel sayfayı günceller.
 * @route PUT /api/admin/editorial-pages/:pageId
 */
exports.updateEditorialPage = async (req, res) => {
    const { pageId } = req.params;
    const adminUserId = req.user?.userId;
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Yetkisiz işlem." });
    console.log(`[updateEditorialPage] Admin ${adminUserId}, sayfa ID ${pageId}'i güncelliyor.`);
    const { pageTitle, pageSlug, customBody, contentType, contentId, tmdbTitle, coverImageUrl, isPublished } = req.body;
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });

    let existingPage;
    try {
        const { Item } = await docClient.send(new GetCommand({ TableName: EDITORIAL_PAGES_TABLE, Key: { pageId } }));
        if (!Item) return res.status(404).json({ message: "Güncellenecek sayfa bulunamadı." });
        if (Item.authorAdminId !== adminUserId) return res.status(403).json({ message: "Bu sayfayı güncelleme yetkiniz yok." });
        existingPage = Item;
    } catch (getErr) {
        return res.status(500).json({ message: "Sayfa bilgileri alınırken hata." });
    }

    const updateExpressionParts = [];
    const expressionAttributeValues = { ":uidCond": adminUserId };
    const expressionAttributeNames = {};

    if (pageTitle !== undefined) { updateExpressionParts.push("pageTitle = :pt"); expressionAttributeValues[":pt"] = pageTitle.trim(); }
    if (pageSlug !== undefined) { updateExpressionParts.push("pageSlug = :ps"); expressionAttributeValues[":ps"] = pageSlug.trim().toLowerCase().replace(/\s+/g, '-'); }
    if (customBody !== undefined) { updateExpressionParts.push("customBody = :cb"); expressionAttributeValues[":cb"] = customBody; }
    if (contentType !== undefined) { updateExpressionParts.push("contentType = :ct"); expressionAttributeValues[":ct"] = contentType || null; }
    if (contentId !== undefined) { updateExpressionParts.push("contentId = :ci"); expressionAttributeValues[":ci"] = contentId ? Number(contentId) : null; }
    if (tmdbTitle !== undefined) { updateExpressionParts.push("tmdbTitle = :tti"); expressionAttributeValues[":tti"] = tmdbTitle || null; }
    if (coverImageUrl !== undefined) { updateExpressionParts.push("coverImageUrl = :ciu"); expressionAttributeValues[":ciu"] = coverImageUrl || null; }
    if (typeof isPublished === 'boolean') { updateExpressionParts.push("isPublished = :ip"); expressionAttributeValues[":ip"] = isPublished; }

    if (updateExpressionParts.length === 0) {
        return res.status(400).json({ message: "Güncellenecek bir bilgi gönderilmedi." });
    }
    updateExpressionParts.push("updatedAt = :ts");
    expressionAttributeValues[":ts"] = new Date().toISOString();

    const updateParams = {
        TableName: EDITORIAL_PAGES_TABLE,
        Key: { pageId },
        ConditionExpression: "authorAdminId = :uidCond",
        UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ...(Object.keys(expressionAttributeNames).length > 0 && { ExpressionAttributeNames }),
        ReturnValues: "ALL_NEW"
    };
    console.log(`[updateEditorialPage] Güncelleme parametreleri:`, JSON.stringify(updateParams, null, 2));
    try {
        const { Attributes } = await docClient.send(new UpdateCommand(updateParams));
        console.log(`[updateEditorialPage] Sayfa ${pageId} güncellendi. Yayın durumu: ${Attributes.isPublished}`);
        res.status(200).json({ message: "Editöryel sayfa başarıyla güncellendi.", page: Attributes });
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') return res.status(403).json({ message: "Sayfa güncellenemedi (yetki sorunu)." });
        console.error(`HATA: Editöryel sayfa güncellenirken (ID: ${pageId}):`, error);
        res.status(500).json({ message: "Sayfa güncellenirken bir sunucu hatası oluştu." });
    }
};

/**
 * Bir editöryel sayfayı siler.
 * @route DELETE /api/admin/editorial-pages/:pageId
 */
exports.deleteEditorialPage = async (req, res) => {
    const { pageId } = req.params;
    const adminUserId = req.user?.userId;
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Yetkisiz işlem." });
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    console.log(`[deleteEditorialPage] Admin ${adminUserId}, sayfa ID ${pageId}'i silmeye çalışıyor.`);
    try {
        const { Item } = await docClient.send(new GetCommand({ TableName: EDITORIAL_PAGES_TABLE, Key: { pageId }, ProjectionExpression: "authorAdminId" }));
        if (!Item) {
            console.log(`[deleteEditorialPage] Sayfa ID ${pageId} bulunamadı.`);
            return res.status(404).json({ message: "Silinecek sayfa bulunamadı." });
        }
        if (Item.authorAdminId !== adminUserId) {
            console.warn(`[deleteEditorialPage] Yetkisiz silme denemesi: Admin ${adminUserId}, sayfa ${pageId}'nin sahibi değil (Sahip: ${Item.authorAdminId}).`);
            return res.status(403).json({ message: "Bu sayfayı silme yetkiniz yok." });
        }
        await docClient.send(new DeleteCommand({ TableName: EDITORIAL_PAGES_TABLE, Key: { pageId } }));
        console.log(`[deleteEditorialPage] Sayfa ${pageId} silindi.`);
        res.status(200).json({ message: "Editöryel sayfa başarıyla silindi." });
    } catch (error) {
        console.error(`HATA: Editöryel sayfa silinirken (ID: ${pageId}):`, error);
        res.status(500).json({ message: "Sayfa silinirken bir sunucu hatası oluştu." });
    }
};

/**
 * Yeni bir editöryel top list oluşturur. (Admin yetkisi gerektirir)
 * @route POST /api/admin/editorial-toplist
 */
exports.createEditorialTopList = async (req, res) => {
    const adminUserId = req.user?.userId;
    const adminUsername = req.user?.username;
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Yetkisiz işlem." });

    const {
        listName,
        description,
        coverImageUrl,
        items
    } = req.body;

    if (!listName || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Liste adı ve en az 1 içerik zorunludur." });
    }

    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });

    const listId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const newList = {
        listId,
        listName: listName.trim(),
        description: description?.trim() || null,
        coverImageUrl: coverImageUrl?.trim() || null,
        items: items.map((item, index) => ({
            ...item,
            rank: index + 1
        })),
        authorAdminId: adminUserId,
        authorUsername: adminUsername,
        isPublished: true,
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    try {
        await docClient.send(new PutCommand({ 
            TableName: EDITORIAL_PAGES_TABLE, 
            Item: {
                ...newList,
                pageId: listId,
                pageTitle: listName.trim(),
                pageSlug: listName.trim().toLowerCase().replace(/\s+/g, '-'),
                customBody: description?.trim() || null,
                contentType: 'toplist',
                isEditorialTopList: true
            }
        }));

        console.log(`[createEditorialTopList] Editöryel top list oluşturuldu: ID ${listId}, Başlık: ${newList.listName}, Yazar: ${adminUsername}`);
        res.status(201).json({ 
            message: "Editöryel top list başarıyla oluşturuldu.", 
            list: newList 
        });
    } catch (error) {
        console.error("HATA: Editöryel top list oluşturulurken:", error);
        res.status(500).json({ message: "Liste oluşturulurken bir sunucu hatası oluştu." });
    }
};
