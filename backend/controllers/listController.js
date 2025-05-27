// Monologed/backend/controllers/listController.js

const {
    PutCommand, QueryCommand, GetCommand, UpdateCommand, DeleteCommand
} = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/awsConfig.js");
const crypto =require('crypto');
const { checkAndAwardAchievements } = require('../services/achievementService');
const axios = require('axios');
const USERS_TABLE = "Users";

const LISTS_TABLE = 'Lists';
const USER_LISTS_INDEX = 'UserListsIndex';
const EDITORIAL_LISTS_INDEX = 'EditorialListsIndex';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;
const MAX_POSTERS_PER_LIST = 5;

/**
 * Yeni bir liste oluşturur. Admin ise editöryel olarak işaretleyebilir.
 * @route POST /api/lists (Kullanıcılar için)
 * @route POST /api/admin/lists (Adminler için editöryel liste)
 */
exports.createList = async (req, res) => {
    const { listName, description, items, isPublic, isEditorialRoute, coverImageUrl } = req.body;
    const userId = req.user?.userId;

    if (!userId) { return res.status(401).json({ message: 'Yetkisiz işlem.' }); }
    if (!listName || listName.trim() === '') { return res.status(400).json({ message: 'Liste adı boş olamaz.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }

    const isUserAdmin = req.user?.isAdmin === true;
    const finalIsEditorialBoolean = isUserAdmin && isEditorialRoute === true;
    // *** DÜZELTME: isEditorial'ı string'e çevir ***
    const finalIsEditorialString = finalIsEditorialBoolean ? "true" : "false";
    const finalIsPublic = (isUserAdmin && isEditorialRoute) ? (typeof isPublic === 'boolean' ? isPublic : true) : true;

    let validatedItems = [];
    if (items && Array.isArray(items)) {
        validatedItems = items
            .map(item => {
                const numericId = Number(item.id);
                if (!isNaN(numericId) && item.type && (item.type === 'movie' || item.type === 'tv')) {
                    return { id: numericId, type: item.type };
                }
                console.warn(`Uyarı: Liste oluşturma sırasında geçersiz öğe formatı:`, item);
                return null;
            })
            .filter(item => item !== null);
        const uniqueItemsMap = new Map();
        validatedItems.forEach(item => {
            const key = `${item.type}-${item.id}`;
            if (!uniqueItemsMap.has(key)) { uniqueItemsMap.set(key, item); }
        });
        validatedItems = Array.from(uniqueItemsMap.values());
    }

    const listId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const newList = {
        listId: listId,
        userId: userId,
        listName: listName.trim(),
        description: description ? description.trim() : null,
        items: validatedItems,
        createdAt: timestamp,
        updatedAt: timestamp,
        isEditorial: finalIsEditorialString, // *** DÜZELTME: String değer kullanılıyor ***
        isPublic: finalIsPublic,
        ...(finalIsEditorialBoolean && { coverImageUrl: coverImageUrl || null })
    };

    const params = { TableName: LISTS_TABLE, Item: newList, ConditionExpression: "attribute_not_exists(listId)" };

    try {
        await docClient.send(new PutCommand(params));
        console.log(`Bilgi: Yeni ${finalIsEditorialBoolean ? 'editöryel' : 'kullanıcı'} liste oluşturuldu. ListId: ${listId}, UserId: ${userId}, Adı: ${newList.listName}`);

        if (!finalIsEditorialBoolean) {
            const updateUserStatsCommand = new UpdateCommand({
                TableName: USERS_TABLE, Key: { userId: userId },
                UpdateExpression: "ADD listCount :inc", ExpressionAttributeValues: { ":inc": 1 }
            });
            await docClient.send(updateUserStatsCommand);
            await checkAndAwardAchievements(userId);
        }
        const responseList = { ...newList };
        res.status(201).json({ message: 'Liste başarıyla oluşturuldu.', list: responseList });
    } catch (error) {
         if (error.name === 'ConditionalCheckFailedException') {
             return res.status(500).json({ message: 'Liste oluşturulamadı, lütfen tekrar deneyin (ID çakışması).' });
         }
         console.error("HATA: Liste oluşturulamadı:", error);
         res.status(500).json({ message: `Liste oluşturulurken sunucu hatası oluştu. Detay: ${error.message}` }); // Hata mesajını yanıta ekle
    }
};

async function fetchListsWithPosters(targetUserId, maxPosters = MAX_POSTERS_PER_LIST, forEditorialAdmin = false, forPublicEditorial = false) {
    if (!docClient) throw new Error('Sunucu veritabanı yapılandırma hatası.');
    if (!API_KEY && !forEditorialAdmin && !forPublicEditorial) { // Public editorial için de API key gerekebilir (posterler için)
         console.warn("Uyarı: TMDB API Key eksik, bazı özellikler (posterler) çalışmayabilir.");
         // throw new Error('Sunucu yapılandırma hatası (TMDB API Key).'); // Hata fırlatmak yerine devam edebiliriz
    }

    let listQueryParams;

    if (forPublicEditorial) {
        listQueryParams = {
            TableName: LISTS_TABLE,
            IndexName: EDITORIAL_LISTS_INDEX,
            // *** DÜZELTME: isEditorial için string "true" kullanılıyor ***
            KeyConditionExpression: "isEditorial = :isEd",
            FilterExpression: "isPublic = :isPub",
            ExpressionAttributeValues: { ":isEd": "true", ":isPub": true },
            ProjectionExpression: "listId, listName, description, createdAt, #i, userId, coverImageUrl, isPublic, isEditorial",
            ExpressionAttributeNames: { "#i": "items" },
            ScanIndexForward: false
        };
        console.log(`Bilgi: Herkese açık editöryel listeler sorgulanıyor (Index: ${EDITORIAL_LISTS_INDEX})...`);
    } else if (forEditorialAdmin && targetUserId) {
        listQueryParams = {
            TableName: LISTS_TABLE,
            IndexName: USER_LISTS_INDEX,
            KeyConditionExpression: "userId = :uid",
            // *** DÜZELTME: isEditorial için string "true" kullanılıyor ***
            FilterExpression: "isEditorial = :isEd",
            ExpressionAttributeValues: { ":uid": targetUserId, ":isEd": "true" },
            ProjectionExpression: "listId, listName, description, createdAt, #i, userId, coverImageUrl, isPublic, isEditorial",
            ExpressionAttributeNames: { "#i": "items" },
            ScanIndexForward: false
        };
        console.log(`Bilgi: Admin ${targetUserId} için kendi editöryel listeleri sorgulanıyor (Index: ${USER_LISTS_INDEX})...`);
    } else if (targetUserId) {
        listQueryParams = {
            TableName: LISTS_TABLE,
            IndexName: USER_LISTS_INDEX,
            KeyConditionExpression: "userId = :uid",
            // *** DÜZELTME: isEditorial için string "false" kullanılıyor ***
            FilterExpression: "isEditorial = :isEd",
            ExpressionAttributeValues: { ":uid": targetUserId, ":isEd": "false" },
            ProjectionExpression: "listId, listName, description, createdAt, #i, userId, isPublic, isEditorial",
            ExpressionAttributeNames: { "#i": "items" },
            ScanIndexForward: false
        };
        console.log(`Bilgi: Kullanıcı ${targetUserId} için normal listeler sorgulanıyor (Index: ${USER_LISTS_INDEX})...`);
    } else {
        throw new Error("Listeleri çekmek için hedef kullanıcı ID'si veya uygun bir bayrak belirtilmelidir.");
    }

    let { Items: listsMetadata } = await docClient.send(new QueryCommand(listQueryParams));
    listsMetadata = listsMetadata || [];
    console.log(`Bilgi: Sorgu sonucu ${listsMetadata.length} adet liste meta verisi bulundu.`);

    if (listsMetadata.length === 0) return [];

    const itemDetailsToFetch = [];
    const listIdToItemsMap = new Map();

    listsMetadata.forEach(list => {
        const items = list.items || [];
        const itemsForPreview = items.slice(0, maxPosters);
        listIdToItemsMap.set(list.listId, itemsForPreview);
        itemsForPreview.forEach(item => {
            if (item && item.id && item.type) {
                itemDetailsToFetch.push({ id: item.id, type: item.type });
            }
        });
    });

    const uniqueItems = Array.from(new Map(itemDetailsToFetch.map(item => [`${item.type}-${item.id}`, item])).values());
    let posterMap = new Map();

    if (uniqueItems.length > 0 && API_KEY) {
        console.log(`Bilgi: Toplam ${uniqueItems.length} benzersiz öğe detayı (poster) TMDB'den çekilecek.`);
        const detailPromises = uniqueItems.map(item => {
            const url = `${TMDB_BASE_URL}/${item.type}/${item.id}`;
            return axios.get(url, { params: { api_key: API_KEY, language: 'tr-TR' } })
                .then(response => ({ id: item.id, type: item.type, poster_path: response.data.poster_path || null }))
                .catch(err => ({ id: item.id, type: item.type, poster_path: null }));
        });
        const detailedItemsResults = await Promise.all(detailPromises);
        detailedItemsResults.forEach(item => posterMap.set(`${item.type}-${item.id}`, item.poster_path));
    } else if (uniqueItems.length > 0 && !API_KEY) {
        console.warn("Uyarı: TMDB API Key eksik, posterler çekilemeyecek.");
    }

    const finalLists = listsMetadata.map(list => {
        const originalItems = listIdToItemsMap.get(list.listId) || [];
        const previewItems = originalItems.map(item => ({
            id: item.id, type: item.type,
            poster_path: posterMap.get(`${item.type}-${item.id}`) || null
        }));
        return {
            listId: list.listId, listName: list.listName, description: list.description,
            createdAt: list.createdAt, itemCount: list.items?.length ?? 0,
            previewPosters: previewItems.map(p => p.poster_path).filter(p => p !== null),
            userId: list.userId,
            isEditorial: list.isEditorial === "true", // *** DÜZELTME: String'den boolean'a çevir ***
            isPublic: list.isPublic, // Bu zaten boolean olmalı
            coverImageUrl: list.coverImageUrl
        };
    });
    return finalLists;
}
exports.fetchListsWithPosters = fetchListsWithPosters;

exports.getUserLists = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) { return res.status(401).json({ message: 'Yetkisiz işlem.' }); }
    try {
        const lists = await fetchListsWithPosters(userId, MAX_POSTERS_PER_LIST, false, false);
        res.status(200).json({ lists: lists });
    } catch (error) {
        console.error(`HATA: Kullanıcı ${userId} listeleri getirilirken hata oluştu:`, error);
        res.status(500).json({ message: 'Listeler getirilirken bir sunucu hatası oluştu.' });
    }
};

exports.getPublicUserLists = async (req, res) => {
    const { userId: targetUserId } = req.params;
    if (!targetUserId) { return res.status(400).json({ message: 'Kullanıcı ID\'si belirtilmelidir.' }); }
    try {
        const allUserLists = await fetchListsWithPosters(targetUserId, MAX_POSTERS_PER_LIST, false, false);
        // isEditorial'ın string "false" olup olmadığını kontrol et
        const publicUserLists = allUserLists.filter(list => list.isPublic === true && list.isEditorial === false);
        res.status(200).json({ lists: publicUserLists });
    } catch (error) {
        console.error(`HATA: Kullanıcı ${targetUserId} için public listeler getirilirken hata oluştu:`, error);
        res.status(500).json({ message: 'Kullanıcı listeleri getirilirken bir sunucu hatası oluştu.' });
    }
};

exports.getPublicEditorialLists = async (req, res) => {
    try {
        const lists = await fetchListsWithPosters(null, MAX_POSTERS_PER_LIST, false, true);
        res.status(200).json({ lists: lists });
    } catch (error) {
        console.error(`HATA: Herkese açık editöryel listeler getirilirken hata oluştu:`, error);
        res.status(500).json({ message: 'Editöryel listeler getirilirken bir sunucu hatası oluştu.' });
    }
};

exports.getAdminEditorialLists = async (req, res) => {
    const adminUserId = req.user?.userId;
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Yetkisiz işlem." });
    if (!adminUserId) return res.status(401).json({ message: "Giriş yapmalısınız." });
    try {
        const lists = await fetchListsWithPosters(adminUserId, MAX_POSTERS_PER_LIST, true, false);
        res.status(200).json({ lists: lists });
    } catch (error) {
        console.error(`HATA: Admin ${adminUserId} editöryel listeleri getirilirken hata:`, error);
        res.status(500).json({ message: "Admin listeleri getirilirken bir hata oluştu." });
    }
};

exports.getListById = async (req, res) => {
    const { listId } = req.params;
    const requestingUserId = req.user?.userId;
    if (!listId) { return res.status(400).json({ message: 'Liste ID\'si belirtilmelidir.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }

    const params = {
        TableName: LISTS_TABLE,
        Key: { listId: listId },
        ProjectionExpression: "listId, userId, listName, description, #i, createdAt, updatedAt, isEditorial, isPublic, coverImageUrl",
        ExpressionAttributeNames: { "#i": "items" }
    };
    try {
        const { Item } = await docClient.send(new GetCommand(params));
        if (!Item) { return res.status(404).json({ message: 'Liste bulunamadı.' }); }

        // isEditorial string ise boolean'a çevir
        const isEditorialBool = Item.isEditorial === "true";

        if (!Item.isPublic && Item.userId !== requestingUserId && !(isEditorialBool && req.user?.isAdmin)) {
            return res.status(403).json({ message: 'Bu listeyi görüntüleme yetkiniz yok.' });
        }

        Item.itemCount = Item.items?.length ?? 0;
        Item.isEditorial = isEditorialBool; // Dönen veride boolean olsun
        if (Item.userId) {
            try {
                const userParams = { TableName: USERS_TABLE, Key: { userId: Item.userId }, ProjectionExpression: "username, #nm", ExpressionAttributeNames: {"#nm": "name"} };
                const { Item: listOwner } = await docClient.send(new GetCommand(userParams));
                Item.ownerUsername = listOwner?.username;
                Item.ownerName = listOwner?.name;
            } catch (userError) {
                console.warn(`Uyarı: Liste sahibi (${Item.userId}) bilgileri çekilemedi.`);
            }
        }
        res.status(200).json({ list: Item });
    } catch (error) {
        console.error(`HATA: Liste detayı (ListId: ${listId}) getirilirken hata oluştu:`, error);
        res.status(500).json({ message: 'Liste detayı getirilirken bir sunucu hatası oluştu.' });
    }
};

exports.updateList = async (req, res) => {
    const { listId } = req.params;
    const { listName, description, items, isPublic, coverImageUrl, isEditorialRoute } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: 'Yetkisiz işlem.' });
    if (!listId) return res.status(400).json({ message: 'Liste ID\'si belirtilmelidir.' });
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });

    let existingList;
    try {
        const { Item } = await docClient.send(new GetCommand({ TableName: LISTS_TABLE, Key: { listId: listId } }));
        if (!Item) return res.status(404).json({ message: 'Liste bulunamadı.' });
        existingList = Item;
    } catch (getErr) {
        return res.status(500).json({ message: "Liste bilgileri alınırken hata." });
    }

    const isUserAdmin = req.user?.isAdmin === true;
    // isEditorial string ise boolean'a çevir
    const isExistingListEditorial = existingList.isEditorial === "true";

    if (isExistingListEditorial) {
        if (!isUserAdmin || existingList.userId !== userId || !isEditorialRoute) {
            return res.status(403).json({ message: 'Bu editöryel listeyi güncelleme yetkiniz yok.' });
        }
    } else {
        if (existingList.userId !== userId || isEditorialRoute) {
            return res.status(403).json({ message: 'Bu listeyi güncelleme yetkiniz yok.' });
        }
    }

    const updateExpressionParts = [];
    const expressionAttributeValues = { ':uidCond': existingList.userId }; // ConditionExpression için
    const expressionAttributeNames = {};

    if (listName !== undefined && listName.trim() !== '') {
        updateExpressionParts.push("listName = :ln");
        expressionAttributeValues[":ln"] = listName.trim();
    }
    if (description !== undefined) {
        updateExpressionParts.push("#desc = :d");
        expressionAttributeNames["#desc"] = "description";
        expressionAttributeValues[":d"] = description ? description.trim() : null;
    }
    if (items !== undefined && Array.isArray(items)) {
        let validatedItems = items
            .map(item => {
                const numericId = Number(item.id);
                if (!isNaN(numericId) && item.type && (item.type === 'movie' || item.type === 'tv')) {
                    return { id: numericId, type: item.type };
                }
                return null;
            })
            .filter(item => item !== null);
        const uniqueItemsMap = new Map();
        validatedItems.forEach(item => uniqueItemsMap.set(`${item.type}-${item.id}`, item));
        validatedItems = Array.from(uniqueItemsMap.values());
        updateExpressionParts.push("#i = :itemsVal");
        expressionAttributeNames["#i"] = "items";
        expressionAttributeValues[":itemsVal"] = validatedItems;
    }

    if (isExistingListEditorial && isUserAdmin && isEditorialRoute) {
        if (typeof isPublic === 'boolean') {
            updateExpressionParts.push("isPublic = :ip");
            expressionAttributeValues[":ip"] = isPublic;
        }
        if (coverImageUrl !== undefined) {
            updateExpressionParts.push("coverImageUrl = :ciu");
            expressionAttributeValues[":ciu"] = coverImageUrl;
        }
        // isEditorial alanı güncellenmiyor, sadece oluşturulurken set ediliyor.
    }

    if (updateExpressionParts.length === 0) {
        return res.status(400).json({ message: 'Güncellenecek bir bilgi gönderilmedi.' });
    }
    updateExpressionParts.push("updatedAt = :ts");
    expressionAttributeValues[":ts"] = new Date().toISOString();

    const updateParams = {
        TableName: LISTS_TABLE,
        Key: { listId: listId },
        ConditionExpression: "userId = :uidCond",
        UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ...(Object.keys(expressionAttributeNames).length > 0 && { ExpressionAttributeNames: expressionAttributeNames }),
        ReturnValues: "ALL_NEW"
    };

    try {
        const { Attributes } = await docClient.send(new UpdateCommand(updateParams));
        // Dönen Attributes'ta isEditorial string olabilir, frontend'e boolean olarak gönder
        if (Attributes && Attributes.isEditorial) {
            Attributes.isEditorial = Attributes.isEditorial === "true";
        }
        res.status(200).json({ message: 'Liste başarıyla güncellendi.', list: Attributes });
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            return res.status(403).json({ message: 'Liste güncellenemedi (yetki sorunu veya liste bulunamadı).' });
        }
        console.error(`HATA: Liste güncellenirken hata (ListId: ${listId}):`, error);
        res.status(500).json({ message: 'Liste güncellenirken bir sunucu hatası oluştu.' });
    }
};

