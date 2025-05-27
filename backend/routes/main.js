// backend/routes/main.js
const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController'); // Main controller'ı import et
const { authenticateTokenOptional } = require('../middleware/authMiddleware'); // Opsiyonel token kontrolü

// Öne çıkan içerikleri getiren endpoint
// GET /api/main/featured
router.get('/featured', authenticateTokenOptional, mainController.getFeaturedContent);

// Gelecekte /api/main altına eklenebilecek diğer rotalar buraya gelebilir
// Örneğin:
// router.get('/site-stats', mainController.getSiteStats);

module.exports = router;
