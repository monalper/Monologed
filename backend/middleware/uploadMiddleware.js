// backend/middleware/uploadMiddleware.js
const { S3Client } = require("@aws-sdk/client-s3");
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// S3 istemcisini awsConfig'den alalım
const { s3Client } = require('../config/awsConfig');

const POST_IMAGES_BUCKET = process.env.S3_POST_IMAGES_BUCKET || 'monologed-post-images';
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

console.log(`[uploadMiddleware] Bilgi: Gönderi fotoğrafları için S3 Bucket Adı: ${POST_IMAGES_BUCKET}`);

// Dosya türü filtresi
const fileFilter = (req, file, cb) => {
    if (ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        console.warn(`[uploadMiddleware] Uyarı: Geçersiz dosya türü reddedildi: ${file.mimetype}`);
        const error = new Error(`Geçersiz dosya türü: ${file.mimetype}. Sadece ${ALLOWED_IMAGE_MIMETYPES.map(t=>t.split('/')[1]).join(', ')} izin verilir.`);
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

// Gönderi fotoğrafı yükleme middleware'i
const uploadPostImage = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: POST_IMAGES_BUCKET,
        // acl: 'public-read', // <<< KALDIRILDI: ACL artık ayarlanmıyor >>>
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const userId = req.user?.userId || 'unknown_user';
            const uniqueSuffix = uuidv4();
            const extension = path.extname(file.originalname);
            const filename = `posts/${userId}/${uniqueSuffix}${extension}`;
            console.log(`[uploadMiddleware] Bilgi: Dosya S3'e kaydediliyor: ${filename}`);
            cb(null, filename);
        }
    }),
    limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    fileFilter: fileFilter
});

// Yorum görseli yükleme middleware'i
const uploadCommentImage = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: POST_IMAGES_BUCKET,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const userId = req.user?.userId || 'unknown_user';
            const uniqueSuffix = uuidv4();
            const extension = path.extname(file.originalname);
            const filename = `comments/${userId}/${uniqueSuffix}${extension}`;
            console.log(`[uploadMiddleware] Bilgi: Yorum görseli S3'e kaydediliyor: ${filename}`);
            cb(null, filename);
        }
    }),
    limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    fileFilter: fileFilter
});

module.exports = { uploadPostImage, uploadCommentImage };
