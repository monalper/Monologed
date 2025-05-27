// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/api';

// 1. Context'i oluştur
const AuthContext = createContext(null);

// 2. Provider Bileşenini Oluştur
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('authToken') || null); // Başlangıçta localStorage'dan al
    const [user, setUser] = useState(null); // Kullanıcı bilgilerini tutmak için (isVerified dahil)
    const [isLoading, setIsLoading] = useState(true); // Başlangıçta token kontrolü için yükleniyor durumu

    // Uygulama yüklendiğinde localStorage'daki token'ı kontrol et
    useEffect(() => {
        const verifyToken = async () => {
            const storedToken = localStorage.getItem('authToken');
            if (storedToken) {
                console.log("AuthContext: localStorage'da token bulundu, doğrulanıyor...");
                try {
                    // Backend'den kullanıcı profilini çek (isVerified dahil)
                    const response = await api.get('/api/users/profile');
                    setUser(response.data);
                    setToken(storedToken);
                    console.log("AuthContext: Token doğrulandı, kullanıcı bilgisi:", response.data);
                } catch (error) {
                    console.error("AuthContext: Token doğrulama hatası veya geçersiz token:", error.response?.data?.message || error.message);
                    localStorage.removeItem('authToken');
                    setToken(null);
                    setUser(null);
                }
            } else {
                console.log("AuthContext: localStorage'da token bulunamadı.");
            }
            setIsLoading(false);
        };

        verifyToken();
    }, []);

    // Login fonksiyonu: Token ve kullanıcı bilgisini alır (isVerified dahil)
    const login = (newToken, userData) => {
        console.log("AuthContext: Login işlemi yapılıyor...");
        localStorage.setItem('authToken', newToken);
        setUser(userData); // <<< Bu satır isVerified'ı da alır
        setToken(newToken);
        console.log("AuthContext: Token kaydedildi, kullanıcı ayarlandı:", userData);
    };

    // Logout fonksiyonu
    const logout = () => {
        console.log("AuthContext: Logout işlemi yapılıyor...");
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
        console.log("AuthContext: Token silindi, kullanıcı null yapıldı.");
        // window.location.href = '/login'; // Opsiyonel yönlendirme
    };

    // Context Provider'ın sağlayacağı değerler
    const value = {
        token,
        user, // <<< Bu user objesi artık isVerified alanını içeriyor olmalı
        isLoading,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// 3. Context'i kullanmak için özel bir hook
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
