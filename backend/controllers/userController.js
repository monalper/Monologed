// backend/controllers/userController.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
// Gerekli AWS SDK komutları import ediliyor (QueryCommand zaten vardı, tekrar eklemeye gerek yok)
const { PutCommand, QueryCommand, GetCommand, UpdateCommand, ScanCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require('../config/awsConfig');
const { sendWelcomeEmail } = require('../services/emailService');
const path = require('path');

// Constants
const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const USERS_TABLE = "Users"; // Bu değişkenin tanımlı olduğundan emin olun
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;

// --- Standart Kullanıcı Fonksiyonları ---

/**
 * Registers a new user.
 * @route POST /api/users/register
 */
exports.registerUser = async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'Kullanıcı adı, e-posta ve şifre alanları zorunludur.' });
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    const usernameTrimmed = username.trim();
    const emailLower = email.toLowerCase();
    if (!USERNAME_REGEX.test(usernameTrimmed)) return res.status(400).json({ message: `Kullanıcı adı sadece harf, rakam ve alt çizgi (_) içerebilir.` });
    if (usernameTrimmed.length < USERNAME_MIN_LENGTH || usernameTrimmed.length > USERNAME_MAX_LENGTH) return res.status(400).json({ message: `Kullanıcı adı ${USERNAME_MIN_LENGTH} ile ${USERNAME_MAX_LENGTH} karakter arasında olmalıdır.` });

    try {
        const checkUsernameParams = { TableName: USERS_TABLE, IndexName: "UsernameIndex", KeyConditionExpression: "username = :uname", ExpressionAttributeValues: { ":uname": usernameTrimmed }, ProjectionExpression: "userId" };
        const checkEmailParams = { TableName: USERS_TABLE, IndexName: "EmailIndex", KeyConditionExpression: "email = :emailVal", ExpressionAttributeValues: { ":emailVal": emailLower }, ProjectionExpression: "userId" };
        const [existingUsernameResult, existingEmailResult] = await Promise.all([
            docClient.send(new QueryCommand(checkUsernameParams)).catch(err => {console.error("Username check error:", err); throw err; }),
            docClient.send(new QueryCommand(checkEmailParams)).catch(err => {console.error("Email check error:", err); throw err; })
        ]);
        if (existingUsernameResult.Items && existingUsernameResult.Items.length > 0) return res.status(409).json({ message: 'Bu kullanıcı adı zaten alınmış.' });
        if (existingEmailResult.Items && existingEmailResult.Items.length > 0) return res.status(409).json({ message: 'Bu e-posta adresi zaten kullanılıyor.' });

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const userId = uuidv4();
        const timestamp = new Date().toISOString();
        const newUserItem = {
            userId, username: usernameTrimmed, email: emailLower, passwordHash: hashedPassword,
            name: usernameTrimmed, createdAt: timestamp, updatedAt: timestamp,
            logCount: 0, reviewCount: 0, listCount: 0, followerCount: 0, followingCount: 0, watchlistCount: 0,
            avatarUrl: null, isVerified: false, isAdmin: false
        };
        await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: newUserItem }));
        console.log(`Bilgi: Yeni kullanıcı kaydedildi - ID: ${userId}, Email: ${newUserItem.email}`);

        sendWelcomeEmail(newUserItem.email, newUserItem.username).catch(emailError => {
            console.error(`KRİTİK HATA: Hoş geldin e-postası gönderimi sırasında beklenmedik hata:`, emailError);
        });

        const userToSend = { ...newUserItem }; delete userToSend.passwordHash;
        res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.', user: userToSend });
    } catch (error) {
        console.error("HATA: Kullanıcı kaydı sırasında bir hata oluştu:", error);
        if (error.name === 'ResourceNotFoundException') return res.status(500).json({ message: 'Veritabanı tablosu veya index bulunamadı.' });
        res.status(500).json({ message: 'Kullanıcı kaydı sırasında beklenmedik bir sunucu hatası oluştu.' });
    }
};