exports.addItemToList = async (req, res) => {
    const { listId } = req.params;
    const { contentId, contentType } = req.body;
    const userId = req.user?.userId;

    if (!userId) { return res.status(401).json({ message: 'Bu işlem için giriş yapmalısınız.' }); }
    if (!listId) { return res.status(400).json({ message: 'Liste ID\'si belirtilmelidir.' }); }
    if (!contentId || isNaN(Number(contentId))) { return res.status(400).json({ message: 'Geçerli bir içerik ID\'si (contentId) gönderilmelidir.' }); }
    if (!contentType || (contentType !== 'movie' && contentType !== 'tv')) { return res.status(400).json({ message: 'İçerik tipi (contentType) "movie" veya "tv" olmalıdır.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' }); }

    try {
        const getParams = { TableName: LISTS_TABLE, Key: { listId: listId }, ProjectionExpression: "userId, #i, isEditorial", ExpressionAttributeNames: { "#i": "items" } };
        const { Item: existingList } = await docClient.send(new GetCommand(getParams));
        if (!existingList) { return res.status(404).json({ message: 'Liste bulunamadı.' }); }

        const isUserAdmin = req.user?.isAdmin === true;
        const isExistingListEditorial = existingList.isEditorial === "true";

        if (isExistingListEditorial) {
            if (!isUserAdmin || existingList.userId !== userId) {
                return res.status(403).json({ message: 'Bu editöryel listeye öğe ekleme yetkiniz yok.' });
            }
        } else {
            if (existingList.userId !== userId) {
                return res.status(403).json({ message: 'Bu listeye öğe ekleme yetkiniz yok.' });
            }
        }
        const numericContentId = Number(contentId);
        const newItem = { id: numericContentId, type: contentType };
        const currentItems = existingList.items || [];
        const alreadyExists = currentItems.some(item => item.id === newItem.id && item.type === newItem.type);
        if (alreadyExists) {
            return res.status(409).json({ message: 'Bu içerik zaten listede mevcut.' });
        }

        const updateParams = {
            TableName: LISTS_TABLE, Key: { listId: listId },
            ConditionExpression: "userId = :uidCond",
            UpdateExpression: "SET #i = list_append(if_not_exists(#i, :empty_list), :newItemList), updatedAt = :ts",
            ExpressionAttributeNames: { "#i": "items" },
            ExpressionAttributeValues: {
                ":uidCond": existingList.userId,
                ":newItemList": [newItem],
                ":empty_list": [],
                ":ts": new Date().toISOString()
            },
            ReturnValues: "UPDATED_NEW"
        };
        const { Attributes } = await docClient.send(new UpdateCommand(updateParams));
        if (Attributes && Attributes.isEditorial) { Attributes.isEditorial = Attributes.isEditorial === "true"; }
        res.status(200).json({ message: "İçerik listeye başarıyla eklendi.", items: Attributes.items, itemCount: Attributes.items?.length ?? 0, updatedAt: Attributes.updatedAt });
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
             return res.status(403).json({ message: 'Liste güncellenemedi (yetki sorunu?).' });
         }
        console.error(`HATA: İçerik listeye eklenirken hata (ListId: ${listId}):`, error);
        res.status(500).json({ message: 'İçerik eklenirken bir sunucu hatası oluştu.' });
    }
};

