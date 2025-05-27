// backend/controllers/logController.js

const { v4: uuidv4 } = require('uuid');
const { PutCommand, QueryCommand, UpdateCommand, DeleteCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { BatchGetItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const { docClient, ddbClient } = require('../config/awsConfig');
const { checkAndAwardAchievements } = require('../services/achievementService');
const axios = require('axios');

const LOGS_TABLE = "Logs";
const USER_LOGS_INDEX = "UserLogsIndex";
const CONTENT_LOGS_INDEX = "ContentLogsIndex";
const USERS_TABLE = "Users";
const LIKES_TABLE = "Likes";
const NOTIFICATIONS_TABLE = 'Notifications';

// TMDB Ayarları
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

// --- fetchContentDetailsForStats fonksiyonu (değişiklik yok) ---
async function fetchContentDetailsForStats(contentType, contentId, seasonNumber = null, episodeNumber = null) {
    // ... (kod aynı kalır) ...
    if (!API_KEY || !contentType || !contentId) {
        console.warn(`fetchContentDetailsForStats: Eksik parametreler veya API Key. Type: ${contentType}, ID: ${contentId}`);
        return { runtimeMinutes: null, genreIds: null };
    }

    let detailUrl = `${TMDB_BASE_URL}/${contentType}/${contentId}`;
    let isEpisodeRequest = false;
    let isGeneralTvLog = false;

    if (contentType === 'tv') {
        if (seasonNumber !== null && episodeNumber !== null && seasonNumber >= 0 && episodeNumber >= 1) {
            detailUrl = `${TMDB_BASE_URL}/tv/${contentId}/season/${seasonNumber}/episode/${episodeNumber}`;
            isEpisodeRequest = true;
            // console.log(`Bilgi: Bölüm detayı çekiliyor: ${detailUrl}`);
        } else if (seasonNumber === null && episodeNumber === null) {
            isGeneralTvLog = true;
             // console.log(`Bilgi: Genel dizi logu için detaylar çekiliyor: ${detailUrl}`);
        }
    }

    try {
        const response = await axios.get(detailUrl, {
            params: { api_key: API_KEY, language: 'tr-TR' }
        });
        const data = response.data;
        let runtimeMinutes = null;
        let genreIds = data.genres ? data.genres.map(g => g.id) : null;

        if (isEpisodeRequest && data.runtime) {
            runtimeMinutes = Number(data.runtime);
            genreIds = null;
            // console.log(`Bilgi: Bölüm ${seasonNumber}/${episodeNumber} süresi: ${runtimeMinutes}`);

        } else if (isGeneralTvLog && data.seasons) {
            // console.log(`Bilgi: Genel dizi logu (${contentType}/${contentId}) için toplam süre hesaplanıyor... Bu işlem uzun sürebilir.`);
            let totalRuntime = 0;
            let episodeFetchCount = 0;
            const seasonPromises = [];

            for (const season of data.seasons) {
                if (season.season_number === undefined || season.season_number === null || season.season_number <= 0 || season.episode_count <= 0) {
                    continue;
                }
                const seasonDetailUrl = `${TMDB_BASE_URL}/tv/${contentId}/season/${season.season_number}`;
                seasonPromises.push(
                    axios.get(seasonDetailUrl, { params: { api_key: API_KEY, language: 'tr-TR' } })
                        .then(seasonRes => {
                            let seasonTotalMinutes = 0;
                            const episodes = seasonRes.data?.episodes || [];
                            episodes.forEach(episode => {
                                if (episode.runtime && typeof episode.runtime === 'number' && episode.runtime > 0) {
                                    seasonTotalMinutes += episode.runtime;
                                    episodeFetchCount++;
                                } else {
                                     // console.warn(`Uyarı: Bölüm S${season.season_number}E${episode.episode_number} için süre bilgisi bulunamadı veya geçersiz.`);
                                }
                            });
                             // console.log(` - Sezon ${season.season_number}: ${episodes.length} bölüm, Toplam Süre: ${seasonTotalMinutes} dk`);
                            return seasonTotalMinutes;
                        })
                        .catch(seasonErr => {
                            // console.error(`HATA: Sezon ${season.season_number} detayları çekilirken hata:`, seasonErr.response?.data?.status_message || seasonErr.message);
                            return 0;
                        })
                );
            }
            const seasonRuntimes = await Promise.all(seasonPromises);
            totalRuntime = seasonRuntimes.reduce((sum, runtime) => sum + runtime, 0);

            if (totalRuntime > 0) {
                runtimeMinutes = totalRuntime;
                // console.log(`Bilgi: Genel dizi logu (${contentType}/${contentId}) için hesaplanan toplam süre: ${runtimeMinutes} dakika (${episodeFetchCount} bölüm üzerinden).`);
            } else {
                 // console.warn(`Uyarı: Genel dizi logu (${contentType}/${contentId}) için toplam süre hesaplanamadı veya 0. Ortalama süre kullanılacak.`);
                 if (data.episode_run_time && data.episode_run_time.length > 0 && data.number_of_episodes) {
                    const avgRuntime = Number(data.episode_run_time[0]);
                    const numEpisodes = Number(data.number_of_episodes);
                    if (!isNaN(avgRuntime) && avgRuntime > 0 && !isNaN(numEpisodes) && numEpisodes > 0) {
                         runtimeMinutes = Math.round(avgRuntime * numEpisodes);
                         // console.log(` -> Tahmini Toplam Süre (Ortalama * Bölüm Sayısı): ${runtimeMinutes} dk`);
                    }
                 }
            }

        } else if (contentType === 'movie' && data.runtime) {
            runtimeMinutes = Number(data.runtime);
        } else if (contentType === 'tv' && data.episode_run_time && data.episode_run_time.length > 0) {
            runtimeMinutes = Number(data.episode_run_time[0]);
            // console.log(`Bilgi: Dizi için ortalama bölüm süresi kullanılıyor: ${runtimeMinutes}`);
        }

        if (isNaN(runtimeMinutes) || runtimeMinutes <= 0) {
            runtimeMinutes = null;
        }

        // console.log(`Bilgi: İçerik ${contentType}/${contentId} (Bölüm: ${isEpisodeRequest ? episodeNumber : 'Yok'}) için detaylar işlendi. Süre: ${runtimeMinutes}, Türler: ${genreIds?.join(',') ?? 'Bölüm için alınmadı'}`);
        return { runtimeMinutes, genreIds };

    } catch (error) {
        console.error(`HATA: TMDB detayları çekilirken hata (${detailUrl}):`, error.response?.data?.status_message || error.message);
        if (error.response?.status === 404) {
             console.warn(`Uyarı: TMDB'de kaynak bulunamadı: ${detailUrl}`);
             return { runtimeMinutes: null, genreIds: null };
        }
        return { runtimeMinutes: null, genreIds: null };
    }
}

/**
 * Yeni bir log veya post (alıntı/metin) oluşturur. Fotoğraf yüklemeyi destekler.
 * @route POST /api/logs
 */
const createLog = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) { return res.status(401).json({ message: 'İşlem yapmak için giriş yapmalısınız.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }

    // Gelen verileri al (req.body'den)
    const {
        contentId, contentType, watchedDate, rating, review, isRewatch, seasonNumber, episodeNumber,
        postText, postType = 'log',
        linkedContentId, linkedContentType, linkedContentTitle
    } = req.body;

    // <<< YENİ: Yüklenen dosyayı al (req.file'dan) >>>
    const uploadedImage = req.file;
    // <<< YENİ SONU >>>

    const logId = uuidv4();
    const timestamp = new Date().toISOString();
    const baseLogItem = {
        logId: logId,
        userId: userId,
        createdAt: timestamp,
        updatedAt: timestamp,
        likeCount: 0,
        isActivity: false,
        postType: postType
    };

    let numericContentId = null;
    let numericRating = null;
    let numericSeasonNumber = null;
    let numericEpisodeNumber = null;
    let numericLinkedContentId = null;
    let finalContentType = contentType;
    let finalLinkedContentType = linkedContentType;

    // --- Post Türü Kontrolü ---
    if (postType === 'quote' || postType === 'text') {
        // Metin/Alıntı gönderisi
        // <<< GÜNCELLEME: Hem metin hem de fotoğraf boş olamaz kontrolü >>>
        if ((!postText || postText.trim().length === 0) && !uploadedImage) {
            return res.status(400).json({ message: 'Gönderi metni veya fotoğraf eklemelisiniz.' });
        }
        // <<< GÜNCELLEME SONU >>>

        if (postText && postText.trim().length > 0) {
            baseLogItem.postText = postText.trim();
        }
        baseLogItem.isActivity = true;

        // <<< YENİ: Yüklenen fotoğraf URL'sini ekle >>>
        if (uploadedImage && uploadedImage.location) {
            baseLogItem.imageUrl = uploadedImage.location;
            console.log(`Bilgi: Gönderi ${logId} için fotoğraf yüklendi: ${uploadedImage.location}`);
        }
        // <<< YENİ SONU >>>

        // Bağlantılı içerik varsa doğrula
        if (linkedContentId !== undefined && linkedContentId !== null && linkedContentId !== '') {
            numericLinkedContentId = Number(linkedContentId);
            if (isNaN(numericLinkedContentId)) return res.status(400).json({ message: 'Bağlantılı içerik ID\'si geçerli bir sayı olmalıdır.' });
            if (!linkedContentType || (linkedContentType !== 'movie' && linkedContentType !== 'tv')) return res.status(400).json({ message: 'Bağlantılı içerik tipi "movie" veya "tv" olmalıdır.' });
            if (!linkedContentTitle || typeof linkedContentTitle !== 'string' || linkedContentTitle.trim().length === 0) return res.status(400).json({ message: 'Bağlantılı içerik başlığı boş olamaz.' });

            baseLogItem.linkedContentId = numericLinkedContentId;
            baseLogItem.linkedContentType = linkedContentType;
            baseLogItem.linkedContentTitle = linkedContentTitle.trim();
        }
        console.log(`Bilgi: Yeni ${postType} gönderisi oluşturuluyor. LogId: ${logId}`);

    } else if (postType === 'log') {
        // Film/Dizi logu (mevcut mantık)
        // <<< GÜNCELLEME: Log türü için fotoğraf yüklenemez >>>
        if (uploadedImage) {
            console.warn(`Uyarı: Log türü için fotoğraf yüklenmeye çalışıldı (LogId: ${logId}). Fotoğraf yok sayılıyor.`);
            // İsteğe bağlı: Burada hata da döndürebilirsiniz.
            // return res.status(400).json({ message: 'Film/dizi loglarına fotoğraf eklenemez.' });
        }
        // <<< GÜNCELLEME SONU >>>

        // --- Gelen Veriyi Doğrula ---
        if (!contentId || isNaN(Number(contentId))) { return res.status(400).json({ message: 'Geçerli bir içerik ID\'si (contentId) gönderilmelidir.' }); }
        numericContentId = Number(contentId);
        if (!finalContentType || (finalContentType !== 'movie' && finalContentType !== 'tv')) { return res.status(400).json({ message: 'İçerik tipi (contentType) "movie" veya "tv" olmalıdır.' }); }
        if (!watchedDate) { return res.status(400).json({ message: 'İzleme Tarihi (watchedDate) zorunludur.' }); }

        // Sezon/Bölüm Doğrulaması
        if (finalContentType === 'tv') {
            if (seasonNumber !== undefined && seasonNumber !== null && seasonNumber !== '') {
                numericSeasonNumber = Number(seasonNumber);
                if (isNaN(numericSeasonNumber) || !Number.isInteger(numericSeasonNumber) || numericSeasonNumber < 0) return res.status(400).json({ message: 'Sezon numarası geçerli bir pozitif tam sayı veya 0 olmalıdır.' });
                if (episodeNumber !== undefined && episodeNumber !== null && episodeNumber !== '') {
                    numericEpisodeNumber = Number(episodeNumber);
                    if (isNaN(numericEpisodeNumber) || !Number.isInteger(numericEpisodeNumber) || numericEpisodeNumber < 1) return res.status(400).json({ message: 'Bölüm numarası geçerli bir pozitif tam sayı olmalıdır.' });
                } else numericEpisodeNumber = null;
            } else {
                numericSeasonNumber = null;
                numericEpisodeNumber = null;
                if (episodeNumber !== undefined && episodeNumber !== null && episodeNumber !== '') console.warn("Uyarı: Genel dizi logu için bölüm numarası gönderildi, yok sayılıyor.");
            }
        } else {
            numericSeasonNumber = null;
            numericEpisodeNumber = null;
            if (seasonNumber !== undefined && seasonNumber !== null && seasonNumber !== '') return res.status(400).json({ message: 'Filmler için sezon numarası belirtilemez.' });
            if (episodeNumber !== undefined && episodeNumber !== null && episodeNumber !== '') return res.status(400).json({ message: 'Filmler için bölüm numarası belirtilemez.' });
        }

        // Puan Doğrulaması
        if (rating !== undefined && rating !== '' && rating !== null) {
            numericRating = Number(rating);
            if (isNaN(numericRating) || numericRating < 0.5 || numericRating > 10) return res.status(400).json({ message: 'Puan 0.5 ile 10 arasında bir sayı veya boş olmalıdır.' });
        }
        // --- Doğrulama Sonu ---

        const hasReview = review !== undefined && review !== null && typeof review === 'string' && review.trim() !== "";
        baseLogItem.isActivity = (numericRating !== null) || hasReview;
        console.log(`Bilgi: Yeni log oluşturuluyor. LogId: ${logId}, isActivity: ${baseLogItem.isActivity}`);

        baseLogItem.contentId = numericContentId;
        baseLogItem.contentType = finalContentType;
        baseLogItem.watchedDate = watchedDate;
        baseLogItem.isRewatch = isRewatch === true;
        if (numericRating !== null) baseLogItem.rating = numericRating;
        if (hasReview) baseLogItem.review = review.trim();
        if (numericSeasonNumber !== null) baseLogItem.seasonNumber = numericSeasonNumber;
        if (numericEpisodeNumber !== null) baseLogItem.episodeNumber = numericEpisodeNumber;

    } else {
        return res.status(400).json({ message: 'Geçersiz gönderi türü (postType).' });
    }

    // --- Veritabanı İşlemleri ---
    try {
        let runtimeMinutes = null;
        let genreIds = null;

        // Sadece 'log' türü için TMDB'den detay çek
        if (baseLogItem.postType === 'log') {
            // console.log(`Bilgi: İçerik detayları çekiliyor - Type: ${baseLogItem.contentType}, ID: ${baseLogItem.contentId}, Sezon: ${numericSeasonNumber}, Bölüm: ${numericEpisodeNumber}`);
            const details = await fetchContentDetailsForStats(
                baseLogItem.contentType,
                baseLogItem.contentId,
                numericSeasonNumber,
                numericEpisodeNumber
            );
            runtimeMinutes = details.runtimeMinutes;
            genreIds = details.genreIds;
            if (runtimeMinutes !== null) baseLogItem.runtimeMinutes = runtimeMinutes;
            if (genreIds !== null && genreIds.length > 0) baseLogItem.genreIds = genreIds;
        }

        console.log(`>>>createLog - Kaydedilecek ${baseLogItem.postType} öğesi:`, baseLogItem);

        // 1. Öğeyi kaydet
        const putCommand = new PutCommand({ TableName: LOGS_TABLE, Item: baseLogItem });
        await docClient.send(putCommand);
        console.log(`Bilgi: ${baseLogItem.postType} öğesi ${logId} başarıyla oluşturuldu.`);

        // 2. Kullanıcı istatistiklerini güncelle (sadece 'log' türü için)
        if (baseLogItem.postType === 'log') {
            const updateExpressionParts = ["ADD logCount :inc"];
            const expressionAttributeValues = { ":inc": 1 };
            if (baseLogItem.review) updateExpressionParts.push("reviewCount :inc");
            const updateUserStatsCommand = new UpdateCommand({
                TableName: USERS_TABLE, Key: { userId: userId },
                UpdateExpression: updateExpressionParts.join(", "),
                ExpressionAttributeValues: expressionAttributeValues, ReturnValues: "NONE"
            });
            try {
                await docClient.send(updateUserStatsCommand);
                await checkAndAwardAchievements(userId);
            } catch (statsError) {
                console.error(`HATA: Kullanıcı ${userId} istatistikleri güncellenirken hata:`, statsError);
            }
        }

        // Başarılı yanıtı döndür
        res.status(201).json({ message: "Kayıt başarıyla oluşturuldu.", log: baseLogItem });

    } catch (error) {
        // <<< YENİ: Multer hatasını yakala >>>
        if (error.code === 'LIMIT_FILE_SIZE') {
             console.error(`HATA: Dosya boyutu limiti aşıldı (UserId: ${userId}). Limit: ${error.limit / 1024 / 1024}MB`);
             return res.status(400).json({ message: `Dosya boyutu çok büyük. Maksimum ${error.limit / 1024 / 1024}MB olmalıdır.` });
        }
        if (error.code === 'INVALID_FILE_TYPE') {
             console.error(`HATA: Geçersiz dosya türü (UserId: ${userId}). Hata: ${error.message}`);
             return res.status(400).json({ message: error.message }); // Middleware'den gelen hata mesajını kullan
        }
        // <<< YENİ SONU >>>

        console.error(`HATA: Kayıt oluşturulurken genel hata (UserId: ${userId}):`, error);
        if (error instanceof TypeError || (error.name && error.name.includes('ValidationException'))) {
            return res.status(400).json({ message: 'Gönderilen verilerde format hatası olabilir.' });
        }
        res.status(500).json({ message: 'Kayıt oluşturulurken beklenmedik bir sunucu hatası oluştu.' });
    }
};
exports.createLog = createLog;

// --- Diğer Controller Fonksiyonları (updateLog, deleteLog, getUserLogs, vb.) ---
// Bu fonksiyonlarda şimdilik fotoğraf ile ilgili bir değişiklik yapmıyoruz.
// updateLog sadece 'log' türünü güncelliyor.
// deleteLog hem 'log' hem 'post' türünü siliyor ama S3'den fotoğrafı silmiyor (TODO).
// getUserLogs, getLogsForUser, getPublicLogsForContent, getLogForItem, like/unlike vb.
// fonksiyonlar imageUrl alanını otomatik olarak getirecektir.

const updateLog = async (req, res) => {
    // ... (kod aynı kalır, sadece 'log' türünü günceller) ...
    const userId = req.user?.userId;
    const { logId } = req.params;
    const { watchedDate, rating, review, isRewatch, seasonNumber, episodeNumber } = req.body;

    if (!userId) { return res.status(401).json({ message: 'Log güncellemek için giriş yapmalısınız.' }); }
    if (!logId) { return res.status(400).json({ message: 'Güncellenecek log ID belirtilmelidir.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }

    let existingLog;
    let oldReviewStatus = undefined;

    try {
        const getCmd = new GetCommand({
            TableName: LOGS_TABLE, Key: { logId: logId },
            ProjectionExpression: "userId, review, contentType, seasonNumber, episodeNumber, isActivity, postType"
        });
        const { Item } = await docClient.send(getCmd);
        if (!Item) { return res.status(404).json({ message: 'Güncellenecek kayıt bulunamadı.' }); }
        if (Item.userId !== userId) { return res.status(403).json({ message: 'Bu kaydı güncelleme yetkiniz yok.' }); }
        if (Item.postType !== 'log') {
            return res.status(400).json({ message: 'Sadece film/dizi logları güncellenebilir.' });
        }
        existingLog = Item;
        oldReviewStatus = existingLog.review !== undefined && existingLog.review !== null && existingLog.review.trim() !== "";
    } catch (getError) {
        console.error(`HATA: Log ${logId} güncellenmeden önce alınırken hata:`, getError);
        return res.status(500).json({ message: 'Log güncellenirken bir ön kontrol hatası oluştu.' });
    }

    let updateExprItems = []; let removeItems = []; let exprAttrVals = { ":uid": userId };
    let reviewStatusChanged = false;
    let newRating = existingLog.rating;
    let newReview = existingLog.review;

    if (watchedDate !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(watchedDate)) return res.status(400).json({ message: 'Geçersiz tarih formatı (YYYY-AA-GG bekleniyor).' });
        updateExprItems.push("watchedDate = :wd"); exprAttrVals[":wd"] = watchedDate;
    }
    if (rating !== undefined) {
        const numericRatingUpdate = (rating === '' || rating === null) ? null : Number(rating);
        if (numericRatingUpdate !== null && (isNaN(numericRatingUpdate) || numericRatingUpdate < 0.5 || numericRatingUpdate > 10)) return res.status(400).json({ message: 'Puan 0.5 ile 10 arasında bir sayı veya boş olmalıdır.' });
        newRating = numericRatingUpdate;
        if (numericRatingUpdate === null) removeItems.push("rating"); else { updateExprItems.push("rating = :r"); exprAttrVals[":r"] = numericRatingUpdate; }
    }
     if (review !== undefined) {
        const newHasReview = review !== null && typeof review === 'string' && review.trim() !== "";
        if (oldReviewStatus !== newHasReview) reviewStatusChanged = true;
        newReview = newHasReview ? review.trim() : null;
        if (newHasReview) { updateExprItems.push("review = :rv"); exprAttrVals[":rv"] = newReview; } else removeItems.push("review");
    }
    if (isRewatch !== undefined) {
        if (typeof isRewatch !== 'boolean') return res.status(400).json({ message: 'isRewatch değeri boolean (true/false) olmalıdır.' });
        updateExprItems.push("isRewatch = :irw"); exprAttrVals[":irw"] = isRewatch;
    }
    if (existingLog.contentType === 'tv' && seasonNumber !== undefined) {
        let numericSeasonNumber = null;
        if (seasonNumber !== null && seasonNumber !== '') {
            numericSeasonNumber = Number(seasonNumber);
            if (isNaN(numericSeasonNumber) || !Number.isInteger(numericSeasonNumber) || numericSeasonNumber < 0) return res.status(400).json({ message: 'Sezon numarası geçerli bir pozitif tam sayı veya 0 olmalıdır.' });
            updateExprItems.push("seasonNumber = :sn"); exprAttrVals[":sn"] = numericSeasonNumber;
        } else { removeItems.push("seasonNumber"); if (existingLog.episodeNumber !== undefined) removeItems.push("episodeNumber"); }
    }
    if (existingLog.contentType === 'tv' && episodeNumber !== undefined) {
        const currentOrNewSeason = (updateExprItems.includes("seasonNumber = :sn") ? exprAttrVals[":sn"] : existingLog.seasonNumber);
        const seasonBeingRemoved = removeItems.includes("seasonNumber");
        if (!seasonBeingRemoved && currentOrNewSeason !== undefined && currentOrNewSeason !== null) {
            let numericEpisodeNumber = null;
            if (episodeNumber !== null && episodeNumber !== '') {
                numericEpisodeNumber = Number(episodeNumber);
                if (isNaN(numericEpisodeNumber) || !Number.isInteger(numericEpisodeNumber) || numericEpisodeNumber < 1) return res.status(400).json({ message: 'Bölüm numarası geçerli bir pozitif tam sayı olmalıdır.' });
                 updateExprItems.push("episodeNumber = :en"); exprAttrVals[":en"] = numericEpisodeNumber;
            } else { removeItems.push("episodeNumber"); }
        } else { if (existingLog.episodeNumber !== undefined) removeItems.push("episodeNumber"); }
    }

    const newIsActivity = (newRating !== null) || (newReview !== null && newReview !== '');
    if (newIsActivity !== existingLog.isActivity || existingLog.isActivity === undefined) {
        updateExprItems.push("isActivity = :ia");
        exprAttrVals[":ia"] = newIsActivity;
        // console.log(`Bilgi: Log ${logId} için isActivity durumu ${newIsActivity} olarak güncelleniyor.`);
    }

    if (updateExprItems.length === 0 && removeItems.length === 0) {
        return res.status(400).json({ message: 'Güncellemek için geçerli bir alan gönderilmedi.' });
    }

    updateExprItems.push("updatedAt = :ts"); exprAttrVals[":ts"] = new Date().toISOString();
    removeItems = [...new Set(removeItems)];
    updateExprItems = updateExprItems.filter(item => !removeItems.some(rem => item.startsWith(rem + " =")));
    let updateExpression = "";
    if (updateExprItems.length > 0) { updateExpression += "SET " + updateExprItems.join(", "); }
    if (removeItems.length > 0) { updateExpression += (updateExpression ? " " : "") + "REMOVE " + removeItems.join(", "); }

    try {
        const updateLogCommand = new UpdateCommand({
            TableName: LOGS_TABLE, Key: { logId: logId },
            ConditionExpression: "userId = :uid",
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: exprAttrVals,
            ReturnValues: "ALL_NEW"
        });
        const { Attributes: updatedLog } = await docClient.send(updateLogCommand);

        if (reviewStatusChanged) {
           const newHasReview = review !== undefined && review !== null && typeof review === 'string' && review.trim() !== "";
            const reviewIncrement = newHasReview ? 1 : -1;
            const updateReviewCountCmd = new UpdateCommand({
                TableName: USERS_TABLE, Key: { userId: userId },
                UpdateExpression: "ADD reviewCount :inc",
                ExpressionAttributeValues: { ":inc": reviewIncrement },
                ConditionExpression: "attribute_exists(userId)" + (reviewIncrement < 0 ? " AND reviewCount > :zero" : ""),
                ...(reviewIncrement < 0 && { ExpressionAttributeValues: { ":inc": reviewIncrement, ":zero": 0 } })
            });
            try {
                await docClient.send(updateReviewCountCmd);
                await checkAndAwardAchievements(userId);
            } catch (statsError) {
                 if (statsError.name === 'ConditionalCheckFailedException') console.warn(`Uyarı: Kullanıcı ${userId} reviewCount ${reviewIncrement > 0 ? 'artırılamadı' : 'azaltılamadı'} (sayaç sınırı?).`);
                 else console.error(`HATA: Kullanıcı ${userId} reviewCount güncellenirken hata:`, statsError);
            }
        }

        res.status(200).json({ message: "Log başarıyla güncellendi.", log: updatedLog });

    } catch (error) {
        console.error(`HATA: Log ${logId} güncellenirken hata oluştu:`, error);
        if (error instanceof TypeError || (error.name && error.name.includes('ValidationException'))) return res.status(400).json({ message: 'Gönderilen verilerde format hatası olabilir.'});
        if (error.name === 'ConditionalCheckFailedException') return res.status(403).json({ message: 'Log güncellenemedi, yetki sorunu olabilir.' });
        res.status(500).json({ message: 'Log güncellenirken bir sunucu hatası oluştu.' });
    }
};
exports.updateLog = updateLog;

const deleteLog = async (req, res) => {
    // ... (kod aynı kalır, S3'den silme eklenmeli - TODO) ...
     const userId = req.user?.userId;
    const { logId } = req.params;
    if (!userId) { return res.status(401).json({ message: 'Kayıt silmek için giriş yapmalısınız.' }); }
    if (!logId) { return res.status(400).json({ message: 'Silinecek kayıt ID belirtilmelidir.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }

    let hadReview = false;
    let postType = 'log';
    let imageUrlToDelete = null; // <<< YENİ: Silinecek resim URL'si >>>

    try {
        // <<< GÜNCELLEME: imageUrl'i de al >>>
        const getCmd = new GetCommand({
            TableName: LOGS_TABLE, Key: { logId: logId },
            ProjectionExpression: "userId, review, postType, imageUrl"
        });
        const { Item } = await docClient.send(getCmd);
        if (!Item) { return res.status(404).json({ message: 'Kayıt bulunamadı.' }); }
        if (Item.userId !== userId) { return res.status(403).json({ message: 'Bu kaydı silme yetkiniz yok.' }); }
        postType = Item.postType || 'log';
        hadReview = postType === 'log' && Item.review !== undefined && Item.review !== null && Item.review.trim() !== "";
        imageUrlToDelete = Item.imageUrl; // <<< YENİ >>>

        // Kaydı DynamoDB'den sil
        const deleteLogCommand = new DeleteCommand({
            TableName: LOGS_TABLE, Key: { logId: logId },
            ConditionExpression: "userId = :uid", ExpressionAttributeValues: { ":uid": userId }
        });
        await docClient.send(deleteLogCommand);

        // İstatistikleri güncelle (sadece 'log' türü için)
        if (postType === 'log') {
            const updateExpressionParts = ["ADD logCount :dec"];
            const expressionAttributeValues = { ":dec": -1, ":zero": 0 };
            if (hadReview) updateExpressionParts.push("reviewCount :dec");
            const updateUserStatsCommand = new UpdateCommand({
                TableName: USERS_TABLE, Key: { userId: userId },
                UpdateExpression: updateExpressionParts.join(", "),
                ConditionExpression: "logCount > :zero" + (hadReview ? " AND reviewCount > :zero" : ""),
                ExpressionAttributeValues: expressionAttributeValues
            });
            try {
                await docClient.send(updateUserStatsCommand);
            } catch (statsError) {
                 if (statsError.name === 'ConditionalCheckFailedException') console.warn(`Uyarı: Kullanıcı ${userId} istatistikleri azaltılamadı (muhtemelen zaten 0).`);
                 else console.error(`HATA: Log silindikten sonra kullanıcı ${userId} istatistikleri güncellenirken hata:`, statsError);
            }
        }

        // <<< YENİ: S3'den fotoğrafı sil (arka planda, hatayı sadece logla) >>>
        if (imageUrlToDelete) {
             const { s3Client } = require('../config/awsConfig'); // S3 istemcisini al
             const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
             const bucketName = process.env.S3_POST_IMAGES_BUCKET || 'monologed-post-images'; // Bucket adını al
             // URL'den dosya anahtarını çıkar (örn: https://bucket.s3.region.amazonaws.com/posts/userid/uuid.jpg -> posts/userid/uuid.jpg)
             try {
                 const url = new URL(imageUrlToDelete);
                 const key = url.pathname.substring(1); // Başındaki '/' karakterini kaldır
                 if (key) {
                     const deleteParams = { Bucket: bucketName, Key: key };
                     console.log(`Bilgi: S3'den fotoğraf siliniyor: Bucket=${bucketName}, Key=${key}`);
                     s3Client.send(new DeleteObjectCommand(deleteParams))
                         .then(() => console.log(`Bilgi: S3 fotoğrafı başarıyla silindi: ${key}`))
                         .catch(s3Err => console.error(`HATA: S3 fotoğrafı silinirken hata oluştu (Key: ${key}):`, s3Err));
                 } else {
                      console.warn(`Uyarı: Geçersiz imageUrl formatı, S3'den silinemedi: ${imageUrlToDelete}`);
                 }
             } catch (urlError) {
                  console.warn(`Uyarı: Geçersiz imageUrl formatı, S3'den silinemedi: ${imageUrlToDelete}`, urlError);
             }
        }
        // <<< YENİ SONU >>>

        // TODO: İlişkili beğenileri ve yorumları da silmek gerekir!

        res.status(200).json({ message: "Kayıt başarıyla silindi." });

    } catch (error) {
         if (error.name === 'ConditionalCheckFailedException') return res.status(404).json({ message: 'Kayıt bulunamadı veya bu kaydı silme yetkiniz yok.' });
        console.error(`HATA: Kayıt ${logId} silinirken hata oluştu:`, error);
        res.status(500).json({ message: 'Kayıt silinirken bir sunucu hatası oluştu.' });
    }
};
exports.deleteLog = deleteLog;

const getUserLogs = async (req, res) => {
    // ... (kod aynı kalır) ...
     const userId = req.user?.userId;
    const { contentId, contentType } = req.query;
    if (!userId) { return res.status(401).json({ message: 'Logları görmek için giriş yapmalısınız.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }

    const queryParams = {
        TableName: LOGS_TABLE,
        IndexName: USER_LOGS_INDEX,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
        ScanIndexForward: false
    };

    const filterExpressions = [];
    if (contentId && contentType) {
        const numericContentId = Number(contentId);
        if (!isNaN(numericContentId) && (contentType === 'movie' || contentType === 'tv')) {
            filterExpressions.push("contentId = :cid");
            filterExpressions.push("contentType = :ctype");
            queryParams.ExpressionAttributeValues[":cid"] = numericContentId;
            queryParams.ExpressionAttributeValues[":ctype"] = contentType;
        } else {
            console.warn(`Uyarı: getUserLogs - Geçersiz contentId veya contentType query parametreleri alındı, filtre uygulanmıyor.`);
        }
    }

    if (filterExpressions.length > 0) {
        queryParams.FilterExpression = filterExpressions.join(" AND ");
    }

    try {
        // console.log(`Bilgi: Kullanıcı ${userId} için TÜM loglar/postlar sorgulanıyor (Filtre: ${queryParams.FilterExpression || 'Yok'})...`);
        const { Items } = await docClient.send(new QueryCommand(queryParams));
        // console.log(`Bilgi: Kullanıcı ${userId} için ${Items ? Items.length : 0} kayıt bulundu.`);
        res.status(200).json({ logs: Items || [] });
    } catch (error) {
        console.error(`HATA: Kullanıcı ${userId} için kayıtlar getirilirken hata oluştu:`, error);
        res.status(500).json({ message: 'Kayıtlar getirilirken bir sunucu hatası oluştu.' });
    }
};
exports.getUserLogs = getUserLogs;

const getLogForItem = async (req, res) => {
    // ... (kod aynı kalır) ...
     const { contentType, contentId } = req.params; const { season } = req.query; const userId = req.user?.userId;
    if (!userId) { return res.status(401).json({ message: 'Bu işlem için giriş yapmalısınız.' }); }
    if (!contentId || isNaN(Number(contentId))) { return res.status(400).json({ message: 'Geçerli bir içerik ID\'si (contentId) belirtilmelidir.' }); }
    if (!contentType || (contentType !== 'movie' && contentType !== 'tv')) { return res.status(400).json({ message: 'İçerik tipi (contentType) "movie" veya "tv" olmalıdır.' }); }
    if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }
    const numericContentId = Number(contentId); let targetSeasonNumber = undefined;
    if (contentType === 'tv') {
        if (season !== undefined && season !== null && season !== 'all' && season !== '') {
            const seasonNum = parseInt(season, 10);
            if (!isNaN(seasonNum) && seasonNum >= 0) targetSeasonNumber = seasonNum; else return res.status(400).json({ message: 'Geçersiz sezon numarası formatı.' });
        } else if (season === 'all' || season === '' || season === null) targetSeasonNumber = null;
        if (season === undefined) targetSeasonNumber = null;
    } else targetSeasonNumber = null;
    const params = {
        TableName: LOGS_TABLE, IndexName: USER_LOGS_INDEX, KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId, ":cid": numericContentId, ":ctype": contentType }, ScanIndexForward: false, Limit: 50
    };
    let filterExpressions = ["contentId = :cid", "contentType = :ctype", "postType = :ptype"];
    params.ExpressionAttributeValues[":ptype"] = 'log';

    if (targetSeasonNumber === null) filterExpressions.push("attribute_not_exists(seasonNumber)");
    else if (targetSeasonNumber !== undefined) { filterExpressions.push("seasonNumber = :sNum"); params.ExpressionAttributeValues[":sNum"] = targetSeasonNumber; }
    params.FilterExpression = filterExpressions.join(" AND ");
    try {
        const { Items } = await docClient.send(new QueryCommand(params));
        if (Items && Items.length > 0) res.status(200).json({ log: Items[0] }); else res.status(200).json({ log: null });
    } catch (error) { console.error(`HATA: İçeriğe ait log getirilirken hata (UserId: ${userId}, Content: ${contentType}/${numericContentId}, Season: ${season}):`, error); res.status(500).json({ message: 'Log bilgisi getirilirken bir sunucu hatası oluştu.' }); }
};
exports.getLogForItem = getLogForItem;

const getLogsForUser = async (req, res) => {
    // ... (kod aynı kalır) ...
      const { userId } = req.params;
     if (!userId) { return res.status(400).json({ message: 'Kullanıcı ID\'si belirtilmelidir.' }); }
     if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }
    try {
        const queryCommand = new QueryCommand({
            TableName: LOGS_TABLE,
            IndexName: USER_LOGS_INDEX,
            KeyConditionExpression: "userId = :uid",
            FilterExpression: "isActivity = :trueVal",
            ExpressionAttributeValues: {
                ":uid": userId,
                ":trueVal": true
            },
            ScanIndexForward: false
        });
        // console.log(`Bilgi: Kullanıcı ${userId} için public kayıtlar (sadece aktiviteler) sorgulanıyor...`);
        const { Items } = await docClient.send(queryCommand);
        // console.log(`Bilgi: Kullanıcı ${userId} için ${Items ? Items.length : 0} aktivite kaydı bulundu.`);
        res.status(200).json({ logs: Items || [] });
    }
    catch (error) {
        console.error(`HATA: Kullanıcı ${userId} için public kayıtlar getirilirken hata:`, error);
        res.status(500).json({ message: 'Kullanıcı kayıtları getirilirken bir sunucu hatası oluştu.' });
    }
};
exports.getLogsForUser = getLogsForUser;

const getPublicLogsForContent = async (req, res) => {
    // ... (kod aynı kalır) ...
     const { contentType, contentId } = req.params; const limit = parseInt(req.query.limit) || 10;
    if (!contentId || isNaN(Number(contentId))) { return res.status(400).json({ message: 'Geçerli bir içerik ID\'si (contentId) belirtilmelidir.' }); }
    if (!contentType || (contentType !== 'movie' && contentType !== 'tv')) { return res.status(400).json({ message: 'İçerik tipi (contentType) "movie" veya "tv" olmalıdır.' }); }
    if (!docClient || !ddbClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }
    const numericContentId = Number(contentId);
    const logQueryParams = {
        TableName: LOGS_TABLE,
        IndexName: CONTENT_LOGS_INDEX,
        KeyConditionExpression: "contentId = :cid",
        FilterExpression: "contentType = :ctype AND isActivity = :trueVal",
        ExpressionAttributeValues: {
            ":cid": numericContentId,
            ":ctype": contentType,
            ":trueVal": true
        },
        ScanIndexForward: false,
        Limit: limit
    };
    try {
        // console.log(`Bilgi: İçerik ${contentType}/${numericContentId} için public kayıtlar (sadece aktiviteler) sorgulanıyor...`);
        const { Items: recentLogs } = await docClient.send(new QueryCommand(logQueryParams));
        if (!recentLogs || recentLogs.length === 0) {
            // console.log(`Bilgi: İçerik ${contentType}/${numericContentId} için aktivite kaydı bulunamadı.`);
            return res.status(200).json({ logs: [] });
        }
        const userIds = [...new Set(recentLogs.map(log => log.userId).filter(id => !!id))]; let userInfoMap = {};
        if (userIds.length > 0) {
            const userKeys = userIds.map(id => marshall({ userId: id }));
            const batchGetParams = { RequestItems: { [USERS_TABLE]: { Keys: userKeys, ProjectionExpression: "userId, username, avatarUrl, isVerified" } } };
            try {
                 const batchData = await ddbClient.send(new BatchGetItemCommand(batchGetParams));
                 if (batchData.Responses && batchData.Responses[USERS_TABLE]) { batchData.Responses[USERS_TABLE].forEach(marshalledItem => { const user = unmarshall(marshalledItem); userInfoMap[user.userId] = { username: user.username, avatarUrl: user.avatarUrl, isVerified: user.isVerified ?? false }; }); }
                 if (batchData.UnprocessedKeys && batchData.UnprocessedKeys[USERS_TABLE]?.Keys?.length > 0) console.warn(`Uyarı: ${batchData.UnprocessedKeys[USERS_TABLE].Keys.length} kullanıcının bilgisi BatchGet ile alınamadı (Son Aktiviteler).`);
             } catch (batchError) { console.error(`HATA: BatchGetItemCommand sırasında hata oluştu (Son Aktiviteler):`, batchError); }
        }
        const logsWithUserInfo = recentLogs.map(log => ({ ...log, userInfo: userInfoMap[log.userId] || { username: 'Bilinmeyen Kullanıcı', avatarUrl: null, isVerified: false } }));
        // console.log(`Bilgi: İçerik ${contentType}/${numericContentId} için ${logsWithUserInfo.length} aktivite kaydı bulundu.`);
        res.status(200).json({ logs: logsWithUserInfo });
    } catch (error) { console.error(`HATA: İçerik kayıtları getirilirken hata (Content: ${contentType}/${numericContentId}):`, error); res.status(500).json({ message: 'İçerik aktiviteleri getirilirken bir sunucu hatası oluştu.' }); }
};
exports.getPublicLogsForContent = getPublicLogsForContent;

// --- Beğeni Fonksiyonları (likeLog, unlikeLog, getLikeCountForLog, checkLikeStatus) ---
const likeLog = async (req, res) => {
    // ... (kod aynı kalır) ...
     const likerUserId = req.user?.userId; const likerUsername = req.user?.username; const { logId } = req.params;
    if (!likerUserId || !likerUsername) { return res.status(401).json({ message: 'Beğeni yapmak için giriş yapmalısınız.' }); } if (!logId) { return res.status(400).json({ message: 'Beğenilecek kayıt ID\'si belirtilmelidir.' }); } if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }
    const likeId = `${likerUserId}#${logId}`; const timestamp = new Date().toISOString(); const newLikeItem = { likeId, userId: likerUserId, logId, createdAt: timestamp }; let logOwnerUserId = null;
    try {
        const { Item: logItem } = await docClient.send(new GetCommand({ TableName: LOGS_TABLE, Key: { logId: logId }, ProjectionExpression: "userId" }));
        if (!logItem) { return res.status(404).json({ message: 'Beğenilecek kayıt bulunamadı.' }); }
        logOwnerUserId = logItem.userId;

        await docClient.send(new PutCommand({ TableName: LIKES_TABLE, Item: newLikeItem, ConditionExpression: "attribute_not_exists(likeId)" }));

        const { Attributes } = await docClient.send(new UpdateCommand({ TableName: LOGS_TABLE, Key: { logId: logId }, UpdateExpression: "ADD likeCount :inc", ExpressionAttributeValues: { ":inc": 1 }, ConditionExpression: "attribute_exists(logId)", ReturnValues: "UPDATED_NEW" }));
        const newLikeCount = Attributes?.likeCount;

        if (logOwnerUserId && logOwnerUserId !== likerUserId) {
            const notificationId = uuidv4(); const notificationTimestamp = new Date().toISOString(); const newNotificationItem = { userId: logOwnerUserId, createdAt: notificationTimestamp, notificationId: notificationId, type: 'NEW_LIKE', actorUserId: likerUserId, actorUsername: likerUsername, isRead: false, entityType: 'log', entityId: logId }; // entityType şimdilik 'log' kalsın
            try { await docClient.send(new PutCommand({ TableName: NOTIFICATIONS_TABLE, Item: newNotificationItem })); } catch (notificationError) { console.error(`HATA: Yeni beğeni bildirimi oluşturulamadı:`, notificationError); }
        }
        res.status(201).json({ message: 'Kayıt beğenildi.', likeCount: newLikeCount });
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            try {
                const checkLike = await docClient.send(new GetCommand({ TableName: LIKES_TABLE, Key: { likeId } }));
                if (checkLike.Item) {
                    const countResult = await getLikeCountInternal(logId);
                    return res.status(200).json({ message: 'Kayıt zaten beğenilmiş.', likeCount: countResult });
                } else {
                    return res.status(404).json({ message: 'Beğenilecek kayıt bulunamadı.' });
                }
            } catch (checkError) {
                return res.status(500).json({ message: 'Kayıt beğenilirken bir hata oluştu.' });
            }
        }
        console.error(`HATA: Kayıt ${logId} beğenilirken genel hata:`, error);
        res.status(500).json({ message: 'Kayıt beğenilirken bir sunucu hatası oluştu.' });
    }
};
exports.likeLog = likeLog;

const unlikeLog = async (req, res) => {
    // ... (kod aynı kalır) ...
     const userId = req.user?.userId; const { logId } = req.params;
    if (!userId) { return res.status(401).json({ message: 'Beğeniyi geri almak için giriş yapmalısınız.' }); } if (!logId) { return res.status(400).json({ message: 'Beğenisi geri alınacak kayıt ID\'si belirtilmelidir.' }); } if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); }
    const likeId = `${userId}#${logId}`;
    try {
        await docClient.send(new DeleteCommand({ TableName: LIKES_TABLE, Key: { likeId: likeId }, ConditionExpression: "attribute_exists(likeId)" }));

        const { Attributes } = await docClient.send(new UpdateCommand({ TableName: LOGS_TABLE, Key: { logId: logId }, UpdateExpression: "SET likeCount = likeCount - :dec", ConditionExpression: "attribute_exists(logId) AND likeCount > :zero", ExpressionAttributeValues: { ":dec": 1, ":zero": 0 }, ReturnValues: "UPDATED_NEW" }));
        const newLikeCount = Attributes?.likeCount;
        res.status(200).json({ message: 'Kayıt beğenisi geri alındı.', likeCount: newLikeCount });
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            try {
                const checkLike = await docClient.send(new GetCommand({ TableName: LIKES_TABLE, Key: { likeId } }));
                if (!checkLike.Item) {
                    const countResult = await getLikeCountInternal(logId);
                    return res.status(404).json({ message: 'Kayıt zaten beğenilmemiş.', likeCount: countResult });
                } else {
                    const currentCount = await getLikeCountInternal(logId);
                    return res.status(200).json({ message: 'Beğeni geri alındı.', likeCount: currentCount });
                }
            } catch(checkError) {
                return res.status(500).json({ message: 'Beğeni geri alınırken bir hata oluştu.' });
            }
        }
        console.error(`HATA: Kayıt ${logId} beğenisi geri alınırken genel hata:`, error);
        res.status(500).json({ message: 'Kayıt beğenisi geri alınırken bir sunucu hatası oluştu.' });
    }
};
exports.unlikeLog = unlikeLog;

async function getLikeCountInternal(logId) { if (!logId || !docClient) return 0; try { const { Item } = await docClient.send(new GetCommand({ TableName: LOGS_TABLE, Key: { logId: logId }, ProjectionExpression: "likeCount" })); return Item?.likeCount ?? 0; } catch (error) { console.error(`Internal Hata: Kayıt ${logId} beğeni sayısı alınırken hata:`, error); return 0; } }
const getLikeCountForLog = async (req, res) => { const { logId } = req.params; if (!logId) { return res.status(400).json({ message: 'Kayıt ID\'si belirtilmelidir.' }); } if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); } try { const likeCount = await getLikeCountInternal(logId); res.status(200).json({ logId: logId, likeCount: likeCount }); } catch (error) { res.status(500).json({ message: 'Beğeni sayısı getirilirken bir hata oluştu.' }); } };
exports.getLikeCountForLog = getLikeCountForLog;

const checkLikeStatus = async (req, res) => { const userId = req.user?.userId; const { logId } = req.params; if (!userId) { return res.status(200).json({ isLiked: false }); } if (!logId) { return res.status(400).json({ message: 'Kayıt ID\'si belirtilmelidir.' }); } if (!docClient) { return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' }); } const likeId = `${userId}#${logId}`; const params = { TableName: LIKES_TABLE, Key: { likeId: likeId } }; try { const { Item } = await docClient.send(new GetCommand(params)); res.status(200).json({ isLiked: !!Item }); } catch (error) { console.error(`HATA: Beğeni durumu kontrol edilirken hata (LogId: ${logId}, UserId: ${userId}):`, error); res.status(500).json({ message: 'Beğeni durumu kontrol edilirken bir hata oluştu.' }); } };
exports.checkLikeStatus = checkLikeStatus;

const getLogById = async (req, res) => {
    const { logId } = req.params;
    if (!logId) {
        return res.status(400).json({ message: 'Log ID\'si belirtilmelidir.' });
    }
    if (!docClient) {
        return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    }

    try {
        const params = {
            TableName: LOGS_TABLE,
            Key: { logId }
        };

        const { Item: log } = await docClient.send(new GetCommand(params));
        
        if (!log) {
            return res.status(404).json({ message: 'Log bulunamadı.' });
        }

        // Kullanıcı bilgilerini al
        const userParams = {
            TableName: USERS_TABLE,
            Key: { userId: log.userId },
            ProjectionExpression: "userId, username, avatarUrl, isVerified"
        };

        const { Item: userInfo } = await docClient.send(new GetCommand(userParams));
        
        if (userInfo) {
            log.userInfo = {
                username: userInfo.username,
                avatarUrl: userInfo.avatarUrl,
                isVerified: userInfo.isVerified ?? false
            };
        }

        res.status(200).json({ log });
    } catch (error) {
        console.error(`HATA: Log detayı getirilirken hata (LogId: ${logId}):`, error);
        res.status(500).json({ message: 'Log detayı getirilirken bir sunucu hatası oluştu.' });
    }
};

exports.getLogById = getLogById;

// --- Dışa Aktarma ---
module.exports = {
    createLog,
    updateLog,
    deleteLog,
    getUserLogs,
    getLogForItem,
    getLogsForUser,
    getPublicLogsForContent,
    likeLog,
    unlikeLog,
    getLikeCountForLog,
    checkLikeStatus,
    getLogById
};
