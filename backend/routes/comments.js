// backend/routes/comments.js
const express = require('express');
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// DELETE /api/comments/:commentId -> Belirtilen yorumu siler (Sadece sahibi)
router.delete('/:commentId', protect, commentController.deleteComment);

module.exports = router;