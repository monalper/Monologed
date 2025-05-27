// backend/routes/tv.js
const express = require('express');
const router = express.Router();
const tvController = require('../controllers/tvController');
const { protect } = require('../middleware/authMiddleware'); // protect middleware'ini import et

// Popüler diziler
// GET /api/tv/popular
router.get('/popular', tvController.getPopularTvShows);

// Dizi arama
// GET /api/tv/search?query=...
router.get('/search', tvController.searchTvShows);

// Dizi detayları
// GET /api/tv/:tvId
router.get('/:tvId', tvController.getTvShowDetails);

// Dizi önerileri
// GET /api/tv/:tvId/similar
router.get('/:tvId/similar', tvController.getRecommendedTvShows);

// Sezon Bölümlerini Getir
// GET /api/tv/:tvId/season/:seasonNumber/episodes
router.get('/:tvId/season/:seasonNumber/episodes', tvController.getSeasonEpisodes);

// --- YENİ ROTA: Kullanıcının Dizi İzleme İlerlemesini Getir ---
// Bu rota korumalı olmalı çünkü kullanıcının kendi ilerlemesini getiriyor
// GET /api/tv/:tvId/progress
router.get('/:tvId/progress', protect, tvController.getProgressForShow);
// --- YENİ ROTA SONU ---

// <<< YENİ ROTA: İzleme Sağlayıcıları >>>
// GET /api/tv/:tvId/watch-providers
router.get('/:tvId/watch-providers', tvController.getWatchProviders);

module.exports = router;
