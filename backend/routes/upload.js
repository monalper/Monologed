const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Local storage (geliştirme için)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/covers/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// POST /api/upload/cover
router.post('/cover', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Dosya yüklenemedi.' });
  }
  // Local path, prod için S3 URL döndürmelisin!
  const url = `/uploads/covers/${req.file.filename}`;
  res.json({ url });
});

module.exports = router; 