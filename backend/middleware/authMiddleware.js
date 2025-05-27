// Monologed/backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require('../config/awsConfig');

const JWT_SECRET = process.env.JWT_SECRET;
const USERS_TABLE = "Users"; // Tablo adı

/**
 * Gelen isteklerde JWT'yi doğrular ve kullanıcıyı req nesnesine ekler.
 * Kullanıcının isAdmin bilgisini de içerir.
 */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            if (!JWT_SECRET) {
                console.error("AuthMiddleware HATA: JWT_SECRET tanımlı değil!");
                // Kullanıcıya daha genel bir hata mesajı döndürmek daha iyi olabilir.
                return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
            }
            const decoded = jwt.verify(token, JWT_SECRET);

            if (!docClient) {
                 console.error("AuthMiddleware HATA: DynamoDB DocumentClient başlatılamamış.");
                 // Kullanıcıya daha genel bir hata mesajı
                 return res.status(500).json({ message: 'Veritabanı bağlantı hatası.' });
            }

            // --- DÜZELTME: 'isAdmin' alanını çek ---
            const getCommand = new GetCommand({
                TableName: USERS_TABLE,
                Key: {
                    userId: decoded.userId
                },
                // Kullanıcı adı, email, createdAt, avatarUrl ve isAdmin alanlarını çek
                // Not: 'name' alanı da sıkça kullanılıyor, onu da ekleyelim.
                ProjectionExpression: "userId, username, email, createdAt, avatarUrl, #nm, isVerified, isAdmin",
                ExpressionAttributeNames: {
                    "#nm": "name" // 'name' rezerve bir kelime olabilir, bu yüzden alias kullanıyoruz.
                                  // 'isAdmin' ve 'isVerified' rezerve değilse # gerekmez ama güvenlik için eklenebilir.
                }
            });
            // --- DÜZELTME SONU ---

            const { Item } = await docClient.send(getCommand);

            if (!Item) {
                return res.status(401).json({ message: 'Yetkilendirme başarısız, kullanıcı bulunamadı.' });
            }

            // Kullanıcı bilgisini (şifre hariç, isAdmin dahil) isteğe ekle
            // Item.isAdmin zaten boolean olmalı, Item.isVerified de.
            // AuthContext'te varsayılan olarak false atanıyordu, burada doğrudan Item'dan gelen değer kullanılır.
            req.user = Item;

            next();

        } catch (error) {
            console.error('Auth Middleware Hatası:', error.name, error.message);
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Yetkilendirme başarısız, geçersiz token.' });
            } else if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Oturum süresi doldu, lütfen tekrar giriş yapın.' });
            } else {
                 // Diğer beklenmedik hatalar için
                 return res.status(500).json({ message: 'Yetkilendirme sırasında bir sunucu hatası oluştu.' });
            }
        }
    }

    if (!token) {
        // Token yoksa direkt yetkisiz erişim hatası ver
        return res.status(401).json({ message: 'Yetkilendirme başarısız, token bulunamadı.' });
    }
};

module.exports = { protect };
