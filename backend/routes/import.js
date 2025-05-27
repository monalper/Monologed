// backend/routes/import.js
const express = require('express');
const router = express.Router();
// Middleware for protecting routes that require authentication
const { protect } = require('../middleware/authMiddleware');
// Controller function for handling the import logic
const importController = require('../controllers/importController');

/**
 * @route   POST /api/import/letterboxd
 * @desc    Handles importing data from a Letterboxd CSV file.
 * @access  Protected (Requires user to be logged in)
 *
 * Expects a JSON body with:
 * {
 * "type": "diary" | "ratings" | "watchlist", // Type of the CSV data
 * "data": [ ... ] // Array of objects parsed from the CSV
 * }
 */
router.post('/letterboxd', protect, importController.importLetterboxdData);

module.exports = router;
