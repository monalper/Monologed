// backend/routes/stats.js
const express = require('express');
const statsController = require('../controllers/statsController'); // Yeni controller'ı import et
const { protect } = require('../middleware/authMiddleware'); // Gerekirse yetkilendirme için

const router = express.Router();

// GET /api/users/:userId/stats -> Belirtilen kullanıcının istatistiklerini getirir
// Şimdilik public, istenirse 'protect' middleware'i eklenebilir.
router.get('/:userId/stats', statsController.getUserStats);

module.exports = router;
