// backend/routes/suggestions.js
const express = require('express');
const router = express.Router();
const suggestionController = require('../controllers/suggestionController');

// GET /api/suggestions?query=... -> Birleşik film/dizi önerilerini getir
router.get('/', suggestionController.getSuggestions);

module.exports = router;