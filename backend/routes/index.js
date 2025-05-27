// backend/routes/index.js
const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController'); // mainController'ı import et

// Veritabanı bağlantısını test etmek için rota (Mevcut)
router.get('/test-db', mainController.testDbConnection);

// --- YENİ ROTA: Öne Çıkan İçeriği Getir ---
// GET /api/main/featured isteğini mainController'daki getFeaturedContent fonksiyonuna yönlendirir
// Not: Bu rota genellikle /api altında olur, bu yüzden server.js'de app.use('/api/main', ...) gibi kullanmak daha mantıklı olabilir.
// Şimdilik index.js'e ekleyelim, server.js'de /api/main prefix'i ekleyeceğiz.
router.get('/featured', mainController.getFeaturedContent);
// --- YENİ ROTA SONU ---

module.exports = router;
