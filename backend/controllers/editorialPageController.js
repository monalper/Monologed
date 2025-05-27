// Monologed/backend/controllers/editorialPageController.js
const { GetCommand, QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require('../config/awsConfig');
const EDITORIAL_PAGES_TABLE = 'EditorialPages';
const EDITORIAL_PAGE_SLUG_INDEX = 'EditorialPageSlugIndex';

/**
 * Herkese açık, yayınlanmış bir editöryel sayfayı slug ile getirir.
 * @route GET /api/editorial-pages/:slug
 */
exports.getPublicEditorialPageBySlug = async (req, res) => {
    const { slug } = req.params;
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    if (!slug) return res.status(400).json({ message: 'Sayfa slug parametresi eksik.' });

    console.log(`[editorialPageController.getPublicEditorialPageBySlug] Talep edilen slug: "${slug}"`);

    const params = {
        TableName: EDITORIAL_PAGES_TABLE,
        IndexName: EDITORIAL_PAGE_SLUG_INDEX,
        KeyConditionExpression: "pageSlug = :slug_val",
        FilterExpression: "isPublished = :isPub_val",
        ExpressionAttributeValues: {
            ":slug_val": slug,
            ":isPub_val": true
        },
    };

    try {
        console.log(`[editorialPageController.getPublicEditorialPageBySlug] DynamoDB sorgu parametreleri:`, JSON.stringify(params, null, 2));
        const { Items } = await docClient.send(new QueryCommand(params));

        if (!Items || Items.length === 0) {
            console.log(`[editorialPageController.getPublicEditorialPageBySlug] Slug "${slug}" için GSI üzerinden yayınlanmış sayfa bulunamadı. Veritabanındaki 'isPublished' (boolean true olmalı) ve 'pageSlug' değerlerini kontrol edin. GSI güncelliğini de göz önünde bulundurun.`);
            return res.status(404).json({ message: 'Editöryel sayfa bulunamadı veya henüz yayınlanmamış.' });
        }

        if (Items.length > 1) {
            console.warn(`[editorialPageController.getPublicEditorialPageBySlug] UYARI: Slug "${slug}" için birden fazla yayınlanmış sayfa bulundu. Bu durum beklenmiyor, slug'ların benzersiz olması gerekir. İlk sayfa döndürülüyor.`);
        }
        
        const pageData = Items[0];
        if (pageData.isPublished !== true) {
            console.log(`[editorialPageController.getPublicEditorialPageBySlug] Sayfa (ID: ${pageData.pageId}, Slug: "${slug}") bulundu ancak 'isPublished' değeri 'true' değil. Değer: ${pageData.isPublished}`);
            return res.status(404).json({ message: 'Editöryel sayfa yayında değil.' });
        }

        console.log(`[editorialPageController.getPublicEditorialPageBySlug] Sayfa bulundu: ${pageData.pageTitle} (ID: ${pageData.pageId}), Yayın Durumu: ${pageData.isPublished}`);
        res.status(200).json({ page: pageData });

    } catch (error) {
        console.error(`HATA: Editöryel sayfa getirilirken hata (Slug: ${slug}):`, error);
        if (error.name === 'ResourceNotFoundException') {
             console.error(`[editorialPageController.getPublicEditorialPageBySlug] HATA: Tablo (${EDITORIAL_PAGES_TABLE}) veya Index (${EDITORIAL_PAGE_SLUG_INDEX}) bulunamadı.`);
        }
        res.status(500).json({ message: 'Sayfa getirilirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Herkese açık, yayınlanmış tüm editöryel sayfaların bir listesini getirir.
 * @route GET /api/editorial-pages
 */
exports.listPublicEditorialPages = async (req, res) => {
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    const params = {
        TableName: EDITORIAL_PAGES_TABLE,
        FilterExpression: "isPublished = :isPub",
        ExpressionAttributeValues: {
            ":isPub": true
        },
        ProjectionExpression: "pageId, pageTitle, pageSlug, coverImageUrl, createdAt, authorUsername, contentType, contentId, tmdbTitle, isPublished"
    };
    const command = new ScanCommand(params); // GSI varsa QueryCommand daha iyi olur
    try {
        console.log("[editorialPageController.listPublicEditorialPages] Yayınlanmış editöryel sayfalar sorgulanıyor...");
        const { Items } = await docClient.send(command);
        const processedItems = (Items || []).map(item => item);
        const sortedItems = processedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        console.log(`[editorialPageController.listPublicEditorialPages] ${sortedItems.length} adet yayınlanmış sayfa bulundu.`);
        res.status(200).json({ pages: sortedItems });
    } catch (error) {
        console.error("HATA: Yayınlanmış editöryel sayfalar listelenirken hata:", error);
        res.status(500).json({ message: 'Sayfalar listelenirken bir sunucu hatası oluştu.' });
    }
};
