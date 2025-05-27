// src/components/LoginForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FaSpinner, FaSignInAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useTranslation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setIsSuccess(false);
    setIsLoading(true);
    try {
        // API isteği (adres doğru varsayılıyor)
        const response = await axios.post('/api/users/login', { email, password });
        if (response.data.token && response.data.user) {
            login(response.data.token, response.data.user);
            setIsSuccess(true);
            setMessage(t('login_success', { username: response.data.user.username }));
            // Başarılı giriş sonrası yönlendirme App.jsx'te ele alınabilir
        } else {
            throw new Error('Token veya kullanıcı bilgisi alınamadı.');
        }
    } catch (error) {
        console.error('Login Hatası:', error.response?.data || error.message);
        const specificMessage = error.response?.data?.message;
        setMessage(specificMessage
          ? t('login_fail_specific', { message: specificMessage })
          : t('login_fail_generic')
        );
        localStorage.removeItem('authToken');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    // Form elemanları arası boşluk
    <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mesaj Alanı (Formun Üstünde) */}
        {message && (
            <p className={`text-sm text-center font-medium py-2 px-3 rounded-md ${isSuccess ? 'text-green-100 bg-green-600/80' : 'text-red-100 bg-red-600/80'}`}>
                {message}
            </p>
         )}

      {/* E-posta Alanı */}
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-1">
          {t('login_email_label', 'Email')}
        </label>
        <input
          type="email" id="login-email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} autoComplete="email"
          // <<< STİL GÜNCELLEMESİ: Tasarıma uygun stiller >>>
          className="block w-full px-4 py-3 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-gray-800 text-gray-100 placeholder-gray-500 disabled:opacity-60"
          placeholder={t('login_email_placeholder', 'your@email.com')}
        />
      </div>

      {/* Şifre Alanı */}
      <div>
        {/* <<< STİL GÜNCELLEMESİ: Label ve linki aynı satıra almak için flex >>> */}
        <div className="flex items-center justify-between mb-1">
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-300">
              {t('login_password_label', 'Password')}
            </label>
            {/* Şifremi unuttum linki */}
            <div className="text-sm">
                <a href="#" className="font-medium text-blue-500 hover:text-blue-400">
                    {t('login_forgot_password', 'Forgot Your Password?')}
                </a>
            </div>
        </div>
        <input
          type="password" id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} autoComplete="current-password"
          // <<< STİL GÜNCELLEMESİ: Tasarıma uygun stiller >>>
          className="block w-full px-4 py-3 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-gray-800 text-gray-100 placeholder-gray-500 disabled:opacity-60"
          placeholder={t('login_password_placeholder', '••••••••')}
        />
      </div>

      {/* Buton Alanı */}
      <div>
        <button
          type="submit" disabled={isLoading}
          // <<< STİL GÜNCELLEMESİ: Tasarıma uygun mavi buton >>>
          className="w-full inline-flex justify-center items-center py-3 px-4 border border-transparent shadow-sm text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? <FaSpinner className="animate-spin -ml-1 mr-2 h-5 w-5" /> : null } {/* İkon kaldırıldı, sadece spinner */}
          {isLoading ? t('login_loading', 'Signing In...') : t('login_button', 'Sign In')}
        </button>
      </div>
    </form>
  );
}

export default LoginForm;
