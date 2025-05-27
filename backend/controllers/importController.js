// backend/controllers/importController.js
const axios = require('axios');
const { PutCommand, UpdateCommand, QueryCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require('../config/awsConfig');
const { checkAndAwardAchievements } = require('../services/achievementService');
const crypto = require('crypto');

const LOGS_TABLE = "Logs";
const USERS_TABLE = "Users";
const WATCHLIST_TABLE = 'Watchlist';
const USER_WATCHLIST_INDEX = 'UserWatchlistIndex';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

// --- Helper Function: Find TMDB ID by Title/Year (Fallback) ---
async function findTmdbIdByTitleYear(title, year, type) {
    console.log(`[findTmdbIdByTitleYear] Fallback Search: "${title}" (${year || 'N/A'}), Type: ${type}`);
    if (!API_KEY || !title || !type) {
        console.error("[findTmdbIdByTitleYear] Error: Missing API Key, title, or type.");
        return null;
    }
    const searchType = type === 'movie' ? 'movie' : 'tv';
    const searchYear = year ? Number(year) : null;

    try {
        const response = await axios.get(`${TMDB_BASE_URL}/search/${searchType}`, {
            params: {
                api_key: API_KEY,
                query: title,
                language: 'tr-TR', // Search in Turkish first, might help sometimes
                ...(searchYear && type === 'movie' && { primary_release_year: searchYear }),
                ...(searchYear && type === 'tv' && { first_air_date_year: searchYear }),
                include_adult: false,
                page: 1
            }
        });

        const results = response.data.results;
        console.log(`[findTmdbIdByTitleYear] TMDB API returned ${results?.length || 0} results for title/year search.`);
        if (!results || results.length === 0) return null;

        // Simple matching: take the first result
        const foundId = results[0].id;
        console.log(`[findTmdbIdByTitleYear] Found TMDB ID (fallback): ${foundId}`);
        return foundId;

    } catch (error) {
        console.error(`[findTmdbIdByTitleYear] TMDB Search Error (${searchType}: "${title}", Year: ${year}):`, error.response?.data || error.message);
        return null;
    }
}

// --- Helper Function: Find TMDB ID by IMDb ID ---
async function findTmdbIdByImdbId(imdbId) {
    console.log(`[findTmdbIdByImdbId] Searching using IMDb ID: ${imdbId}`);
    if (!API_KEY || !imdbId || !imdbId.startsWith('tt')) {
        console.error("[findTmdbIdByImdbId] Error: Missing API Key or invalid IMDb ID format.");
        return null;
    }
    try {
        const response = await axios.get(`${TMDB_BASE_URL}/find/${imdbId}`, {
            params: {
                api_key: API_KEY,
                external_source: 'imdb_id'
            }
        });

        // /find endpoint returns results in arrays like movie_results, tv_results etc.
        const movieResults = response.data.movie_results || [];
        const tvResults = response.data.tv_results || [];

        if (movieResults.length > 0) {
            console.log(`[findTmdbIdByImdbId] Found Movie TMDB ID: ${movieResults[0].id}`);
            return { id: movieResults[0].id, type: 'movie' };
        } else if (tvResults.length > 0) {
            console.log(`[findTmdbIdByImdbId] Found TV TMDB ID: ${tvResults[0].id}`);
            return { id: tvResults[0].id, type: 'tv' };
        } else {
            console.log(`[findTmdbIdByImdbId] No TMDB entry found for IMDb ID: ${imdbId}`);
            return null;
        }
    } catch (error) {
        console.error(`[findTmdbIdByImdbId] TMDB Find Error (IMDb ID: ${imdbId}):`, error.response?.data || error.message);
        return null;
    }
}


// --- Helper Function: Fetch Content Details (Runtime, Genres) ---
async function fetchContentDetailsForImport(contentType, contentId) {
    console.log(`[fetchContentDetails] Fetching details for ${contentType}/${contentId}`);
    if (!API_KEY || !contentType || !contentId) {
        console.warn(`[fetchContentDetails] Missing params or API Key.`);
        return { runtimeMinutes: null, genreIds: null };
    }
    const detailUrl = `${TMDB_BASE_URL}/${contentType}/${contentId}`;
    try {
        // Fetch details with Turkish language preference
        const response = await axios.get(detailUrl, {
            params: { api_key: API_KEY, language: 'tr-TR' }
        });
        const data = response.data;
        let runtimeMinutes = null;
        // Extract genre IDs
        const genreIds = data.genres ? data.genres.map(g => g.id) : null;

        // Extract runtime based on content type
        if (contentType === 'movie' && data.runtime) {
            runtimeMinutes = Number(data.runtime);
        } else if (contentType === 'tv' && data.episode_run_time && data.episode_run_time.length > 0) {
            // Use average episode runtime for TV shows for simplicity in import
            runtimeMinutes = Number(data.episode_run_time[0]);
        }

        // Ensure runtime is a valid positive number
        if (isNaN(runtimeMinutes) || runtimeMinutes <= 0) runtimeMinutes = null;

        console.log(`[fetchContentDetails] Details fetched for ${contentType}/${contentId}: Runtime=${runtimeMinutes}, Genres=${genreIds?.join(',')}`);
        return { runtimeMinutes, genreIds };
    } catch (error) {
        console.error(`[fetchContentDetails] TMDB Detail Error (${detailUrl}):`, error.response?.data?.status_message || error.message);
        // Return nulls on error
        return { runtimeMinutes: null, genreIds: null };
    }
}


// --- Main Import Function ---
exports.importLetterboxdData = async (req, res) => {
    const userId = req.user?.userId;
    // Destructure type and data from request body
    const { type, data } = req.body;

    // --- Input Validation ---
    if (!userId) {
        return res.status(401).json({ message: 'Yetkisiz işlem.' });
    }
    // Validate import type
    if (!type || !['diary', 'ratings', 'watchlist', 'watched'].includes(type)) {
        return res.status(400).json({ message: 'Geçersiz veri türü (diary, ratings, watchlist veya watched bekleniyor).' });
    }
    // Validate data array
    if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: 'İçe aktarılacak veri bulunamadı.' });
    }
    // Check if DynamoDB client is configured
    if (!docClient) {
        console.error("[importLetterboxdData] FATAL: docClient is not initialized.");
        return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    }

    console.log(`[importLetterboxdData] User ${userId} starting import for type "${type}", ${data.length} items.`);

    // Initialize counters and error tracking
    let processedCount = 0;
    let errorCount = 0;
    const errors = [];
    // Initialize counters for user stats updates
    const userStatsUpdates = { logCount: 0, reviewCount: 0, watchlistCount: 0 };

    // --- Process each item in the data array ---
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        console.log(`[importLetterboxdData] Processing item ${i + 1}/${data.length}:`, item);

        // Extract relevant data from the Letterboxd CSV item
        const letterboxdTitle = item['Name'];
        const letterboxdYear = item['Year'];
        const letterboxdRating = item['Rating']; // Present in diary, ratings
        const letterboxdWatchedDate = item['Watched Date']; // Present in diary
        const letterboxdDiaryDate = item['Diary Date']; // Fallback date in diary
        const letterboxdRewatch = item['Rewatch'] === 'Yes'; // Present in diary
        const letterboxdReview = item['Review']; // Present in diary
        const letterboxdListDate = item['Date']; // Date added in watchlist, watched
        const letterboxdTmdbId = item['TMDb ID']; // Potential TMDb ID
        const letterboxdImdbId = item['IMDb ID']; // Potential IMDb ID

        // Skip item if title is missing
        if (!letterboxdTitle) {
            console.warn(`[importLetterboxdData] Skipping item ${i + 1}: Missing title.`);
            errorCount++; errors.push({ index: i, item: item, reason: "Başlık eksik" }); continue;
        }

        let tmdbId = null;
        let contentType = null; // Will be determined ('movie' or 'tv')

        // --- Find TMDB ID (Priority: TMDb ID > IMDb ID > Title/Year) ---
        // 1. Check for TMDb ID in CSV
        if (letterboxdTmdbId && !isNaN(Number(letterboxdTmdbId))) {
            tmdbId = Number(letterboxdTmdbId);
            // Assume movie type for now, as Letterboxd is primarily movie-focused.
            // A more robust solution might involve querying TMDB to confirm the type.
            contentType = 'movie';
            console.log(`[importLetterboxdData] Item ${i + 1}: Using TMDb ID from CSV: ${tmdbId} (Assuming type: ${contentType})`);
        }
        // 2. If no TMDb ID, check for IMDb ID
        else if (letterboxdImdbId && letterboxdImdbId.startsWith('tt')) {
            const findResult = await findTmdbIdByImdbId(letterboxdImdbId);
            if (findResult) {
                tmdbId = findResult.id;
                contentType = findResult.type; // Get type from IMDb search result
                console.log(`[importLetterboxdData] Item ${i + 1}: Found TMDB ID ${tmdbId} (Type: ${contentType}) using IMDb ID ${letterboxdImdbId}`);
            }
        }

        // 3. If still no ID, fall back to searching by title and year
        if (!tmdbId) {
            console.log(`[importLetterboxdData] Item ${i + 1}: No usable ID found in CSV, falling back to title/year search...`);
            contentType = 'movie'; // Assume movie for fallback search
            tmdbId = await findTmdbIdByTitleYear(letterboxdTitle, letterboxdYear, contentType);
        }

        // If no TMDB ID could be found after all attempts, skip the item
        if (!tmdbId || !contentType) {
            console.warn(`[importLetterboxdData] Skipping item ${i + 1}: Could not find TMDB ID for "${letterboxdTitle}" (${letterboxdYear || 'N/A'}) after all attempts.`);
            errorCount++; errors.push({ index: i, item: item, reason: "TMDB ID bulunamadı" }); continue;
        }
        console.log(`[importLetterboxdData] Item ${i + 1}: Final TMDB ID: ${tmdbId}, Content Type: ${contentType}`);

        // --- Process item based on the import type ---
        try {
            // --- Handle 'diary' or 'ratings' types (Create Log) ---
            if (type === 'diary' || type === 'ratings') {
                const watchedDate = letterboxdWatchedDate || letterboxdDiaryDate; // Prefer 'Watched Date'
                // Convert Letterboxd 0.5-5 rating to 1-10 scale
                const rating = letterboxdRating ? parseFloat(letterboxdRating) * 2 : null;
                const review = letterboxdReview || null;
                const isRewatch = letterboxdRewatch || false;

                // Watched date is required for logs
                if (!watchedDate) {
                    console.warn(`[importLetterboxdData] Skipping item ${i + 1} (type ${type}): Missing watched date for "${letterboxdTitle}" (TMDB ID: ${tmdbId})`);
                    errorCount++; errors.push({ index: i, item: item, reason: "İzleme tarihi eksik" }); continue;
                }

                // Fetch runtime and genres from TMDB
                const { runtimeMinutes, genreIds } = await fetchContentDetailsForImport(contentType, tmdbId);

                // Construct the log item for DynamoDB
                const logItem = {
                    logId: crypto.randomUUID(), // Generate unique log ID
                    userId: userId,
                    contentId: tmdbId,
                    contentType: contentType,
                    watchedDate: watchedDate,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    likeCount: 0, // Initialize like count
                    isRewatch: isRewatch,
                    // Conditionally add rating if valid
                    ...(rating && rating >= 0.5 && rating <= 10 && { rating: rating }),
                    // Conditionally add review if present
                    ...(review && { review: review.trim() }),
                    // Conditionally add runtime if available
                    ...(runtimeMinutes && { runtimeMinutes: runtimeMinutes }),
                    // Conditionally add genres if available
                    ...(genreIds && genreIds.length > 0 && { genreIds: genreIds }),
                    importedFrom: 'letterboxd', // Mark the import source
                    importType: type // Mark the specific file type
                };

                console.log(`[importLetterboxdData] Item ${i + 1}: Preparing to put log item:`, logItem);
                // TODO: Implement logic to check for existing logs if needed (e.g., based on user, content, and date)
                // For now, we directly add the log.
                await docClient.send(new PutCommand({ TableName: LOGS_TABLE, Item: logItem }));
                console.log(`[importLetterboxdData] Item ${i + 1}: Log item successfully put.`);
                // Increment stats counters
                userStatsUpdates.logCount++;
                if (review) userStatsUpdates.reviewCount++;

            // --- Handle 'watched' type (Create Simple Log) ---
            } else if (type === 'watched') {
                // Create a basic log entry indicating the item was watched
                const { runtimeMinutes, genreIds } = await fetchContentDetailsForImport(contentType, tmdbId);
                // Use the import date as the watched date since watched.csv doesn't have it
                const importDate = new Date().toISOString().split('T')[0];

                const logItem = {
                    logId: crypto.randomUUID(), userId: userId, contentId: tmdbId, contentType: contentType,
                    watchedDate: importDate, // Use today's date
                    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                    likeCount: 0, isRewatch: false, // No rewatch info in watched.csv
                    // No rating or review for 'watched' import
                    ...(runtimeMinutes && { runtimeMinutes: runtimeMinutes }),
                    ...(genreIds && genreIds.length > 0 && { genreIds: genreIds }),
                    importedFrom: 'letterboxd', importType: type,
                    importedAsWatched: true // Flag indicating it was just marked watched
                };

                // TODO: Check if a more detailed log already exists for this item and user.
                // If so, maybe skip adding this basic 'watched' log.
                console.log(`[importLetterboxdData] Item ${i + 1}: Preparing to put 'watched' log item:`, logItem);
                await docClient.send(new PutCommand({ TableName: LOGS_TABLE, Item: logItem }));
                console.log(`[importLetterboxdData] Item ${i + 1}: 'Watched' log item successfully put.`);
                userStatsUpdates.logCount++; // Increment log count

            // --- Handle 'watchlist' type (Add to Watchlist) ---
            } else if (type === 'watchlist') {
                console.log(`[importLetterboxdData] Item ${i + 1}: Checking watchlist status for ${contentType}/${tmdbId}`);
                // Check if the item is already in the user's watchlist using the GSI
                const checkParams = {
                    TableName: WATCHLIST_TABLE,
                    IndexName: USER_WATCHLIST_INDEX, // Ensure this GSI exists and is configured correctly
                    KeyConditionExpression: "userId = :uid",
                    FilterExpression: "contentId = :cid AND contentType = :ctype",
                    ExpressionAttributeValues: { ":uid": userId, ":cid": tmdbId, ":ctype": contentType },
                    ProjectionExpression: "itemId" // Only need to know if it exists
                };
                const { Items: existingItems } = await docClient.send(new QueryCommand(checkParams));

                // If not already in watchlist, add it
                if (!existingItems || existingItems.length === 0) {
                    const watchlistItem = {
                        itemId: crypto.randomUUID(), // Unique ID for the watchlist item
                        userId: userId,
                        contentId: tmdbId,
                        contentType: contentType,
                        // Use current date for addedAt, as 'Date' in watchlist.csv is the movie release date
                        addedAt: new Date().toISOString(),
                        importedFrom: 'letterboxd',
                        importType: type
                    };
                    console.log(`[importLetterboxdData] Item ${i + 1}: Preparing to put watchlist item:`, watchlistItem);
                    await docClient.send(new PutCommand({ TableName: WATCHLIST_TABLE, Item: watchlistItem }));
                    console.log(`[importLetterboxdData] Item ${i + 1}: Watchlist item successfully put.`);
                    userStatsUpdates.watchlistCount++; // Increment watchlist count
                } else {
                    console.log(`[importLetterboxdData] Item ${i + 1}: Already in watchlist: ${contentType}/${tmdbId}`);
                }
            }
            processedCount++; // Increment successfully processed count
        } catch (dbError) {
            // Log database errors during item processing
            console.error(`[importLetterboxdData] ERROR processing item ${i + 1} (Item: ${letterboxdTitle}, TMDB ID: ${tmdbId}):`, dbError);
            errorCount++; errors.push({ index: i, item: item, reason: `Veritabanı hatası: ${dbError.message}` });
        }
    } // End of loop

    // --- Update User Statistics in Batch ---
    if (userStatsUpdates.logCount > 0 || userStatsUpdates.reviewCount > 0 || userStatsUpdates.watchlistCount > 0) {
        const updateExpressionParts = [];
        const expressionAttributeValues = { ":zero": 0 }; // For if_not_exists

        // Build the SET expression parts and values
        if (userStatsUpdates.logCount > 0) {
            updateExpressionParts.push("logCount = if_not_exists(logCount, :zero) + :logInc");
            expressionAttributeValues[":logInc"] = userStatsUpdates.logCount;
        }
        if (userStatsUpdates.reviewCount > 0) {
            updateExpressionParts.push("reviewCount = if_not_exists(reviewCount, :zero) + :reviewInc");
            expressionAttributeValues[":reviewInc"] = userStatsUpdates.reviewCount;
        }
        if (userStatsUpdates.watchlistCount > 0) {
            updateExpressionParts.push("watchlistCount = if_not_exists(watchlistCount, :zero) + :watchInc");
            expressionAttributeValues[":watchInc"] = userStatsUpdates.watchlistCount;
        }

        // Only proceed if there are parts to update
        if (updateExpressionParts.length > 0) {
            const updateUserStatsCommand = new UpdateCommand({
                TableName: USERS_TABLE,
                Key: { userId: userId },
                UpdateExpression: `SET ${updateExpressionParts.join(", ")}`, // Use SET instead of ADD for if_not_exists
                ExpressionAttributeValues: expressionAttributeValues
            });
            try {
                await docClient.send(updateUserStatsCommand);
                console.log(`[importLetterboxdData] User ${userId} stats updated:`, userStatsUpdates);
                // Check for achievements after stats update
                await checkAndAwardAchievements(userId);
            } catch (statsError) {
                console.error(`[importLetterboxdData] ERROR updating user stats for ${userId}:`, statsError);
            }
        }
    }

    // --- Final Response ---
    console.log(`[importLetterboxdData] Import finished for user ${userId}, type "${type}". Processed: ${processedCount}, Errors: ${errorCount}`);
    let responseMessage = `${processedCount} öğe başarıyla işlendi.`;
    if (errorCount > 0) {
        responseMessage += ` ${errorCount} öğe işlenirken hata oluştu.`;
        // Optionally log detailed errors here or return them if needed for UI
        // console.error("[importLetterboxdData] Detailed errors:", errors);
    }

    res.status(200).json({
        message: responseMessage,
        processedCount: processedCount,
        errorCount: errorCount
        // errors: errors // Optionally return detailed errors
    });
};
