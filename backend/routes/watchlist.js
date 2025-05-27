// backend/routes/watchlist.js
const express = require('express');
const watchlistController = require('../controllers/watchlistController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// --- Korumalı Watchlist Rotaları ---

// POST /api/watchlist -> Yeni öğe ekle (contentId ve contentType ile)
router.post('/', protect, watchlistController.addItemToWatchlist);

// DELETE /api/watchlist/:itemId -> Belirtilen öğeyi (PK ile) listeden kaldır
router.delete('/:itemId', protect, watchlistController.removeItemFromWatchlist);

// GET /api/watchlist -> Giriş yapmış kullanıcının tüm izleme listesini getir
router.get('/', protect, watchlistController.getUserWatchlist);

// GET /api/watchlist/status/:contentType/:contentId -> Belirli bir içeriğin listede olup olmadığını kontrol et
router.get('/status/:contentType/:contentId', protect, watchlistController.getWatchlistStatusForItem);

// <<< YENİ ROTA: Belirli bir kullanıcının izleme listesini getir (Public) >>>
// GET /api/watchlist/user/:userId
router.get('/user/:userId', watchlistController.getPublicUserWatchlist);
// <<< YENİ ROTA SONU >>>

module.exports = router;
