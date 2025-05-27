// Monologed/backend/routes/editorial.js
const express = require('express');
const router = express.Router();

// editorialPageController'dan ilgili fonksiyonları import et.
// Bu controller dosyasının 'Monologed/backend/controllers/editorialPageController.js' dizininde
// ve 'editorial_page_controller_check' ID'li dokümandaki gibi olduğundan emin olun.
const editorialPageController = require('../controllers/editorialPageController');

// Herkese açık, yayınlanmış tüm editöryel sayfaların bir listesini getirir
// GET /api/editorial-pages/
router.get('/', editorialPageController.listPublicEditorialPages);

// Belirli bir yayınlanmış editöryel sayfayı slug ile getirir
// GET /api/editorial-pages/:slug
router.get('/:slug', editorialPageController.getPublicEditorialPageBySlug);

module.exports = router;