/**
 * Logs in a user.
 * @route POST /api/users/login
 */
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'E-posta ve şifre alanları zorunludur.' });
    if (!JWT_SECRET || !docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    try {
        const queryCommand = new QueryCommand({
            TableName: USERS_TABLE, IndexName: "EmailIndex", KeyConditionExpression: "email = :emailVal",
            ExpressionAttributeValues: { ":emailVal": email.toLowerCase() },
            ProjectionExpression: "userId, username, email, passwordHash, createdAt, avatarUrl, #nm, logCount, reviewCount, listCount, followerCount, followingCount, watchlistCount, isVerified, isAdmin",
            ExpressionAttributeNames: { "#nm": "name" }
        });
        const { Items } = await docClient.send(queryCommand);
        if (!Items || Items.length === 0) return res.status(401).json({ message: 'Geçersiz e-posta veya şifre.' });
        if (Items.length > 1) { console.error(`KRİTİK GÜVENLİK UYARISI: "${email}" e-postası ile birden fazla kullanıcı bulundu!`); return res.status(500).json({ message: 'Giriş sırasında beklenmedik bir sorun oluştu.' }); }
        const user = Items[0];
        if (!user.passwordHash) return res.status(401).json({ message: 'Bu hesap türü için şifre ile giriş desteklenmiyor.' });

        const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordMatch) return res.status(401).json({ message: 'Geçersiz e-posta veya şifre.' });

        const payload = { userId: user.userId, username: user.username };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
        const userToSend = { ...user }; delete userToSend.passwordHash;
        userToSend.isVerified = userToSend.isVerified ?? false;
        userToSend.isAdmin = userToSend.isAdmin ?? false;

        console.log(`Bilgi: Kullanıcı giriş yaptı - ID: ${user.userId}, Email: ${user.email}, IsAdmin: ${userToSend.isAdmin}`);
        res.status(200).json({ message: "Giriş başarılı!", token: token, user: userToSend });
    } catch (error) {
        console.error("HATA: Kullanıcı girişi sırasında bir hata oluştu:", error);
        res.status(500).json({ message: 'Giriş işlemi sırasında beklenmedik bir sunucu hatası oluştu.' });
    }
};

/**
 * Checks if an email already exists in the database.
 * @route POST /api/users/check-email
 */
exports.checkEmailExists = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'E-posta adresi gereklidir.' });
    }
    if (!docClient) {
        return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    }

    const emailLower = email.toLowerCase();
    // EmailIndex'i kullanarak sorgula (Bu index'in DynamoDB'de tanımlı olduğundan emin ol!)
    const params = {
        TableName: USERS_TABLE,
        IndexName: "EmailIndex", // E-posta için GSI (Global Secondary Index) adı
        KeyConditionExpression: "email = :emailVal",
        ExpressionAttributeValues: {
            ":emailVal": emailLower
        },
        ProjectionExpression: "userId" // Sadece varlığı kontrol etmek için küçük bir alan yeterli
    };

    try {
        console.log(`[Backend] checkEmailExists sorgusu gönderiliyor: ${emailLower}`);
        const { Items } = await docClient.send(new QueryCommand(params));
        const exists = Items && Items.length > 0;
        console.log(`[Backend] checkEmailExists sonucu (${emailLower}): ${exists}`);
        // Yanıtı JSON olarak gönder
        res.status(200).json({ exists: exists });
    } catch (error) {
        console.error(`HATA: E-posta kontrolü sırasında hata (${emailLower}):`, error);
        // Hata durumunda bile JSON yanıtı gönder
        res.status(500).json({ message: 'E-posta kontrolü sırasında bir sunucu hatası oluştu.' });
    }
};


/**
 * Gets the profile of the logged-in user.
 * @route GET /api/users/profile
 */