exports.removeItemFromList = async (req, res) => {
    const { listId } = req.params;
    const { contentId, contentType } = req.body;
    const userId = req.user?.userId;

    if (!userId) { return res.status(401).json({ message: 'Bu işlem için giriş yapmalısınız.' }); }
    if (!listId) { return res.status(400).json({ message: 'Liste ID\'si belirtilmelidir.' }); }
    if (!contentId || isNaN(Number(contentId))) { return res.status(400).json({ message: 'Geçerli bir içerik ID\'si (contentId) gönderilmelidir.' }); }
    if (!contentType || (contentType !== 'movie' && contentType !== 'tv')) { return res.status(400).json({ message: 'İçerik tipi (contentType) "movie" veya "tv" olmalıdır.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' }); }

    try {
        const getParams = { TableName: LISTS_TABLE, Key: { listId: listId }, ProjectionExpression: "userId, #i, isEditorial", ExpressionAttributeNames: { "#i": "items" } };
        const { Item: existingList } = await docClient.send(new GetCommand(getParams));
        if (!existingList) { return res.status(404).json({ message: 'Liste bulunamadı.' }); }

        const isUserAdmin = req.user?.isAdmin === true;
        const isExistingListEditorial = existingList.isEditorial === "true";

        if (isExistingListEditorial) {
            if (!isUserAdmin || existingList.userId !== userId) {
                return res.status(403).json({ message: 'Bu editöryel listeden öğe silme yetkiniz yok.' });
            }
        } else {
            if (existingList.userId !== userId) {
                return res.status(403).json({ message: 'Bu listeden öğe silme yetkiniz yok.' });
            }
        }

        const numericContentId = Number(contentId);
        const itemToRemove = { id: numericContentId, type: contentType };
        const currentItems = existingList.items || [];
        const itemIndex = currentItems.findIndex(item => item.id === itemToRemove.id && item.type === itemToRemove.type);
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Silinecek içerik bu listede bulunamadı.' });
        }

        const updateParams = {
            TableName: LISTS_TABLE, Key: { listId: listId },
            ConditionExpression: "userId = :uidCond",
            UpdateExpression: `REMOVE #i[${itemIndex}] SET updatedAt = :ts`,
            ExpressionAttributeNames: { "#i": "items" },
            ExpressionAttributeValues: {
                ":uidCond": existingList.userId,
                ":ts": new Date().toISOString()
            },
            ReturnValues: "UPDATED_NEW"
        };
        const { Attributes } = await docClient.send(new UpdateCommand(updateParams));
        if (Attributes && Attributes.isEditorial) { Attributes.isEditorial = Attributes.isEditorial === "true"; }
        res.status(200).json({ message: "İçerik listeden başarıyla çıkarıldı.", items: Attributes.items, itemCount: Attributes.items?.length ?? 0, updatedAt: Attributes.updatedAt });
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
             return res.status(403).json({ message: 'Liste güncellenemedi (yetki sorunu?).' });
         }
        if (error.name === 'ValidationException' && error.message.includes('does not exist')) {
             return res.status(404).json({ message: 'Öğe listede bulunamadı veya zaten silinmiş.' });
         }
        console.error(`HATA: İçerik listeden çıkarılırken hata (ListId: ${listId}, Item:`, itemToRemove, `):`, error);
        res.status(500).json({ message: 'İçerik çıkarılırken bir sunucu hatası oluştu.' });
    }
};

