// backend/routes/feed.js
const express = require('express');
const feedController = require('../controllers/feedController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/feed -> Giriş yapmış kullanıcının aktivite akışını getirir
router.get('/', protect, feedController.getFeed);

module.exports = router;