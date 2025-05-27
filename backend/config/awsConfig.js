// config/awsConfig.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { S3Client } = require("@aws-sdk/client-s3"); // S3Client import edildi
require('dotenv').config();

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// İstemcileri başlangıçta null olarak tanımla
let ddbClient = null;
let docClient = null;
let s3Client = null; // s3Client eklendi

if (!region || !accessKeyId || !secretAccessKey) {
    console.error("HATA: AWS erişim bilgileri (.env dosyasında AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) eksik veya yüklenemedi!");
    console.error("Lütfen .env dosyanızı kontrol edin.");
} else {
    try {
        // 1. Temel DynamoDB istemcisini yapılandır
        ddbClient = new DynamoDBClient({
            region: region,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
            }
        });

        // 2. DocumentClient'ı temel istemci üzerine oluşturun
        const marshallOptions = {
            convertEmptyValues: false,
            removeUndefinedValues: true,
            convertClassInstanceToMap: false,
        };
        const unmarshallOptions = {
            wrapNumbers: false,
        };
        const translateConfig = { marshallOptions, unmarshallOptions };
        docClient = DynamoDBDocumentClient.from(ddbClient, translateConfig);
        console.log(`Bilgi: DynamoDB Client ve DocumentClient '${region}' bölgesi için başarıyla yapılandırıldı.`);

        // --- YENİ: S3 İstemcisini Yapılandır ---
        s3Client = new S3Client({
            region: region,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
            }
        });
        console.log(`Bilgi: S3 Client '${region}' bölgesi için başarıyla yapılandırıldı.`);
        // --- S3 Yapılandırması Sonu ---

    } catch (error) {
        console.error("HATA: AWS istemcileri (DynamoDB veya S3) oluşturulurken bir hata oluştu:", error);
        // Hata durumunda istemcileri null yapalım ki uygulama fark etsin
        ddbClient = null;
        docClient = null;
        s3Client = null; // Hata durumunda s3Client'ı da null yap
    }
}

// Hem DynamoDB istemcilerini hem de S3 istemcisini dışa aktar
module.exports = { ddbClient, docClient, s3Client }; // s3Client eklendi