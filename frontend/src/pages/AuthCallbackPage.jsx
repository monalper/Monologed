// src/pages/AuthCallbackPage.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios'; // Profil bilgisini çekmek için

function AuthCallbackPage() {
    const location = useLocation(); // URL bilgilerini almak için
    const navigate = useNavigate(); // Yönlendirme yapmak için
    const { login } = useAuth(); // AuthContext'ten login fonksiyonunu al
    const [message, setMessage] = useState('Giriş işlemi doğrulanıyor, lütfen bekleyin...');
    const [error, setError] = useState(false);

    useEffect(() => {
        // URL fragment'ını (#token=...) al
        const hash = location.hash.substring(1); // Başındaki '#' işaretini kaldır
        const params = new URLSearchParams(hash);
        const token = params.get('token'); // 'token' parametresini al

        if (token) {
            console.log("AuthCallbackPage: Token URL'den alındı:", token);
            setMessage('Token alındı, kullanıcı profili doğrulanıyor...');

            // --- GÜVENLİK ADIMI: Token'ı backend ile doğrula ve kullanıcı bilgisini al ---
            const verifyTokenAndLogin = async () => {
                try {
                    // Axios'un header'ına geçici olarak token'ı ekle
                    const headers = { Authorization: `Bearer ${token}` };
                    // Backend'deki /api/users/profile endpoint'ine istek gönder
                    const response = await axios.get('http://localhost:5000/api/users/profile', { headers });

                    if (response.data && response.data.userId) {
                        const userData = response.data;
                        console.log("AuthCallbackPage: Token doğrulandı, kullanıcı bilgisi:", userData);
                        // Token ve kullanıcı bilgisini AuthContext'e kaydet
                        login(token, userData);
                        setMessage('Giriş başarılı! Yönlendiriliyorsunuz...');
                        // Kullanıcıyı ana sayfaya yönlendir
                        setTimeout(() => navigate('/', { replace: true }), 1000);
                    } else {
                        // Profil bilgisi alınamadıysa token geçersizdir
                        throw new Error('Profil bilgisi alınamadı.');
                    }
                } catch (err) {
                    console.error("AuthCallbackPage: Token doğrulama veya profil alma hatası:", err.response?.data || err.message);
                    setError(true);
                    setMessage(`Giriş başarısız oldu: ${err.response?.data?.message || 'Geçersiz token veya sunucu hatası.'}`);
                    // Hata durumunda login sayfasına geri yönlendir
                    setTimeout(() => navigate('/login?error=github_verification_failed', { replace: true }), 2500);
                }
            };

            verifyTokenAndLogin();
            // --- Doğrulama Sonu ---

        } else {
            console.error("AuthCallbackPage: URL'de token bulunamadı.");
            setError(true);
            setMessage('Giriş işlemi sırasında bir hata oluştu (Token eksik).');
            // Token yoksa login sayfasına geri yönlendir
            setTimeout(() => navigate('/login?error=github_token_missing', { replace: true }), 2500);
        }

    }, [location, login, navigate]); // Bu effect sadece bir kere çalışacak

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-black text-center px-4">
             {/* Basit bir yüklenme/durum göstergesi */}
             <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                {!error && (
                    <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                )}
                 <p className={`text-lg ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                     {message}
                 </p>
             </div>
        </div>
    );
}

export default AuthCallbackPage;