exports.getUserProfile = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Yetkilendirme başarısız.' });
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    const params = {
        TableName: USERS_TABLE, Key: { userId: userId },
        ProjectionExpression: "userId, username, email, createdAt, avatarUrl, #nm, logCount, reviewCount, listCount, followerCount, followingCount, watchlistCount, isVerified, isAdmin, pinnedLogId, bio",
        ExpressionAttributeNames: { "#nm": "name" }
    };
    try {
        const { Item } = await docClient.send(new GetCommand(params));
        if (!Item) return res.status(404).json({ message: 'Kullanıcı profili bulunamadı.' });
        Item.isVerified = Item.isVerified ?? false;
        Item.isAdmin = Item.isAdmin ?? false;
        res.status(200).json(Item);
    } catch (error) {
        console.error(`HATA: Profil getirilirken hata (UserId: ${userId}):`, error);
        res.status(500).json({ message: 'Profil bilgileri getirilirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Gets the public profile of a user.
 * @route GET /api/users/public/:userId
 */
exports.getPublicUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const command = new GetCommand({
            TableName: USERS_TABLE,
            Key: { userId }
        });

        const response = await docClient.send(command);
        if (!response.Item) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hassas bilgileri çıkar
        const { password, email, ...userData } = response.Item;
        res.status(200).json({ user: userData });
    } catch (error) {
        console.error('Error in getPublicUserProfile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Gets the public profile of a user by username.
 * @route GET /api/users/public/username/:username
 */
exports.getPublicUserProfileByUsername = async (req, res) => {
    const { username } = req.params;
    if (!username) return res.status(400).json({ message: 'Kullanıcı adı belirtilmelidir.' });
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });

    try {
        // Önce kullanıcı adına göre kullanıcıyı bul
        const queryParams = {
            TableName: USERS_TABLE,
            IndexName: "UsernameIndex",
            KeyConditionExpression: "username = :uname",
            ExpressionAttributeValues: { ":uname": username },
            ProjectionExpression: "userId, username, createdAt, avatarUrl, #nm, isVerified, isAdmin, pinnedLogId, bio",
            ExpressionAttributeNames: { "#nm": "name" }
        };

        const { Items } = await docClient.send(new QueryCommand(queryParams));
        if (!Items || Items.length === 0) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        
        const user = Items[0];
        user.isVerified = user.isVerified ?? false;
        user.isAdmin = user.isAdmin ?? false;
        res.status(200).json({ user });
    } catch (error) {
        console.error(`HATA: Herkese açık profil getirilirken hata (Kullanıcı adı: ${username}):`, error);
        res.status(500).json({ message: 'Kullanıcı profili getirilirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Updates the profile of the logged-in user.
 * @route PUT /api/users/profile
 */
exports.updateUserProfile = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Profil güncellemek için giriş yapmalısınız.' });
    const { username, name, bio } = req.body;
    const file = req.file;
    const usernameTrimmed = username?.trim();
    const nameTrimmed = name?.trim();
    const bioTrimmed = bio?.trim();
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    if (username === undefined && name === undefined && bio === undefined && !file) return res.status(400).json({ message: 'Güncellenecek bir bilgi gönderilmedi.' });

    let currentUserData;
    try {
        const { Item } = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId }, ProjectionExpression: "username, #nm, avatarUrl, bio", ExpressionAttributeNames: {"#nm": "name"} }));
        if (!Item) return res.status(404).json({ message: 'Güncellenecek kullanıcı bulunamadı.' });
        currentUserData = Item;
    } catch(getErr) { return res.status(500).json({ message: 'Profil güncellenirken bir sorun oluştu.' }); }

    const isUsernameChanged = usernameTrimmed && usernameTrimmed !== currentUserData.username;
    const isNameChanged = name !== undefined && nameTrimmed !== (currentUserData.name || '');
    const isBioChanged = bio !== undefined && bioTrimmed !== (currentUserData.bio || '');
    const isAvatarChanged = !!file;

    if (!isUsernameChanged && !isNameChanged && !isBioChanged && !isAvatarChanged) {
        const { Item: fullUserData } = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId }, ProjectionExpression: "userId, username, email, createdAt, avatarUrl, #nm, logCount, reviewCount, listCount, followerCount, followingCount, watchlistCount, isVerified, isAdmin, bio", ExpressionAttributeNames: { "#nm": "name" } }));
         if (fullUserData) { fullUserData.isVerified = fullUserData.isVerified ?? false; fullUserData.isAdmin = fullUserData.isAdmin ?? false; delete fullUserData.passwordHash; return res.status(200).json({ message: "Herhangi bir değişiklik yapılmadı.", user: fullUserData }); }
         else { return res.status(404).json({ message: 'Kullanıcı verisi bulunamadı.' }); }
    }

    if (isUsernameChanged) {
        if (!USERNAME_REGEX.test(usernameTrimmed)) return res.status(400).json({ message: `Kullanıcı adı sadece harf, rakam ve alt çizgi (_) içerebilir.` });
        if (usernameTrimmed.length < USERNAME_MIN_LENGTH || usernameTrimmed.length > USERNAME_MAX_LENGTH) return res.status(400).json({ message: `Kullanıcı adı ${USERNAME_MIN_LENGTH} ile ${USERNAME_MAX_LENGTH} karakter arasında olmalıdır.` });
        try {
            const checkUsernameParams = { TableName: USERS_TABLE, IndexName: "UsernameIndex", KeyConditionExpression: "username = :uname", ExpressionAttributeValues: { ":uname": usernameTrimmed }, ProjectionExpression: "userId" };
            const { Items: existingUsers } = await docClient.send(new QueryCommand(checkUsernameParams));
            if (existingUsers && existingUsers.length > 0 && existingUsers[0].userId !== userId) return res.status(409).json({ message: 'Bu kullanıcı adı zaten alınmış.' });
        } catch (checkError) { return res.status(500).json({ message: 'Kullanıcı adı kontrol edilirken bir hata oluştu.' }); }
    }

    let updateExpressionParts = [];
    const expressionAttributeValues = { ':uid': userId };
    const expressionAttributeNames = {};
    let newAvatarUrl = null;

    if (isAvatarChanged) {
        if (file.location) { newAvatarUrl = file.location; updateExpressionParts.push("avatarUrl = :avatar"); expressionAttributeValues[":avatar"] = newAvatarUrl; }
        else console.error("HATA: Avatar dosyası işlendi ancak S3 URL'si (file.location) bulunamadı!", file);
    }
    if (isUsernameChanged) { updateExpressionParts.push("#usr = :uname"); expressionAttributeNames["#usr"] = "username"; expressionAttributeValues[":uname"] = usernameTrimmed; }
    if (isNameChanged) { updateExpressionParts.push("#nm = :nameVal"); expressionAttributeNames["#nm"] = "name"; expressionAttributeValues[":nameVal"] = nameTrimmed; }
    if (isBioChanged) { updateExpressionParts.push("bio = :bioVal"); expressionAttributeValues[":bioVal"] = bioTrimmed; }
    updateExpressionParts.push("updatedAt = :ts"); expressionAttributeValues[":ts"] = new Date().toISOString();

    const updateCommand = new UpdateCommand({
        TableName: USERS_TABLE, Key: { userId: userId }, ConditionExpression: "userId = :uid",
        UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ...(Object.keys(expressionAttributeNames).length > 0 && { ExpressionAttributeNames: expressionAttributeNames }),
        ReturnValues: "ALL_NEW"
    });

    try {
        const { Attributes: updatedUser } = await docClient.send(updateCommand);
        const userToSend = { ...updatedUser }; delete userToSend.passwordHash;
        userToSend.isVerified = userToSend.isVerified ?? false;
        userToSend.isAdmin = userToSend.isAdmin ?? false;
        let newToken = null;
        if (isUsernameChanged) {
            const newPayload = { userId: userToSend.userId, username: userToSend.username };
            newToken = jwt.sign(newPayload, JWT_SECRET, { expiresIn: '7d' });
        }
        res.status(200).json({ message: "Profil başarıyla güncellendi.", user: userToSend, ...(newToken && { token: newToken }) });
    } catch (error) {
        console.error(`HATA: Profil DynamoDB'de güncellenirken hata (UserId: ${userId}):`, error);
        if (error.name === 'ConditionalCheckFailedException') return res.status(404).json({ message: 'Güncellenecek kullanıcı bulunamadı veya işlem yetkisiz.' });
        res.status(500).json({ message: 'Profil güncellenirken bir veritabanı hatası oluştu.' });
    }
};

