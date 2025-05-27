// Monologed/backend/routes/lists.js

const express = require('express');
const {
    createList, // Bu artık hem kullanıcı hem de admin tarafından kullanılacak (farklı rotalardan)
    getUserLists,
    getListById,
    addItemToList,
    removeItemFromList,
    deleteList,
    getPublicUserLists,
    getPublicEditorialLists, // Yeni public endpoint
    updateList // Kullanıcı kendi listesini güncelleyebilsin
} = require('../controllers/listController.js');
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();

// --- Kullanıcı Listeleri için Rotalar ---
// POST /api/lists -> Yeni kullanıcı listesi oluştur (Korumalı)
router.post('/', protect, (req, res, next) => {
    req.body.isEditorialRoute = false; // Kullanıcı rotasından gelindiğini belirt
    next();
}, createList);

// GET /api/lists -> Giriş yapmış kullanıcının kendi listelerini getir (Korumalı)
router.get('/', protect, getUserLists);

// PUT /api/lists/:listId -> Kullanıcının kendi listesini güncelle (Korumalı)
router.put('/:listId', protect, (req, res, next) => {
    req.body.isEditorialRoute = false;
    next();
}, updateList);

// DELETE /api/lists/:listId -> Kullanıcının kendi listesini sil (Korumalı)
router.delete('/:listId', protect, (req, res, next) => {
    // deleteList controller'ı içinde liste sahibinin req.user.userId ile eşleşip eşleşmediği kontrol edilecek
    next();
}, deleteList);


// POST /api/lists/:listId/items -> Kullanıcının kendi listesine öğe ekle (Korumalı)
router.post('/:listId/items', protect, addItemToList);

// DELETE /api/lists/:listId/items -> Kullanıcının kendi listesinden öğe çıkar (Korumalı)
router.delete('/:listId/items', protect, removeItemFromList);


// --- Herkese Açık Liste Rotaları ---
// GET /api/lists/user/:userId -> Belirli bir kullanıcının herkese açık listelerini getir
router.get('/user/:userId', getPublicUserLists);

// GET /api/lists/editorial -> Tüm herkese açık editöryel listeleri getir
router.get('/editorial', getPublicEditorialLists);

// GET /api/lists/:listId -> Belirtilen ID'ye sahip listeyi getir (Public veya Sahibi)
// Bu rota hem kullanıcı listeleri hem de editöryel listeler için çalışır,
// getListById controller'ı içinde erişim kontrolü yapılır.
router.get('/:listId', protect, getListById); // protect opsiyonel, getListById içinde kontrol var


module.exports = router;