exports.deleteList = async (req, res) => {
    const { listId } = req.params;
    const userId = req.user?.userId;

    if (!userId) { return res.status(401).json({ message: 'Bu işlem için giriş yapmalısınız.' }); }
    if (!listId) { return res.status(400).json({ message: 'Silinecek liste ID\'si belirtilmelidir.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }

    try {
        const getParams = { TableName: LISTS_TABLE, Key: { listId: listId }, ProjectionExpression: "userId, isEditorial" };
        const { Item: existingList } = await docClient.send(new GetCommand(getParams));
        if (!existingList) { return res.status(404).json({ message: 'Liste bulunamadı.' }); }

        const isUserAdmin = req.user?.isAdmin === true;
        const isExistingListEditorial = existingList.isEditorial === "true";

        if (isExistingListEditorial) {
            if (!isUserAdmin || existingList.userId !== userId) {
                return res.status(403).json({ message: 'Bu editöryel listeyi silme yetkiniz yok.' });
            }
        } else {
            if (existingList.userId !== userId) {
                return res.status(403).json({ message: 'Bu listeyi silme yetkiniz yok.' });
            }
        }

        const deleteParams = { TableName: LISTS_TABLE, Key: { listId: listId }, ConditionExpression: "userId = :uidCond", ExpressionAttributeValues: { ":uidCond": existingList.userId } };
        await docClient.send(new DeleteCommand(deleteParams));

        if (!isExistingListEditorial) {
            const updateUserStatsCommand = new UpdateCommand({
                TableName: USERS_TABLE, Key: { userId: userId },
                UpdateExpression: "SET listCount = listCount - :dec",
                ConditionExpression: "listCount > :zero",
                ExpressionAttributeValues: { ":dec": 1, ":zero": 0 }
            });
            try { await docClient.send(updateUserStatsCommand); }
            catch (statsError) {
                 if (statsError.name === 'ConditionalCheckFailedException') {
                     console.warn(`Uyarı: Kullanıcı ${userId} için listCount azaltılamadı (muhtemelen zaten 0).`);
                 } else {
                     console.error(`HATA: Liste silindikten sonra kullanıcı ${userId} listCount güncellenirken hata:`, statsError);
                 }
            }
        }
        res.status(204).send();
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ message: 'Liste bulunamadı veya bu listeyi silme yetkiniz yok.' });
        }
        console.error(`HATA: Liste silinirken hata oluştu (ListId: ${listId}):`, error);
        res.status(500).json({ message: 'Liste silinirken bir sunucu hatası oluştu.' });
    }
};