/**
 * Sets the verification status of a user. (Admin only)
 * @route PUT /api/users/:userId/verify
 */
exports.setVerificationStatus = async (req, res) => {
    const { userId } = req.params;
    const { verified } = req.body;

    if (!req.user?.isAdmin) {
        console.warn(`Yetkisiz Doğrulama Denemesi: Kullanıcı ${req.user?.userId} (Admin değil), ${userId}'in durumunu değiştirmeye çalıştı.`);
        return res.status(403).json({ message: 'Bu işlem için yönetici yetkiniz yok.' });
    }

    if (verified === undefined || typeof verified !== 'boolean') return res.status(400).json({ message: 'Geçerli bir onay durumu (verified: true/false) gönderilmelidir.' });
    if (!userId) return res.status(400).json({ message: 'Kullanıcı ID\'si belirtilmelidir.' });
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });

    const updateParams = {
        TableName: USERS_TABLE, Key: { userId: userId },
        UpdateExpression: "SET isVerified = :status, updatedAt = :ts",
        ConditionExpression: "attribute_exists(userId)",
        ExpressionAttributeValues: { ":status": verified, ":ts": new Date().toISOString() },
        ReturnValues: "UPDATED_NEW"
    };

    try {
        console.log(`Bilgi: Yönetici (${req.user?.userId}) tarafından kullanıcı ${userId} onay durumu ${verified} olarak ayarlanıyor...`);
        const { Attributes: updatedUser } = await docClient.send(new UpdateCommand(updateParams));
        const userToSend = { ...updatedUser }; delete userToSend.passwordHash;
        userToSend.isAdmin = userToSend.isAdmin ?? false;

        console.log(`Bilgi: Kullanıcı ${userId} onay durumu başarıyla ${verified} olarak ayarlandı.`);
        res.status(200).json({ message: `Kullanıcı onay durumu başarıyla ${verified} olarak ayarlandı.`, user: userToSend });
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') return res.status(404).json({ message: 'Durumu güncellenecek kullanıcı bulunamadı.' });
        console.error(`HATA: Kullanıcı ${userId} onay durumu güncellenirken hata:`, error);
        res.status(500).json({ message: 'Kullanıcı onay durumu güncellenirken bir hata oluştu.' });
    }
};

