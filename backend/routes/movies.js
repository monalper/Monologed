// backend/routes/movies.js
const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');

// Popüler filmler
// GET /api/movies/popular
router.get('/popular', movieController.getPopularMovies);

// Film arama (tam sonuçlar için)
// GET /api/movies/search?query=...
router.get('/search', movieController.searchMovies);

// Film önerileri (autocomplete için)
// GET /api/movies/suggest?query=...
router.get('/suggest', movieController.getMovieSuggestions);

// Film detayları
// GET /api/movies/:movieId
router.get('/:movieId', movieController.getMovieDetails);

// Benzer filmler
// GET /api/movies/:movieId/similar
router.get('/:movieId/similar', movieController.getSimilarMovies);

// <<< YENİ ROTA: İzleme Sağlayıcıları >>>
// GET /api/movies/:movieId/watch-providers
router.get('/:movieId/watch-providers', movieController.getWatchProviders);


module.exports = router;
