// backend/routes/achievements.js
const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const authMiddleware = require('../middleware/authMiddleware'); // Gerekirse auth middleware

// Kullanıcının kazandığı başarımları getir
router.get('/user/:userId', achievementController.getUserAchievements);

// *** YENİ: Tüm başarım tanımlarını getir ***
router.get('/definitions', achievementController.getAchievementDefinitions);

// Başarım kontrolü (manuel tetikleme veya test için - opsiyonel)
// router.post('/check', authMiddleware.authenticateToken, achievementController.checkUserAchievements);

module.exports = router;