/**
 * Searches for users by username or name.
 * @route GET /api/users/search?query=...
 */
exports.searchUsers = async (req, res) => {
    const { query } = req.query;
    const limit = parseInt(req.query.limit) || 10;
    if (!query || query.trim().length < 2) return res.status(200).json({ users: [] });
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    const searchQuery = query.trim().toLowerCase();
    const params = {
        TableName: USERS_TABLE,
        ProjectionExpression: "userId, username, #nm, avatarUrl, isVerified, isAdmin",
        ExpressionAttributeNames: { "#nm": "name" },
    };
    try {
        console.log(`Bilgi: Kullanıcı aranıyor (Scan): "${searchQuery}"`);
        let scannedItems = []; let lastEvaluatedKey;
        do {
            const scanCommand = new ScanCommand({ ...params, ExclusiveStartKey: lastEvaluatedKey });
            const { Items, LastEvaluatedKey } = await docClient.send(scanCommand);
            if (Items) scannedItems = scannedItems.concat(Items);
            lastEvaluatedKey = LastEvaluatedKey;
            if (scannedItems.length > 5000) { console.warn("Uyarı: Kullanıcı araması Scan işlemi 5000 öğeyi aştı, performans sorunları olabilir. Tarama durduruldu."); break; }
        } while (lastEvaluatedKey);

        const filteredUsers = scannedItems.filter(user =>
            (user.username && user.username.toLowerCase().includes(searchQuery)) ||
            (user.name && user.name.toLowerCase().includes(searchQuery))
        );
        const users = filteredUsers
            .map(user => ({
                userId: user.userId, username: user.username, name: user.name || null,
                avatarUrl: user.avatarUrl || null, isVerified: user.isVerified ?? false,
                isAdmin: user.isAdmin ?? false
            }))
            .slice(0, limit);
        console.log(`Bilgi: "${searchQuery}" araması için ${users.length} kullanıcı bulundu (filtrelenmiş).`);
        res.status(200).json({ users: users });
    } catch (error) {
        console.error(`HATA: Kullanıcı araması sırasında hata ("${searchQuery}"):`, error);
        res.status(500).json({ message: 'Kullanıcı araması sırasında bir sunucu hatası oluştu.' });
    }
};

