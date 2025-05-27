// backend/routes/follow.js
const express = require('express');
const followController = require('../controllers/followController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/follow/:userIdToFollow -> Belirtilen kullanıcıyı takip et
router.post('/:userIdToFollow', protect, followController.followUser);

// DELETE /api/follow/:userIdToUnfollow -> Belirtilen kullanıcıyı takipten çıkar
router.delete('/:userIdToUnfollow', protect, followController.unfollowUser);

// GET /api/follow/status/:userIdToCheck -> Giriş yapmış kullanıcı hedef kullanıcıyı takip ediyor mu? // <-- BU SATIR ÖNEMLİ
router.get('/status/:userIdToCheck', protect, followController.getFollowStatus); // <-- BU SATIR ÖNEMLİ

// Takip et/takipten çık toggle endpointi
router.post('/toggle/:userId', protect, followController.toggleFollow);

module.exports = router;