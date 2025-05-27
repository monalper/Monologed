// backend/routes/logs.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const logController = require('../controllers/logController');
const commentController = require('../controllers/commentController');
// <<< YENİ: Upload middleware import edildi >>>
const { uploadPostImage, uploadCommentImage } = require('../middleware/uploadMiddleware');
// <<< YENİ SONU >>>


// === Log ve Post Rotaları ===

// POST /api/logs -> Yeni bir log veya post oluşturur (fotoğraf yükleme dahil)
// <<< GÜNCELLEME: uploadPostImage.single('image') middleware'i eklendi >>>
// Bu, istekte 'image' adında tek bir dosya bekler.
router.post('/', protect, uploadPostImage.single('image'), logController.createLog);
// <<< GÜNCELLEME SONU >>>


// GET /api/logs -> Giriş yapmış kullanıcının loglarını/postlarını getirir
router.get('/', protect, logController.getUserLogs);

// GET /api/logs/item/:contentType/:contentId -> Kullanıcının belirli bir içerik/sezon için logunu getirir
router.get('/item/:contentType/:contentId', protect, logController.getLogForItem);

// GET /api/logs/user/:userId -> Belirtilen kullanıcının loglarını/postlarını getirir (Public, sadece aktiviteler)
router.get('/user/:userId', logController.getLogsForUser);

// GET /api/logs/content/:contentType/:contentId -> Belirtilen içeriğin son herkese açık loglarını/postlarını getirir (sadece aktiviteler)
router.get('/content/:contentType/:contentId', logController.getPublicLogsForContent);

// GET /api/logs/:logId -> Belirtilen logun/postun detaylarını getirir
router.get('/:logId', logController.getLogById);

// PUT /api/logs/:logId -> Belirtilen logu günceller (Sadece 'log' türü için, fotoğraf güncelleme şimdilik yok)
router.put('/:logId', protect, logController.updateLog);

// DELETE /api/logs/:logId -> Belirtilen kaydı (log veya post) siler
router.delete('/:logId', protect, logController.deleteLog);


// === Beğeni Rotaları (Log/Post ile İlgili) ===
router.post('/:logId/like', protect, logController.likeLog);
router.delete('/:logId/like', protect, logController.unlikeLog);
router.get('/:logId/likes', logController.getLikeCountForLog); // Public
router.get('/:logId/like/status', protect, logController.checkLikeStatus);

// === Yorum Rotaları (Log/Post ile ilgili) ===
router.post('/:logId/comments', protect, uploadCommentImage.single('image'), commentController.addComment);
router.get('/:logId/comments', commentController.getCommentsForLog); // Public


module.exports = router;