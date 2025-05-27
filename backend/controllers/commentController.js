// backend/controllers/commentController.js
const { v4: uuidv4 } = require('uuid');
const { PutCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require('../config/awsConfig');
const { BatchGetItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const { ddbClient } = require('../config/awsConfig');

const COMMENTS_TABLE = 'Comments';
const LOG_COMMENTS_INDEX = 'LogCommentsIndex';
const USERS_TABLE = 'Users';

/**
 * Belirtilen loga yeni bir yorum ekler.
 * @route POST /api/logs/:logId/comments
 */
exports.addComment = async (req, res) => {
    const userId = req.user?.userId;
    const username = req.user?.username; // Yorum yapanın adını da alalım
    const { logId } = req.params;
    const { text } = req.body;
    const uploadedImage = req.file;

    if (!userId || !username) { return res.status(401).json({ message: 'Yorum yapmak için giriş yapmalısınız.' }); }
    if (!logId) { return res.status(400).json({ message: 'Yorum yapılacak log ID\'si belirtilmelidir.' }); }
    if (!text || typeof text !== 'string' || text.trim().length === 0) { return res.status(400).json({ message: 'Yorum metni boş olamaz.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }

    // TODO: Yorum yapılan logId'nin gerçekten var olup olmadığını kontrol etmek iyi olabilir.

    const commentId = uuidv4();
    const timestamp = new Date().toISOString();

    const newCommentItem = {
        commentId: commentId,
        logId: logId,
        userId: userId,
        username: username, // Kullanıcı adını da kaydediyoruz
        text: text.trim(),
        createdAt: timestamp,
    };
    if (uploadedImage && uploadedImage.location) {
        newCommentItem.imageUrl = uploadedImage.location;
    }

    const params = {
        TableName: COMMENTS_TABLE,
        Item: newCommentItem,
    };

    try {
        console.log(`Bilgi: Kullanıcı ${userId} (${username}), log ${logId}'a yorum ekliyor.`);
        await docClient.send(new PutCommand(params));
        console.log(`Bilgi: Yorum başarıyla eklendi (CommentId: ${commentId}).`);
        // Frontend'in hemen kullanabilmesi için eklenen yorumu geri döndür
        res.status(201).json({ message: 'Yorum başarıyla eklendi.', comment: newCommentItem });

    } catch (error) {
        console.error(`HATA: Yorum eklenirken hata oluştu (LogId: ${logId}, UserId: ${userId}):`, error);
        res.status(500).json({ message: 'Yorum eklenirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Belirtilen log ID'sine ait tüm yorumları getirir.
 * @route GET /api/logs/:logId/comments
 */
exports.getCommentsForLog = async (req, res) => {
    const { logId } = req.params;
    if (!logId) { return res.status(400).json({ message: 'Log ID\'si belirtilmelidir.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }

    const params = {
        TableName: COMMENTS_TABLE,
        IndexName: LOG_COMMENTS_INDEX, // GSI üzerinden sorgula
        KeyConditionExpression: "logId = :lid",
        ExpressionAttributeValues: { ":lid": logId },
        ScanIndexForward: true // createdAt'e göre eskiden yeniye sırala (varsayılan)
    };

    try {
        console.log(`Bilgi: Log ${logId} için yorumlar sorgulanıyor (Index: ${LOG_COMMENTS_INDEX}).`);
        const { Items: comments } = await docClient.send(new QueryCommand(params));
        console.log(`Bilgi: Log ${logId} için ${comments ? comments.length : 0} yorum bulundu.`);

        // Kullanıcı bilgilerini topluca çek
        const userIds = comments.map(c => c.userId);
        const uniqueUserIds = [...new Set(userIds)];
        let userInfoMap = {};
        if (uniqueUserIds.length > 0) {
            const userKeys = uniqueUserIds.map(id => marshall({ userId: id }));
            const batchGetParams = {
                RequestItems: {
                    [USERS_TABLE]: {
                        Keys: userKeys,
                        ProjectionExpression: "userId, username, displayName, avatarUrl"
                    }
                }
            };
            try {
                const batchData = await ddbClient.send(new BatchGetItemCommand(batchGetParams));
                if (batchData.Responses && batchData.Responses[USERS_TABLE]) {
                    batchData.Responses[USERS_TABLE].forEach(marshalledItem => {
                        const user = unmarshall(marshalledItem);
                        userInfoMap[user.userId] = {
                            username: user.username,
                            displayName: user.displayName,
                            avatarUrl: user.avatarUrl,
                            isVerified: user.isVerified ?? false
                        };
                    });
                }
            } catch (err) {
                console.error("Kullanıcı bilgileri toplu çekilirken hata:", err);
            }
        }

        // Her yoruma userInfo ekle
        const commentsWithUserInfo = comments.map(comment => ({
            ...comment,
            userInfo: userInfoMap[comment.userId] || null
        }));

        res.status(200).json({ comments: commentsWithUserInfo });

    } catch (error) {
        console.error(`HATA: Yorumlar getirilirken hata oluştu (LogId: ${logId}):`, error);
        res.status(500).json({ message: 'Yorumlar getirilirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Belirtilen commentId'ye sahip yorumu siler. Sadece yorumu yapan silebilir.
 * @route DELETE /api/comments/:commentId
 */
exports.deleteComment = async (req, res) => {
    const userId = req.user?.userId;
    const { commentId } = req.params;

    if (!userId) { return res.status(401).json({ message: 'Yorum silmek için giriş yapmalısınız.' }); }
    if (!commentId) { return res.status(400).json({ message: 'Silinecek yorum ID\'si belirtilmelidir.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }

    const params = {
        TableName: COMMENTS_TABLE,
        Key: { commentId: commentId },
        ConditionExpression: "userId = :uid", // Sadece yorumu yapan silebilir
        ExpressionAttributeValues: { ":uid": userId }
    };

    try {
        console.log(`Bilgi: Kullanıcı ${userId}, yorum ${commentId}'i silmeye çalışıyor.`);
        await docClient.send(new DeleteCommand(params));
        console.log(`Bilgi: Yorum ${commentId} başarıyla silindi.`);
        res.status(204).send(); // Başarılı, içerik yok

    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            console.warn(`Yorum Silme Hatası: Yorum bulunamadı veya yetki yok. CommentId: ${commentId}, UserId: ${userId}`);
            return res.status(404).json({ message: 'Yorum bulunamadı veya bu yorumu silme yetkiniz yok.' });
        }
        console.error(`HATA: Yorum silinirken hata oluştu (CommentId: ${commentId}, UserId: ${userId}):`, error);
        res.status(500).json({ message: 'Yorum silinirken bir sunucu hatası oluştu.' });
    }
};