/**
 * Pins or unpins a log/post for the user.
 * @route POST /api/users/:userId/pin
 */
exports.pinLog = async (req, res) => {
    const { userId } = req.params;
    const { logId } = req.body;
    if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ message: 'Yetkisiz işlem.' });
    }
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    try {
        await docClient.send(new UpdateCommand({
            TableName: USERS_TABLE,
            Key: { userId },
            UpdateExpression: 'SET pinnedLogId = :logId',
            ExpressionAttributeValues: { ':logId': logId || null },
        }));
        res.json({ success: true, pinnedLogId: logId || null });
    } catch (err) {
        console.error('Pinleme işlemi hatası:', err);
        res.status(500).json({ message: 'Pinleme işlemi başarısız.' });
    }
};

// --- Admin Fonksiyonları ---

/**
 * Gets all users for the admin panel. (Admin only)
 * @route GET /api/admin/users
 */
exports.getAllUsersForAdmin = async (req, res) => {
    if (!req.user?.isAdmin) {
        console.warn(`Yetkisiz Erişim Denemesi (getAllUsersForAdmin): Kullanıcı ${req.user?.userId} (Admin değil) tüm kullanıcıları listelemeye çalıştı.`);
        return res.status(403).json({ message: 'Bu işlem için yönetici yetkiniz yok.' });
    }
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });

    const params = {
        TableName: USERS_TABLE,
        ProjectionExpression: "userId, username, email, #nm, avatarUrl, createdAt, isVerified, isAdmin",
        ExpressionAttributeNames: { "#nm": "name" }
    };
    try {
        console.log("Bilgi: Yönetici paneli için tüm kullanıcılar listeleniyor...");
        let allUsers = [];
        let lastEvaluatedKey;
        do {
            const command = new ScanCommand({ ...params, ExclusiveStartKey: lastEvaluatedKey });
            const { Items, LastEvaluatedKey } = await docClient.send(command);
            if (Items) allUsers = allUsers.concat(Items);
            lastEvaluatedKey = LastEvaluatedKey;
        } while (lastEvaluatedKey);

        allUsers = allUsers.map(u => ({ ...u, isVerified: u.isVerified ?? false, isAdmin: u.isAdmin ?? false }));

        console.log(`Bilgi: Yönetici paneli için ${allUsers.length} kullanıcı bulundu.`);
        res.status(200).json({ users: allUsers });
    } catch (error) {
        console.error("HATA: Yönetici paneli için kullanıcılar listelenirken hata:", error);
        res.status(500).json({ message: 'Kullanıcılar listelenirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Deletes a user by admin. (Admin only)
 * @route DELETE /api/admin/users/:userIdToDelete
 */
exports.deleteUserByAdmin = async (req, res) => {
    const { userIdToDelete } = req.params;
    const adminUserId = req.user?.userId;

    if (!req.user?.isAdmin) {
        console.warn(`Yetkisiz Silme Denemesi: Kullanıcı ${adminUserId} (Admin değil), ${userIdToDelete}'i silmeye çalıştı.`);
        return res.status(403).json({ message: 'Bu işlem için yönetici yetkiniz yok.' });
    }
    if (adminUserId === userIdToDelete) {
        return res.status(400).json({ message: 'Yöneticiler kendi hesaplarını silemez.' });
    }
    if (!userIdToDelete) return res.status(400).json({ message: 'Silinecek kullanıcı ID\'si belirtilmelidir.' });
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });

    const deleteParams = {
        TableName: USERS_TABLE, Key: { userId: userIdToDelete },
        ConditionExpression: "attribute_exists(userId)"
    };
    try {
        console.log(`Bilgi: Yönetici ${adminUserId}, kullanıcı ${userIdToDelete}'i siliyor...`);
        await docClient.send(new DeleteCommand(deleteParams));
        console.log(`Bilgi: Kullanıcı ${userIdToDelete} başarıyla silindi.`);
        // TODO: Kullanıcıya ait diğer verileri de temizlemek (loglar, listeler, takipçiler vb.)
        res.status(200).json({ message: 'Kullanıcı başarıyla silindi.' });
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') return res.status(404).json({ message: 'Silinecek kullanıcı bulunamadı.' });
        console.error(`HATA: Yönetici tarafından kullanıcı silinirken hata (UserToDelete: ${userIdToDelete}, Admin: ${adminUserId}):`, error);
        res.status(500).json({ message: 'Kullanıcı silinirken bir sunucu hatası oluştu.' });
    }
};

/**
 * Sets the admin status of a user. (Admin only)
 * @route PUT /api/admin/users/:userId/role
 */
exports.setUserAdminStatus = async (req, res) => {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    if (!req.user?.isAdmin) {
        console.warn(`Yetkisiz Rol Değiştirme Denemesi: Kullanıcı ${req.user?.userId} (Admin değil), ${userId}'in rolünü değiştirmeye çalıştı.`);
        return res.status(403).json({ message: 'Bu işlem için yönetici yetkiniz yok.' });
    }
    if (req.user?.userId === userId) {
        return res.status(400).json({ message: 'Kendi yönetici rolünüzü bu şekilde değiştiremezsiniz.' });
    }
    if (isAdmin === undefined || typeof isAdmin !== 'boolean') {
        return res.status(400).json({ message: 'Geçerli bir admin durumu (isAdmin: true/false) gönderilmelidir.' });
    }
    if (!userId) return res.status(400).json({ message: 'Kullanıcı ID\'si belirtilmelidir.' });
    if (!docClient) return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });

    const updateParams = {
        TableName: USERS_TABLE, Key: { userId: userId },
        UpdateExpression: "SET isAdmin = :adminStatus, updatedAt = :ts",
        ConditionExpression: "attribute_exists(userId)",
        ExpressionAttributeValues: { ":adminStatus": isAdmin, ":ts": new Date().toISOString() },
        ReturnValues: "UPDATED_NEW"
    };

    try {
        console.log(`Bilgi: Yönetici (${req.user?.userId}) tarafından kullanıcı ${userId} admin durumu ${isAdmin} olarak ayarlanıyor...`);
        const { Attributes: updatedUser } = await docClient.send(new UpdateCommand(updateParams));
        const userToSend = { ...updatedUser }; delete userToSend.passwordHash;
        userToSend.isVerified = userToSend.isVerified ?? false;

        console.log(`Bilgi: Kullanıcı ${userId} admin durumu başarıyla ${isAdmin} olarak ayarlandı.`);
        res.status(200).json({ message: `Kullanıcı admin durumu başarıyla ${isAdmin} olarak ayarlandı.`, user: userToSend });
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') return res.status(404).json({ message: 'Rolü değiştirilecek kullanıcı bulunamadı.' });
        console.error(`HATA: Kullanıcı ${userId} admin durumu güncellenirken hata:`, error);
        res.status(500).json({ message: 'Kullanıcı admin durumu güncellenirken bir hata oluştu.' });
    }
};
