// backend/controllers/notificationController.js
const { QueryCommand, UpdateCommand, BatchExecuteStatementCommand } = require("@aws-sdk/lib-dynamodb"); // BatchExecuteStatementCommand veya BatchWriteCommand kullanılabilir
const { docClient } = require('../config/awsConfig');
const { v4: uuidv4 } = require('uuid'); // Gerekirse

const NOTIFICATIONS_TABLE = 'Notifications';

/**
 * Giriş yapmış kullanıcının bildirimlerini getirir.
 * Varsayılan olarak okunmamışları, ?all=true query param ile tümünü getirir.
 * @route GET /api/notifications
 * @route GET /api/notifications?all=true
 */
exports.getNotifications = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) { return res.status(401).json({ message: 'Bildirimleri görmek için giriş yapmalısınız.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }

    const fetchAll = req.query.all === 'true'; // Tüm bildirimleri mi istiyor?

    const params = {
        TableName: NOTIFICATIONS_TABLE,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
        ScanIndexForward: false, // En yeniden eskiye sırala (createdAt SK olduğu için)
        Limit: 50 // Örnek bir limit, sayfalama eklenebilir
    };

    // Eğer sadece okunmamışlar isteniyorsa filtre ekle
    if (!fetchAll) {
        params.FilterExpression = "isRead = :isReadStatus";
        params.ExpressionAttributeValues[":isReadStatus"] = false;
    }

    try {
        console.log(`Bilgi: Kullanıcı ${userId} için bildirimler sorgulanıyor (fetchAll: ${fetchAll})...`);
        const { Items } = await docClient.send(new QueryCommand(params));
        console.log(`Bilgi: Kullanıcı ${userId} için ${Items ? Items.length : 0} bildirim bulundu.`);
        res.status(200).json({ notifications: Items || [] });
    } catch (error) {
        console.error(`HATA: Kullanıcı ${userId} bildirimleri getirilirken hata:`, error);
        res.status(500).json({ message: 'Bildirimler getirilirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Giriş yapmış kullanıcının okunmamış bildirim sayısını getirir.
 * @route GET /api/notifications/unread-count
 */
exports.getUnreadNotificationCount = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) { return res.status(401).json({ message: 'Yetkisiz işlem.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }

    const params = {
        TableName: NOTIFICATIONS_TABLE,
        KeyConditionExpression: "userId = :uid",
        FilterExpression: "isRead = :isReadStatus", // Sadece okunmamışları say
        ExpressionAttributeValues: {
            ":uid": userId,
            ":isReadStatus": false
        },
        Select: "COUNT" // Sadece sayıyı döndür
    };

    try {
        console.log(`Bilgi: Kullanıcı ${userId} için okunmamış bildirim sayısı sorgulanıyor...`);
        const { Count } = await docClient.send(new QueryCommand(params));
        console.log(`Bilgi: Kullanıcı ${userId} için ${Count} okunmamış bildirim bulundu.`);
        res.status(200).json({ unreadCount: Count || 0 });
    } catch (error) {
        console.error(`HATA: Okunmamış bildirim sayısı alınırken hata (UserId: ${userId}):`, error);
        res.status(500).json({ message: 'Okunmamış bildirim sayısı alınırken bir hata oluştu.' });
    }
};

/**
 * Belirtilen bildirimleri (ID listesi ile) okundu olarak işaretler.
 * @route PUT /api/notifications/mark-read
 */
exports.markNotificationsAsRead = async (req, res) => {
    const userId = req.user?.userId;
    const { notificationIds } = req.body; // Okundu olarak işaretlenecek ID'ler dizisi

    if (!userId) { return res.status(401).json({ message: 'Bu işlem için giriş yapmalısınız.' }); }
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
        return res.status(400).json({ message: 'Okundu olarak işaretlenecek bildirim ID\'leri listesi gönderilmelidir.' });
    }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }

    // Her bir ID için Update işlemi oluşturmak yerine BatchExecuteStatement (PartiQL) veya
    // her biri için ayrı UpdateCommand gönderebiliriz. Küçük listeler için ayrı komutlar daha basit olabilir.
    // Şimdilik tek tek güncelleyelim (performans için Batch daha iyi olabilir).

    const updatePromises = notificationIds.map(idPair => {
        // ID çifti (createdAt#notificationId) veya sadece notificationId gelmesine bağlı olarak anahtarı alın
        // Şimdilik sadece notificationId geldiğini varsayalım ve createdAt'i de body'de isteyelim
        // Veya daha iyisi, frontend tüm notification objesini göndersin
        // Basitlik adına, frontend'in { createdAt, notificationId } gönderdiğini varsayalım
        // const { createdAt, notificationId } = idPair; // Frontend'den bu format bekleniyor
        // VEYA DAHA İYİSİ: Sadece notificationId'leri alıp createdAt'i DB'den çekmek? Çok maliyetli.
        // EN İYİ YAKLAŞIM: Frontend, okunacak bildirimin hem `userId` (zaten req.user'da var),
        // hem de `createdAt` (SK) bilgilerini göndersin.

        // --- DÜZELTME: Sadece notificationIds alıp tek tek güncelleyelim ---
        // Frontend'den sadece notificationId'leri içeren bir dizi bekleyelim.
        // Hangi createdAt'e sahip olduklarını bilmediğimiz için bu yöntem SADECE
        // notificationId'nin PK olduğu bir durumda çalışır. Bizim yapımızda userId+createdAt PK.
        // Bu yüzden ya frontend createdAt'i de göndermeli ya da burada her ID için önce Get yapmalıyız.
        // VEYA, GSI kullanmalıyız (örn: notificationId üzerinde).
        // EN BASİT YÖNTEM: Frontend `createdAt` değerini de göndersin.

        // --- GEÇİCİ ÇÖZÜM (Frontend'den sadece ID[] gelirse): ---
        // Bu yöntem verimsizdir ve önerilmez, ancak başka yol yoksa:
        // 1. GET ile notification'ı alıp createdAt'i öğren.
        // 2. UPDATE ile isRead'i güncelle.

        // --- ÖNERİLEN YÖNTEM (Frontend {createdAt, notificationId}[] gönderirse): ---
        const { createdAt, notificationId } = idPair; // Frontend'den bu yapıda bir dizi bekliyoruz
        if (!createdAt || !notificationId) {
            console.warn(`Uyarı: Geçersiz bildirim ID çifti alındı: ${JSON.stringify(idPair)}, atlanıyor.`);
            return Promise.resolve({ success: false, id: notificationId }); // Bu ID için işlemi atla
        }

        const params = {
            TableName: NOTIFICATIONS_TABLE,
            Key: {
                userId: userId,
                createdAt: createdAt // SK
            },
            ConditionExpression: "attribute_exists(userId) AND notificationId = :nid", // Kendisine ait ve doğru ID'li bildirimi güncelle
            UpdateExpression: "SET isRead = :true",
            ExpressionAttributeValues: {
                ":true": true,
                ":nid": notificationId // Condition için
            },
            ReturnValues: "NONE" // Bir şey döndürmeye gerek yok
        };
        return docClient.send(new UpdateCommand(params))
            .then(() => ({ success: true, id: notificationId }))
            .catch(err => {
                if (err.name === 'ConditionalCheckFailedException') {
                    console.warn(`Uyarı: Bildirim okundu olarak işaretlenemedi (bulunamadı veya ID eşleşmedi): ${notificationId}`);
                } else {
                    console.error(`HATA: Bildirim ${notificationId} okundu olarak işaretlenirken hata:`, err);
                }
                return { success: false, id: notificationId }; // Hata durumunu belirt
            });
    });

    try {
        const results = await Promise.all(updatePromises);
        const successfulUpdates = results.filter(r => r.success).length;
        const failedUpdates = results.length - successfulUpdates;
        console.log(`Bilgi: ${successfulUpdates} bildirim okundu olarak işaretlendi, ${failedUpdates} hata oluştu/atlandı (UserId: ${userId}).`);

        if (successfulUpdates > 0) {
            res.status(200).json({ message: `${successfulUpdates} bildirim okundu olarak işaretlendi.` });
        } else if (failedUpdates > 0) {
             // Hiçbiri güncellenemediyse veya hepsi atlandıysa
            res.status(400).json({ message: 'Belirtilen bildirimler okundu olarak işaretlenemedi veya bulunamadı.' });
        } else {
            // Boş liste geldiyse
             res.status(400).json({ message: 'İşaretlenecek bildirim ID\'si gönderilmedi.' });
        }
    } catch (batchError) {
        // Promise.all nadiren buraya düşer ama genel hata kontrolü
        console.error(`HATA: Bildirimleri okundu olarak işaretlerken toplu hata (UserId: ${userId}):`, batchError);
        res.status(500).json({ message: 'Bildirimler işaretlenirken bir sunucu hatası oluştu.' });
    }
};