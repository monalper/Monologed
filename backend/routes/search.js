// backend/routes/search.js
const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// GET /api/search/multi?query=... -> Film/Dizi/Kişi arar (controller sadece film/dizi döner)
router.get('/multi', searchController.multiSearch);

module.exports = router;