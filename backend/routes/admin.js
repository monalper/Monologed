// Monologed/backend/routes/admin.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Kullanıcı yönetimi fonksiyonlarını userController'dan import et
const {
    getAllUsersForAdmin,
    deleteUserByAdmin,
    setUserAdminStatus
} = require('../controllers/userController');

// Site istatistikleri ve Editöryel Sayfa yönetimi fonksiyonlarını adminController'dan import et
const {
    getSiteStats,
    createEditorialPage,
    getAdminEditorialPages,
    getAdminEditorialPageById,
    updateEditorialPage,
    deleteEditorialPage,
    createEditorialTopList
} = require('../controllers/adminController');

// Editöryel Liste yönetimi fonksiyonlarını listController'dan import et
const {
    createList: createEditorialList, // Alias kullanarak isim çakışmasını önle
    getAdminEditorialLists,
    updateList: updateEditorialList, // Alias
    deleteList: deleteEditorialList  // Alias
} = require('../controllers/listController');


// === Admin Rotaları (/api/admin altında olacak) ===

// Site İstatistikleri
// GET /api/admin/stats
router.get('/stats', protect, getSiteStats);

// Kullanıcı Yönetimi
// GET /api/admin/users
router.get('/users', protect, getAllUsersForAdmin);
// DELETE /api/admin/users/:userIdToDelete
router.delete('/users/:userIdToDelete', protect, deleteUserByAdmin);
// PUT /api/admin/users/:userId/role
router.put('/users/:userId/role', protect, setUserAdminStatus);

// Editöryel Liste Yönetimi
// POST /api/admin/lists
router.post('/lists', protect, (req, res, next) => {
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Yetkisiz işlem." });
    req.body.isEditorialRoute = true; // Controller'a bu rotadan gelindiğini bildir
    next();
}, createEditorialList);

// GET /api/admin/lists
router.get('/lists', protect, getAdminEditorialLists);

// PUT /api/admin/lists/:listId
router.put('/lists/:listId', protect, (req, res, next) => {
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Yetkisiz işlem." });
    req.body.isEditorialRoute = true;
    next();
}, updateEditorialList);

// DELETE /api/admin/lists/:listId
router.delete('/lists/:listId', protect, (req, res, next) => {
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Yetkisiz işlem." });
    // deleteList controller'ı içinde zaten liste sahibinin kontrolü ve isEditorial kontrolü yapılmalı
    next();
}, deleteEditorialList);


// Editöryel Sayfa Yönetimi Rotaları
// POST /api/admin/editorial-pages
router.post('/editorial-pages', protect, createEditorialPage);

// GET /api/admin/editorial-pages
router.get('/editorial-pages', protect, getAdminEditorialPages);

// GET /api/admin/editorial-pages/:pageId
router.get('/editorial-pages/:pageId', protect, getAdminEditorialPageById);

// PUT /api/admin/editorial-pages/:pageId
router.put('/editorial-pages/:pageId', protect, updateEditorialPage);

// DELETE /api/admin/editorial-pages/:pageId
router.delete('/editorial-pages/:pageId', protect, deleteEditorialPage);

// Editöryel Top List Yönetimi
// POST /api/admin/editorial-toplist
router.post('/editorial-toplist', protect, (req, res, next) => {
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Yetkisiz işlem." });
    next();
}, createEditorialTopList);

module.exports = router;
