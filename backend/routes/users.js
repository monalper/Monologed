// backend/routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController'); // userController'ı import et
const followController = require('../controllers/followController');
const { getUserStats } = require('../controllers/statsController'); // <<< Stats controller import edildi
const { protect } = require('../middleware/authMiddleware'); // authMiddleware'i import et
// Orijinal dosyadaki tüm importlar korunuyor
const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3Client } = require('../config/awsConfig');
const path = require('path');


// --- Orijinal S3 ve Multer Yapılandırması (Dokunulmadı) ---
if (!s3Client) { console.error("[routes/users.js] HATA: S3 istemcisi (s3Client) awsConfig.js'den yüklenemedi!"); }
else { console.log("[routes/users.js] Bilgi: S3 istemcisi (s3Client) başarıyla yüklendi."); }
const bucketName = process.env.S3_AVATAR_BUCKET;
if (!bucketName) { console.error("[routes/users.js] HATA: S3_AVATAR_BUCKET ortam değişkeni .env dosyasında tanımlı değil!"); }
else { console.log(`[routes/users.js] Bilgi: Kullanılacak S3 Bucket Adı: ${bucketName}`); }
const upload = s3Client && bucketName ? multer({
    storage: multerS3({
        s3: s3Client, bucket: bucketName, contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            const userId = req.user?.userId || 'unknown-user';
            const uniqueSuffix = Date.now(); const fileExtension = path.extname(file.originalname);
            cb(null, `avatars/${userId}-${uniqueSuffix}${fileExtension}`);
        }
    }),
    fileFilter: (req, file, cb) => { if (file.mimetype.startsWith('image/')) cb(null, true); else cb(new Error('Sadece resim dosyaları yüklenebilir!'), false); },
    limits: { fileSize: 1024 * 1024 * 5 } // 5MB limit
}) : null;
if (!upload) { console.error("[routes/users.js] HATA: 'upload' middleware yapılandırması BAŞARISIZ oldu!"); }
const handleUploadMiddleware = (req, res, next) => {
    if (!upload) { console.error("handleUploadMiddleware: 'upload' null olduğu için dosya yükleme servisi hatası."); return res.status(500).json({ message: "Dosya yükleme servisi yapılandırılamadı." }); }
    const uploadMiddleware = upload.single('avatar');
    uploadMiddleware(req, res, (err) => {
        if (err instanceof multer.MulterError) {
             if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Dosya boyutu çok büyük (Maksimum 5MB).' });
            return res.status(400).json({ message: `Dosya yükleme hatası: ${err.message}` });
        } else if (err) {
            console.error("Genel Dosya Yükleme veya S3 Hatası:", err.message);
             if (err.message?.includes('authorized to perform: s3:PutObject')) return res.status(403).json({ message: 'Dosya yükleme yetkiniz yok. (AWS İzin Hatası)' });
             if (err.message?.includes('does not allow ACLs')) return res.status(400).json({ message: 'Bucket ACL ayarlarına izin vermiyor. (Yapılandırma Hatası)' });
            return res.status(400).json({ message: err.message || 'Dosya yüklenemedi.' });
        }
        console.log("[handleUploadMiddleware] Dosya yükleme başarılı, controller'a geçiliyor."); next();
    });
};
// --- Orijinal S3 ve Multer Yapılandırması Sonu ---


// === Public Rotalar (Herkes erişebilir) ===
// Mevcut site fonksiyonları - Dokunulmadı
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// --- MOBİL UYGULAMA İÇİN YENİ EKLENEN ROTA ---
// E-postanın var olup olmadığını kontrol etmek için POST isteği.
// Bu rota sadece mobil uygulama tarafından kullanılacak, siteyi etkilemez.
router.post('/check-email', userController.checkEmailExists);
// --- YENİ ROTA SONU ---

// Mevcut site fonksiyonları - Dokunulmadı
router.get('/public/:userId', userController.getPublicUserProfile);
router.get('/search', userController.searchUsers); // Kullanıcı Arama

// === Korumalı Rotalar (Giriş yapmış kullanıcı gerektirir) ===
// Mevcut site fonksiyonları - Dokunulmadı
router.get('/profile', protect, userController.getUserProfile);
// Orijinal profil güncelleme rotası (handleUploadMiddleware kullanıyor) - Dokunulmadı
router.put('/profile', protect, handleUploadMiddleware, userController.updateUserProfile);

// === Takipçi/Takip Edilen Rotaları ===
// Mevcut site fonksiyonları - Dokunulmadı
router.get('/:userId/following', followController.getFollowing);
router.get('/:userId/followers', followController.getFollowers);

// === Kullanıcı Doğrulama ===
// Mevcut site fonksiyonları - Dokunulmadı
router.put('/:userId/verify', protect, userController.setVerificationStatus);

// === İstatistik Rotası ===
// Mevcut site fonksiyonları - Dokunulmadı
router.get('/:userId/stats', getUserStats);

// === Pinleme (Sabitlenmiş log/post) ===
router.post('/:userId/pin', protect, userController.pinLog);

// === Admin Rotaları (Orijinal dosyadaki yorumlar korundu) ===
// Bu satırlar admin.js'de olduğu için burada yoruma alındı.
// router.get('/admin/users', protect, getAllUsersForAdmin);
// router.delete('/admin/users/:userIdToDelete', protect, deleteUserByAdmin);
// router.put('/admin/users/:userId/role', protect, setUserAdminStatus);


module.exports = router; // Router'ı export et
