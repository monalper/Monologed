// backend/routes/notifications.js
const express = require('express');
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/notifications -> Kullanıcının bildirimlerini getir (varsayılan okunmamışlar)
// GET /api/notifications?all=true -> Kullanıcının tüm bildirimlerini getir
router.get('/', protect, notificationController.getNotifications);

// GET /api/notifications/unread-count -> Okunmamış bildirim sayısını getir
router.get('/unread-count', protect, notificationController.getUnreadNotificationCount);

// PUT /api/notifications/mark-read -> Belirtilen bildirimleri okundu yap
// Body: { notificationIds: [{ createdAt: '...', notificationId: '...' }, ...] }
router.put('/mark-read', protect, notificationController.markNotificationsAsRead);

module.exports = router;