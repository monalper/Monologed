// backend/controllers/followController.js
const { PutCommand, DeleteCommand, GetCommand, QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require('../config/awsConfig');
const { v4: uuidv4 } = require('uuid');

const FOLLOWS_TABLE = 'Follows';
const FOLLOWING_INDEX = 'FollowingIndex';
const NOTIFICATIONS_TABLE = 'Notifications';
const USERS_TABLE = "Users";
const { checkAndAwardAchievements } = require('../services/achievementService');

/**
 * Bir kullanıcıyı takip etme işlemi. Başarılı olursa bildirim oluşturur ve istatistikleri günceller.
 * @route POST /api/follow/:userIdToFollow
 */
exports.followUser = async (req, res) => {
    const followerUserId = req.user?.userId; // Takip eden (giriş yapmış kullanıcı)
    const followerUsername = req.user?.username; // Takip edenin kullanıcı adı
    const { userIdToFollow } = req.params; // Takip edilecek kullanıcı

    if (!followerUserId || !followerUsername) {
        return res.status(401).json({ message: 'Bu işlem için giriş yapmalısınız.' });
    }
    if (!userIdToFollow) {
        return res.status(400).json({ message: 'Takip edilecek kullanıcı ID\'si belirtilmelidir.' });
    }
    if (followerUserId === userIdToFollow) {
        return res.status(400).json({ message: 'Kullanıcı kendini takip edemez.' });
    }
    if (!docClient) {
        return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' });
    }

    const timestamp = new Date(); // Date nesnesi olarak al
    const timestampISO = timestamp.toISOString(); // ISO formatı (createdAt için)
    // Son kullanma tarihini hesapla (7 gün sonrası, saniye cinsinden)
    const expiresAtTimestamp = Math.floor(timestamp.getTime() / 1000) + (7 * 24 * 60 * 60); // 7 gün * 24 saat * 60 dk * 60 sn

    const followItem = {
        followerUserId: followerUserId,
        followingUserId: userIdToFollow,
        followedAt: timestampISO, // ISO formatı kullanılabilir
    };

    // Önce takip edilip edilmediğini kontrol edelim
    const checkParams = {
        TableName: FOLLOWS_TABLE,
        Key: {
            followerUserId: followerUserId,
            followingUserId: userIdToFollow
        }
    };

    try {
        const { Item: existingFollow } = await docClient.send(new GetCommand(checkParams));
        if (existingFollow) {
            console.warn(`Bilgi: Kullanıcı ${followerUserId}, ${userIdToFollow}'ı zaten takip ediyor.`);
            return res.status(200).json({ message: 'Kullanıcı zaten takip ediliyor.' });
        }

        // Takip işlemi
        const putParams = {
            TableName: FOLLOWS_TABLE,
            Item: followItem
        };

        console.log(`Bilgi: Kullanıcı ${followerUserId} (${followerUsername}), ${userIdToFollow}'ı takip etmeye çalışıyor.`);
        await docClient.send(new PutCommand(putParams));
        console.log(`Bilgi: Kullanıcı ${followerUserId}, ${userIdToFollow}'ı başarıyla takip etti.`);

        // İstatistik Güncelleme (Hata durumunda devam et)
        const updateFollowerStatsCmd = new UpdateCommand({
            TableName: USERS_TABLE, Key: { userId: followerUserId },
            UpdateExpression: "ADD followingCount :inc", ExpressionAttributeValues: { ":inc": 1 }
        });
        const updateFollowingStatsCmd = new UpdateCommand({
            TableName: USERS_TABLE, Key: { userId: userIdToFollow },
            UpdateExpression: "ADD followerCount :inc", ExpressionAttributeValues: { ":inc": 1 }
        });

        try {
            await Promise.all([
                docClient.send(updateFollowerStatsCmd),
                docClient.send(updateFollowingStatsCmd)
            ]);
            console.log(`Bilgi: Takipçi (${followerUserId}) ve takip edilen (${userIdToFollow}) istatistikleri güncellendi.`);
            // Başarım kontrolü (takip etme başarımı varsa)
            await checkAndAwardAchievements(followerUserId);
        } catch (statsError) {
            console.error(`HATA: Takip/Takipçi istatistikleri güncellenirken hata:`, statsError);
        }

        // Bildirim Oluşturma (Hata durumunda devam et)
        const notificationId = uuidv4();
        const newNotificationItem = {
            userId: userIdToFollow, // Bildirimi alacak kişi
            createdAt: timestampISO,   // Bildirim oluşturulma zamanı
            notificationId: notificationId,
            type: 'NEW_FOLLOWER',
            actorUserId: followerUserId,
            actorUsername: followerUsername,
            isRead: false,
            entityType: 'user',
            entityId: followerUserId,
            expiresAt: expiresAtTimestamp // Son kullanma tarihi eklendi
        };

        const notificationParams = {
            TableName: NOTIFICATIONS_TABLE,
            Item: newNotificationItem
        };

        try {
            await docClient.send(new PutCommand(notificationParams));
            console.log(`Bilgi: Kullanıcı ${userIdToFollow} için YENİ TAKİPÇİ bildirimi oluşturuldu (Expires: ${new Date(expiresAtTimestamp * 1000).toISOString()}).`);
        } catch (notificationError) {
            console.error(`HATA: Yeni takipçi bildirimi oluşturulamadı (Recipient: ${userIdToFollow}, Actor: ${followerUserId}):`, notificationError);
        }

        res.status(201).json({ message: 'Kullanıcı başarıyla takip edildi.' });

    } catch (error) {
        console.error(`HATA: Takip etme işlemi başarısız (Follower: ${followerUserId}, Following: ${userIdToFollow}):`, error);
        res.status(500).json({ message: 'Takip etme sırasında bir sunucu hatası oluştu.' });
    }
};

/**
 * Bir kullanıcıyı takipten çıkarma işlemi. İstatistikleri günceller.
 * @route DELETE /api/follow/:userIdToUnfollow
 */
exports.unfollowUser = async (req, res) => {
    const followerUserId = req.user?.userId; // Takipten çıkan (giriş yapmış kullanıcı)
    const { userIdToUnfollow } = req.params; // Takipten çıkılacak kullanıcı

    if (!followerUserId) {
        return res.status(401).json({ message: 'Bu işlem için giriş yapmalısınız.' });
    }
    if (!userIdToUnfollow) {
        return res.status(400).json({ message: 'Takipten çıkarılacak kullanıcı ID\'si belirtilmelidir.' });
    }
    if (!docClient) {
        return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' });
    }

    const params = {
        TableName: FOLLOWS_TABLE,
        Key: {
            followerUserId: followerUserId,
            followingUserId: userIdToUnfollow
        },
        ConditionExpression: "attribute_exists(followerUserId)" // Sadece takip ediliyorsa sil
    };

    try {
        console.log(`Bilgi: Kullanıcı ${followerUserId}, ${userIdToUnfollow}'ı takipten çıkarmaya çalışıyor.`);
        await docClient.send(new DeleteCommand(params));
        console.log(`Bilgi: Kullanıcı ${followerUserId}, ${userIdToUnfollow}'ı başarıyla takipten çıkardı.`);

        // İstatistik Güncelleme (Hata durumunda devam et)
        const updateFollowerStatsCmd = new UpdateCommand({
            TableName: USERS_TABLE, Key: { userId: followerUserId },
            UpdateExpression: "SET followingCount = followingCount - :dec",
            ConditionExpression: "followingCount > :zero", // 0'ın altına düşmesin
            ExpressionAttributeValues: { ":dec": 1, ":zero": 0 }
        });
        const updateFollowingStatsCmd = new UpdateCommand({
            TableName: USERS_TABLE, Key: { userId: userIdToUnfollow },
            UpdateExpression: "SET followerCount = followerCount - :dec",
            ConditionExpression: "followerCount > :zero", // 0'ın altına düşmesin
            ExpressionAttributeValues: { ":dec": 1, ":zero": 0 }
        });

        try {
            await Promise.all([
                docClient.send(updateFollowerStatsCmd).catch(err => { if(err.name !== 'ConditionalCheckFailedException') throw err; else console.warn(`Uyarı: ${followerUserId} followingCount azaltılamadı (zaten 0?).`); }),
                docClient.send(updateFollowingStatsCmd).catch(err => { if(err.name !== 'ConditionalCheckFailedException') throw err; else console.warn(`Uyarı: ${userIdToUnfollow} followerCount azaltılamadı (zaten 0?).`); })
            ]);
            console.log(`Bilgi: Takipten çıkma sonrası istatistikler güncellendi (Follower: ${followerUserId}, Following: ${userIdToUnfollow}).`);
        } catch (statsError) {
             console.error(`HATA: Takipten çıkma sonrası istatistikler güncellenirken hata:`, statsError);
        }

        res.status(200).json({ message: 'Kullanıcı takipten çıkarıldı.' });
    } catch (error) {
         if (error.name === 'ConditionalCheckFailedException') {
            console.warn(`Bilgi: Kullanıcı ${followerUserId}, ${userIdToUnfollow}'ı zaten takip etmiyor (silme işlemi atlandı).`);
            return res.status(404).json({ message: 'Kullanıcı zaten takip edilmiyor.' });
        }
        console.error(`HATA: Takipten çıkarma işlemi başarısız (Follower: ${followerUserId}, Following: ${userIdToUnfollow}):`, error);
        res.status(500).json({ message: 'Takipten çıkarma sırasında bir sunucu hatası oluştu.' });
    }
};

/**
 * Belirtilen kullanıcının takip ettiği kişilerin listesini getirir.
 * @route GET /api/users/:userId/following
 */
exports.getFollowing = async (req, res) => {
    const { userId } = req.params; // Profili görüntülenen kullanıcının ID'si

    if (!userId) {
        return res.status(400).json({ message: 'Kullanıcı ID\'si belirtilmelidir.' });
    }
    if (!docClient) {
        return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' });
    }

    const params = {
        TableName: FOLLOWS_TABLE,
        KeyConditionExpression: "followerUserId = :uid", // Bu kullanıcı kimi takip ediyor?
        ExpressionAttributeValues: {
            ":uid": userId
        },
        ProjectionExpression: "followingUserId, followedAt" // İstenen alanlar
    };

    try {
        console.log(`Bilgi: Kullanıcı ${userId}'nin takip ettikleri sorgulanıyor.`);
        const { Items } = await docClient.send(new QueryCommand(params));
        console.log(`Bilgi: Kullanıcı ${userId} için ${Items ? Items.length : 0} takip edilen bulundu.`);
        res.status(200).json({ following: Items || [] });
    } catch (error) {
        console.error(`HATA: Kullanıcı ${userId}'nin takip ettikleri getirilirken hata oluştu:`, error);
        res.status(500).json({ message: 'Takip edilenler listesi getirilirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Belirtilen kullanıcının takipçilerinin listesini getirir.
 * @route GET /api/users/:userId/followers
 */
exports.getFollowers = async (req, res) => {
    const { userId } = req.params; // Profili görüntülenen kullanıcının ID'si

    if (!userId) {
        return res.status(400).json({ message: 'Kullanıcı ID\'si belirtilmelidir.' });
    }
     if (!docClient) {
        return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' });
    }

    const params = {
        TableName: FOLLOWS_TABLE,
        IndexName: FOLLOWING_INDEX, // GSI Kullanılıyor
        KeyConditionExpression: "followingUserId = :uid", // Kimi bu kullanıcı takip ediyor?
        ExpressionAttributeValues: {
            ":uid": userId
        },
         ProjectionExpression: "followerUserId, followedAt" // İstenen alanlar
    };

    try {
        console.log(`Bilgi: Kullanıcı ${userId}'nin takipçileri sorgulanıyor (Index: ${FOLLOWING_INDEX}).`);
        const { Items } = await docClient.send(new QueryCommand(params));
        console.log(`Bilgi: Kullanıcı ${userId} için ${Items ? Items.length : 0} takipçi bulundu.`);
        res.status(200).json({ followers: Items || [] });
    } catch (error) {
        console.error(`HATA: Kullanıcı ${userId}'nin takipçileri getirilirken hata oluştu:`, error);
        res.status(500).json({ message: 'Takipçiler listesi getirilirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Giriş yapmış kullanıcının, belirtilen kullanıcıyı takip edip etmediğini kontrol eder.
 * @route GET /api/follow/status/:userIdToCheck
 */
exports.getFollowStatus = async (req, res) => {
    const loggedInUserId = req.user?.userId;
    const { userIdToCheck } = req.params;

     if (!loggedInUserId) {
        return res.status(200).json({ isFollowing: false }); // Giriş yapmamışsa false
    }
     if (!userIdToCheck) {
        return res.status(400).json({ message: 'Durumu kontrol edilecek kullanıcı ID\'si belirtilmelidir.' });
    }
     if (loggedInUserId === userIdToCheck) {
         return res.status(200).json({ isFollowing: false }); // Kendini takip etmez
     }
     if (!docClient) {
        return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' });
    }

    const params = {
        TableName: FOLLOWS_TABLE,
        Key: {
            followerUserId: loggedInUserId,
            followingUserId: userIdToCheck
        }
    };

    try {
        const { Item } = await docClient.send(new GetCommand(params));
        const isFollowing = !!Item; // Kayıt varsa true, yoksa false
        res.status(200).json({ isFollowing: isFollowing });
    } catch (error) {
        console.error(`HATA: Takip durumu kontrol edilirken hata oluştu (Follower: ${loggedInUserId}, Following: ${userIdToCheck}):`, error);
        res.status(500).json({ message: 'Takip durumu kontrol edilirken bir hata oluştu.', isFollowing: false });
    }
};

/**
 * Takip et/takipten çık toggle fonksiyonu
 * @route POST /api/follow/toggle/:userId
 */
exports.toggleFollow = async (req, res) => {
    const followerUserId = req.user?.userId;
    const followingUserId = req.params.userId;

    if (!followerUserId) {
        return res.status(401).json({ message: 'Bu işlem için giriş yapmalısınız.' });
    }
    if (!followingUserId) {
        return res.status(400).json({ message: 'Takip edilecek kullanıcı ID\'si belirtilmelidir.' });
    }
    if (followerUserId === followingUserId) {
        return res.status(400).json({ message: 'Kullanıcı kendini takip edemez.' });
    }
    if (!docClient) {
        return res.status(500).json({ message: 'Sunucu veritabanı yapılandırma hatası.' });
    }

    const timestamp = new Date();
    const timestampISO = timestamp.toISOString();
    const expiresAtTimestamp = Math.floor(timestamp.getTime() / 1000) + (7 * 24 * 60 * 60);

    try {
        // Mevcut takip durumunu kontrol et
        const checkParams = {
            TableName: FOLLOWS_TABLE,
            Key: {
                followerUserId: followerUserId,
                followingUserId: followingUserId
            }
        };

        const { Item: existingFollow } = await docClient.send(new GetCommand(checkParams));
        let isNowFollowing;

        if (existingFollow) {
            // Takipten çık
            console.log(`Bilgi: Kullanıcı ${followerUserId}, ${followingUserId}'ı takipten çıkarmaya çalışıyor.`);
            await docClient.send(new DeleteCommand(checkParams));
            isNowFollowing = false;

            // İstatistikleri güncelle
            const updateFollowerStatsCmd = new UpdateCommand({
                TableName: USERS_TABLE,
                Key: { userId: followerUserId },
                UpdateExpression: "SET followingCount = followingCount - :dec",
                ConditionExpression: "followingCount > :zero",
                ExpressionAttributeValues: { ":dec": 1, ":zero": 0 }
            });
            const updateFollowingStatsCmd = new UpdateCommand({
                TableName: USERS_TABLE,
                Key: { userId: followingUserId },
                UpdateExpression: "SET followerCount = followerCount - :dec",
                ConditionExpression: "followerCount > :zero",
                ExpressionAttributeValues: { ":dec": 1, ":zero": 0 }
            });

            try {
                await Promise.all([
                    docClient.send(updateFollowerStatsCmd).catch(err => {
                        if (err.name !== 'ConditionalCheckFailedException') throw err;
                        console.warn(`Uyarı: ${followerUserId} followingCount azaltılamadı (zaten 0?).`);
                    }),
                    docClient.send(updateFollowingStatsCmd).catch(err => {
                        if (err.name !== 'ConditionalCheckFailedException') throw err;
                        console.warn(`Uyarı: ${followingUserId} followerCount azaltılamadı (zaten 0?).`);
                    })
                ]);
                console.log(`Bilgi: Takipten çıkma sonrası istatistikler güncellendi.`);
            } catch (statsError) {
                console.error(`HATA: Takipten çıkma sonrası istatistikler güncellenirken hata:`, statsError);
            }
        } else {
            // Takip et
            console.log(`Bilgi: Kullanıcı ${followerUserId}, ${followingUserId}'ı takip etmeye çalışıyor.`);
            const followItem = {
                followerUserId: followerUserId,
                followingUserId: followingUserId,
                followedAt: timestampISO
            };

            await docClient.send(new PutCommand({
                TableName: FOLLOWS_TABLE,
                Item: followItem
            }));
            isNowFollowing = true;

            // İstatistikleri güncelle
            const updateFollowerStatsCmd = new UpdateCommand({
                TableName: USERS_TABLE,
                Key: { userId: followerUserId },
                UpdateExpression: "ADD followingCount :inc",
                ExpressionAttributeValues: { ":inc": 1 }
            });
            const updateFollowingStatsCmd = new UpdateCommand({
                TableName: USERS_TABLE,
                Key: { userId: followingUserId },
                UpdateExpression: "ADD followerCount :inc",
                ExpressionAttributeValues: { ":inc": 1 }
            });

            try {
                await Promise.all([
                    docClient.send(updateFollowerStatsCmd),
                    docClient.send(updateFollowingStatsCmd)
                ]);
                console.log(`Bilgi: Takip etme sonrası istatistikler güncellendi.`);
                
                // Başarım kontrolü
                await checkAndAwardAchievements(followerUserId);
            } catch (statsError) {
                console.error(`HATA: Takip etme sonrası istatistikler güncellenirken hata:`, statsError);
            }

            // Bildirim oluştur
            const notificationId = uuidv4();
            const newNotificationItem = {
                userId: followingUserId,
                createdAt: timestampISO,
                notificationId: notificationId,
                type: 'NEW_FOLLOWER',
                actorUserId: followerUserId,
                actorUsername: req.user?.username,
                isRead: false,
                entityType: 'user',
                entityId: followerUserId,
                expiresAt: expiresAtTimestamp
            };

            try {
                await docClient.send(new PutCommand({
                    TableName: NOTIFICATIONS_TABLE,
                    Item: newNotificationItem
                }));
                console.log(`Bilgi: Yeni takipçi bildirimi oluşturuldu.`);
            } catch (notificationError) {
                console.error(`HATA: Yeni takipçi bildirimi oluşturulamadı:`, notificationError);
            }
        }

        res.status(200).json({ 
            message: isNowFollowing ? 'Kullanıcı başarıyla takip edildi.' : 'Kullanıcı takipten çıkarıldı.',
            isFollowing: isNowFollowing 
        });

    } catch (error) {
        console.error(`HATA: Takip toggle işlemi başarısız (Follower: ${followerUserId}, Following: ${followingUserId}):`, error);
        res.status(500).json({ 
            message: 'Takip işlemi sırasında bir sunucu hatası oluştu.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
