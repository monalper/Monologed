// backend/services/emailService.js
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const REGION = process.env.AWS_REGION || "eu-north-1";
const FROM_EMAIL_ADDRESS = process.env.FROM_EMAIL || "info@monologed.com";
const SITE_URL = process.env.FRONTEND_URL || "[SİTENİZİN_URL'Sİ]"; // .env'den site URL'sini al
const SITE_NAME = "mLoged";
const LOGO_URL = process.env.EMAIL_LOGO_URL || "[LOGO_URL'NİZ]"; // .env'den logo URL'sini al

let sesClient;
try {
    sesClient = new SESClient({ region: REGION });
    console.log(`Bilgi: SES Client başarıyla oluşturuldu (Bölge: ${REGION}).`);
    if (!FROM_EMAIL_ADDRESS) {
        console.error("KRİTİK UYARI: FROM_EMAIL ortam değişkeni ayarlanmamış!");
    }
     if (SITE_URL === "[SİTENİZİN_URL'Sİ]") {
         console.warn("Uyarı: FRONTEND_URL ortam değişkeni ayarlanmamış, e-postadaki link çalışmayabilir.");
     }
     if (LOGO_URL === "[LOGO_URL'NİZ]") {
         console.warn("Uyarı: EMAIL_LOGO_URL ortam değişkeni ayarlanmamış, e-postada logo görünmeyebilir.");
     }
} catch (error) {
    console.error("KRİTİK HATA: SES Client oluşturulamadı!", error);
    sesClient = null;
}

const sendWelcomeEmail = async (toEmail, username) => {
    if (!sesClient || !FROM_EMAIL_ADDRESS || !toEmail) {
        console.error("HATA: E-posta gönderimi için ön koşullar sağlanamadı.", { hasClient: !!sesClient, hasFrom: !!FROM_EMAIL_ADDRESS, hasTo: !!toEmail });
        return false;
    }

    const subject = `${SITE_NAME}'a Hoş Geldin, ${username}!`;

    // HTML İçerik (Marka renkleri uygulandı)
    const bodyHtml = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; background-color: #f8f9fa; }
            .container { background-color: #ffffff; padding: 30px; max-width: 600px; margin: 20px auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 25px; }
            .header img { max-height: 40px; }
            .content { color: #343a40; line-height: 1.7; }
            .content h1 { color: #3D47FF; font-size: 22px; margin-bottom: 15px; }
            .content p { margin-bottom: 15px; font-size: 15px; }
            .button-container { text-align: center; margin-top: 25px; margin-bottom: 25px;}
            .button { background-color: #3D47FF; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 14px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6c757d; }
            .footer a { color: #6c757d; text-decoration: underline; }
        </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; background-color: #f8f9fa;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td style="padding: 20px 0;">
                    <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="padding: 30px;">
                                <div class="header" style="text-align: center; margin-bottom: 25px;">
                                    <img src="${LOGO_URL}" alt="${SITE_NAME} Logo" style="max-height: 40px;">
                                </div>

                                <div class="content" style="color: #343a40; line-height: 1.7;">
                                    <h1 style="color: #3D47FF; font-size: 22px; margin-bottom: 15px;">Merhaba ${username},</h1>
                                    <p style="margin-bottom: 15px; font-size: 15px;"><strong>${SITE_NAME}</strong> topluluğuna katıldığın için çok mutluyuz!</p>
                                    <p style="margin-bottom: 15px; font-size: 15px;">Artık izlediğin filmleri ve dizileri günlüğüne ekleyebilir, puanlayabilir, yorum yapabilir, listeler oluşturabilir ve diğer sinemaseverlerle etkileşime geçebilirsin.</p>
                                    <div class="button-container" style="text-align: center; margin-top: 25px; margin-bottom: 25px;">
                                        <a href="${SITE_URL}" class="button" style="background-color: #3D47FF; color: #ffffff !important; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 14px;">Hemen Başla</a>
                                    </div>
                                    <p style="margin-bottom: 15px; font-size: 15px;">Herhangi bir sorun yaşarsan veya yardıma ihtiyacın olursa bize ulaşmaktan çekinme.</p>
                                </div>

                                <div class="footer" style="text-align: center; margin-top: 30px; font-size: 12px; color: #6c757d;">
                                    <p style="margin-bottom: 5px;">&copy; ${new Date().getFullYear()} ${SITE_NAME}. Tüm hakları saklıdır.</p>
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    const bodyText = `Merhaba ${username},\n${SITE_NAME} topluluğuna katıldığın için teşekkür ederiz!\nArtık izlediğin filmleri ve dizileri loglayabilir, listeler oluşturabilir ve diğer sinemaseverlerle etkileşime geçebilirsin.\nHemen keşfetmeye başla: ${SITE_URL}\n\nSevgiler,\n${SITE_NAME} Ekibi`;

    const params = {
        Source: FROM_EMAIL_ADDRESS,
        Destination: { ToAddresses: [toEmail] },
        Message: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
                Html: { Data: bodyHtml, Charset: 'UTF-8' },
                Text: { Data: bodyText, Charset: 'UTF-8' },
            },
        },
    };

    try {
        console.log(`Bilgi: SendEmailCommand parametreleri:`, JSON.stringify(params, null, 2));
        console.log(`Bilgi: Hoş geldin e-postası gönderiliyor: ${toEmail} (Gönderen: ${params.Source})`);
        const command = new SendEmailCommand(params);
        const data = await sesClient.send(command);
        console.log(`Bilgi: E-posta başarıyla gönderildi. Message ID: ${data.MessageId}`);
        return true;
    } catch (error) {
        console.error(`HATA: E-posta gönderilemedi (${toEmail}). AWS SDK Hatası:`);
        console.error(`  - Hata Kodu (Code): ${error.Code || error.name || 'Bilinmiyor'}`);
        console.error(`  - Mesaj (Message): ${error.message || 'Detay yok'}`);
        console.error(`  - Meta Veri (Metadata):`, error.$metadata);
        console.error(`  - Tam Hata Nesnesi:`, error);
        return false;
    }
};

module.exports = { sendWelcomeEmail };
