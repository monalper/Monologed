// src/components/RegisterForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaSpinner, FaUserPlus } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

// Kullanıcı adı kuralları
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;
const PASSWORD_MIN_LENGTH = 6;

// Şartlar ve Gizlilik Politikası Modal Bileşeni (Basit)
const TermsModal = ({ isOpen, onClose, t }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl relative max-h-[80vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label={t('terms_modal_close')}>✕</button>
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">{t('terms_modal_title')}</h3>
                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <h4 className="font-semibold">{t('terms_modal_privacy_title')}</h4>
                    <p>{t('privacy_page_content_placeholder')}</p>
                    <h4 className="font-semibold mt-4">{t('terms_modal_terms_title')}</h4>
                    <p>{t('terms_page_content_placeholder')}</p>
                </div>
                <div className="mt-6 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                        {t('terms_modal_close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

function RegisterForm() {
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [termsError, setTermsError] = useState('');
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const navigate = useNavigate();

    // Hataları temizle
    useEffect(() => { setMessage(''); setTermsError(''); }, [username, email, password, termsAccepted]);

    // Kullanıcı adı validasyonu
    const handleUsernameChange = (e) => {
        const value = e.target.value;
        setUsername(value);
        if (!value) { setUsernameError(t('register_error_username_required')); }
        else if (!USERNAME_REGEX.test(value)) { setUsernameError(t('register_error_username_format')); }
        else if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) { setUsernameError(t('register_error_username_length', {min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH})); }
        else { setUsernameError(''); }
    };

    // Şifre validasyonu
    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        if (value && value.length < PASSWORD_MIN_LENGTH) { setPasswordError(t('register_error_password_length')); }
        else { setPasswordError(''); }
    };

    // Form gönderme
    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage(''); setIsSuccess(false); setIsLoading(true);
        setTermsError(''); setUsernameError(''); setPasswordError(''); // Hataları sıfırla

        let hasError = false;
        if (!termsAccepted) { setTermsError(t('register_error_terms')); hasError = true; }
        if (!username) { setUsernameError(t('register_error_username_required')); hasError = true; }
        else if (!USERNAME_REGEX.test(username)) { setUsernameError(t('register_error_username_format')); hasError = true; }
        else if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) { setUsernameError(t('register_error_username_length', {min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH})); hasError = true; }
        if (!password || password.length < PASSWORD_MIN_LENGTH) { setPasswordError(t('register_error_password_length')); hasError = true; }

        if (hasError) { setIsLoading(false); return; }

        try {
            // API isteği (adres doğru varsayılıyor)
            const response = await axios.post('/api/users/register', { username, email, password });
            if (response.data.message === 'Kullanıcı başarıyla kaydedildi') {
                setIsSuccess(true);
                setMessage(t('register_success', { username: username }));
                setTimeout(() => { navigate('/login'); }, 2500); // Kayıt sonrası login'e yönlendir
            } else {
                throw new Error(response.data.message || 'Beklenmedik sunucu yanıtı.');
            }
        } catch (error) {
             console.error('Register Hatası:', error.response?.data || error.message);
             const specificMessage = error.response?.data?.message;
             setMessage(specificMessage
               ? t('register_fail_specific', { message: specificMessage })
               : t('register_fail_generic')
             );
        } finally {
            // Başarılı yönlendirme durumunda isLoading false yapmaya gerek yok
            if(!isSuccess) setIsLoading(false);
        }
    };

    return (
        <>
            {/* Form elemanları arası boşluk */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Mesaj Alanı (Formun Üstünde) */}
                {message && ( <p className={`text-sm text-center font-medium py-2 px-3 rounded-md ${isSuccess ? 'text-green-100 bg-green-600/80' : 'text-red-100 bg-red-600/80'}`}> {message} </p> )}

                {/* Kullanıcı Adı */}
                <div>
                    <label htmlFor="register-username" className="block text-sm font-medium text-gray-300 mb-1">
                        {t('register_username_label', 'Username')}
                        <span className="text-xs text-gray-400 ml-1">{t('register_username_rules', '({{min}}-{{max}} chars, letters, numbers, _)', {min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH})}</span>
                    </label>
                    <input type="text" id="register-username" value={username} onChange={handleUsernameChange} required disabled={isLoading} autoComplete="username"
                        // <<< STİL GÜNCELLEMESİ: Login formuna benzer stiller >>>
                        className={`block w-full px-4 py-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 sm:text-sm bg-gray-800 text-gray-100 placeholder-gray-500 disabled:opacity-60 ${usernameError ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-blue-500 focus:border-transparent'}`}
                        placeholder={t('register_username_placeholder', 'your_username')}
                        aria-describedby="username-error"
                    />
                    {usernameError && <p id="username-error" className="mt-1 text-xs text-red-400">{usernameError}</p>}
                </div>

                {/* E-posta */}
                <div>
                    <label htmlFor="register-email" className="block text-sm font-medium text-gray-300 mb-1">
                        {t('register_email_label', 'Email')}
                    </label>
                    <input type="email" id="register-email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} autoComplete="email"
                        // <<< STİL GÜNCELLEMESİ: Login formuna benzer stiller >>>
                        className="block w-full px-4 py-3 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-gray-800 text-gray-100 placeholder-gray-500 disabled:opacity-60"
                        placeholder={t('register_email_placeholder', 'your@email.com')}
                    />
                </div>

                {/* Şifre */}
                <div>
                    <label htmlFor="register-password" className="block text-sm font-medium text-gray-300 mb-1">
                        {t('register_password_label', 'Password')}
                    </label>
                    <input type="password" id="register-password" value={password} onChange={handlePasswordChange} required disabled={isLoading} autoComplete="new-password"
                        // <<< STİL GÜNCELLEMESİ: Login formuna benzer stiller >>>
                        className={`block w-full px-4 py-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 sm:text-sm bg-gray-800 text-gray-100 placeholder-gray-500 disabled:opacity-60 ${passwordError ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-blue-500 focus:border-transparent'}`}
                        placeholder={t('register_password_placeholder', '•••••••• (Min 6 chars)')}
                        aria-describedby="password-error"
                    />
                    {passwordError && <p id="password-error" className="mt-1 text-xs text-red-400">{passwordError}</p>}
                </div>

                {/* Şartlar ve Koşullar */}
                <div className="flex items-start">
                    <div className="flex items-center h-5">
                        <input id="terms" name="terms" type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} disabled={isLoading}
                            // <<< STİL GÜNCELLEMESİ: Checkbox stili >>>
                            className={`h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700 focus:ring-offset-black ${termsError ? 'border-red-500' : ''}`}
                            aria-describedby="terms-error"
                        />
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="terms" className="font-medium text-gray-400">
                            {t('register_terms_agree', 'I have read and agree to the')}{' '}
                            <button type="button" onClick={() => setIsTermsModalOpen(true)} className="text-blue-500 hover:text-blue-400 underline">
                                {t('register_terms_link', 'Privacy Policy and Terms of Use')}
                            </button>
                        </label>
                        {termsError && <p id="terms-error" className="mt-1 text-xs text-red-400">{termsError}</p>}
                    </div>
                </div>

                {/* Buton Alanı */}
                <div>
                    <button type="submit" disabled={isLoading || !termsAccepted || !!usernameError || !!passwordError}
                        // <<< STİL GÜNCELLEMESİ: Login formuna benzer buton stili >>>
                        className="w-full inline-flex justify-center items-center py-3 px-4 border border-transparent shadow-sm text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <FaSpinner className="animate-spin -ml-1 mr-2 h-5 w-5" /> : null } {/* İkon kaldırıldı */}
                        {isLoading ? t('register_loading', 'Registering...') : t('register_button', 'Register')}
                    </button>
                </div>
            </form>
            {/* Şartlar Modalı */}
            <TermsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} t={t} />
        </>
    );
}

export default RegisterForm;
