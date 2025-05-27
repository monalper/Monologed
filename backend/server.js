// Monologed/backend/server.js

// 1. Load environment variables from .env file
require('dotenv').config();

// 2. Import necessary modules
const express = require('express');
const cors = require('cors');
const path = require('path'); // path modülünü de ekleyelim, production build için lazım olabilir

// 3. Import route files
let mainRouter = null;
try {
    // Kullanıcının kullandığı dosya adı 'index.js' veya 'main.js' olabilir.
    // './routes/main' daha standart bir isimlendirme, eğer varsa onu tercih ederiz.
    // Eğer './routes/index' kullanılıyorsa ve çalışıyorsa, o şekilde bırakılabilir.
    mainRouter = require('./routes/main'); // Önceki dokümanlardaki gibi './routes/main' varsayıyorum
    console.log("Bilgi: routes/main.js başarıyla yüklendi.");
} catch (e) {
    console.log("Not: './routes/main.js' bulunamadı veya yüklenemedi, alternatif aranıyor...");
    try {
        mainRouter = require('./routes/index');
        console.log("Bilgi: routes/index.js başarıyla yüklendi.");
    } catch (e2) {
        console.log("Not: './routes/index.js' de bulunamadı veya yüklenemedi, ana rotalar atlanıyor.");
    }
}
const movieRouter = require('./routes/movies');
const tvRouter = require('./routes/tv');
const suggestionRouter = require('./routes/suggestions');
const searchRouter = require('./routes/search');
const userRouter = require('./routes/users');
const logRouter = require('./routes/logs');
const listRouter = require('./routes/lists');
const watchlistRouter = require('./routes/watchlist');
const followRoutes = require('./routes/follow');
const feedRouter = require('./routes/feed');
const commentsRouter = require('./routes/comments');
const achievementRouter = require('./routes/achievements');
const notificationRouter = require('./routes/notifications');
const adminRouter = require('./routes/admin');
const importRouter = require('./routes/import');
const statsRouter = require('./routes/stats'); // statsRouter eksikti, ekledim.
const editorialPageRouter = require('./routes/editorial');
const uploadRoutes = require('./routes/upload');

// 4. Create Express application
const app = express();

// 5. Determine the port number
const PORT = process.env.PORT || 5000;

// --- Middleware ---
// Enable CORS for requests from the frontend development server
const allowedOrigins = [
  'https://monologed.vercel.app',
  'https://monologed-rho.vercel.app',
  'http://localhost:5173',
  'https://monologed-frontend.onrender.com'
];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
// Parse incoming JSON request bodies
app.use(express.json());
// Parse incoming URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// --- Define API Routes ---
if (mainRouter) {
    app.use('/api/main', mainRouter);
}
app.use('/api/movies', movieRouter);
app.use('/api/tv', tvRouter);
app.use('/api/suggestions', suggestionRouter);
app.use('/api/search', searchRouter);
app.use('/api/users', userRouter);
app.use('/api/logs', logRouter);
app.use('/api/lists', listRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/follow', followRoutes);
app.use('/api/feed', feedRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/achievements', achievementRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/stats', statsRouter); // statsRouter kullanımı eklendi
app.use('/api/admin', adminRouter);
app.use('/api/import', importRouter);
app.use('/api/editorial-pages', editorialPageRouter);
app.use('/api/upload', uploadRoutes);
app.use('/uploads', express.static('uploads'));

// Frontend Build'i Sunma (Production Ortamı İçin)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('API çalışıyor... (Geliştirme Modu)');
    });
}

// Global Hata Yönetimi Middleware'i
app.use((err, req, res, next) => {
    console.error("Global Hata Yakalayıcı:", err.stack);
    res.status(500).send('Sunucuda bir şeyler ters gitti!');
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
    // Initial checks for environment variables and configurations...
    if (!process.env.TMDB_API_KEY) console.warn('Uyarı: TMDB_API_KEY ortam değişkeni bulunamadı!'); else console.log('Bilgi: TMDB API Anahtarı yüklendi.');
    if (!process.env.JWT_SECRET) console.warn('Uyarı: JWT_SECRET ortam değişkeni bulunamadı!'); else console.log('Bilgi: JWT Secret yüklendi.');
    const { docClient, s3Client } = require('./config/awsConfig'); // Bu import burada olmamalı, en başta olmalı. Ama çalışıyorsa şimdilik kalsın.
    if (!docClient) console.error('HATA: DynamoDB DocumentClient başlatılamadı!'); else console.log('Bilgi: DynamoDB DocumentClient başarıyla başlatıldı.');
    if (!s3Client) console.warn('Uyarı: S3 Client başlatılamadı (Avatar yükleme çalışmayabilir).'); else console.log('Bilgi: S3 Client başarıyla başlatıldı.');
    if (!process.env.S3_AVATAR_BUCKET) console.warn('Uyarı: S3_AVATAR_BUCKET ortam değişkeni bulunamadı (Avatar yükleme çalışmayabilir)!'); else console.log(`Bilgi: Avatar Bucket: ${process.env.S3_AVATAR_BUCKET}`);
});
