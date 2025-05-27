// src/pages/ProfilePage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FaCamera, FaSpinner, FaUserCircle, FaCheck, FaFileImport, FaCalendarAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const DEFAULT_AVATAR_URL = 'https://journal-app-avatars.s3.eu-north-1.amazonaws.com/avatars/SPRK_default_preset_name_custom+%E2%80%93+1.svg';

function ProfilePage() {
    const { t, i18n } = useTranslation();
    const { user, token, isLoading: authLoading, login } = useAuth();

    // State'ler
    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');
    const [name, setName] = useState(user?.name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(user?.avatarUrl || null);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const fileInputRef = useRef(null);
    const [usernameError, setUsernameError] = useState('');
    const initialUsername = useRef(user?.username || '');
    const initialName = useRef(user?.name || '');
    const initialBio = useRef(user?.bio || '');

    // Kullanıcı bilgileri güncellendiğinde state'leri güncelle
    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setEmail(user.email);
            setName(user.name || '');
            setBio(user.bio || '');
            setPreviewUrl(user.avatarUrl || null);
            initialUsername.current = user.username;
            initialName.current = user.name || '';
            initialBio.current = user.bio || '';
            setUsernameError('');
            setSelectedFile(null);
        }
    }, [user]);

    // Dosya seçme ve tetikleme
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => { setPreviewUrl(reader.result); };
            reader.readAsDataURL(file);
            setMessage({ type: '', text: '' });
        } else {
            setSelectedFile(null);
            setPreviewUrl(user?.avatarUrl || null);
            setMessage({ type: 'error', text: t('profile_page_error_image_type') });
        }
    };
    const triggerFileInput = () => { fileInputRef.current?.click(); };

    // Kullanıcı adı validasyonu
    const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
    const USERNAME_MIN_LENGTH = 3;
    const USERNAME_MAX_LENGTH = 20;
    const handleUsernameChange = (e) => {
        const value = e.target.value;
        setUsername(value);
        setMessage({ type: '', text: '' });
        if (!value) { setUsernameError(t('register_error_username_required')); }
        else if (!USERNAME_REGEX.test(value)) { setUsernameError(t('register_error_username_format')); }
        else if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) { setUsernameError(t('register_error_username_length', {min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH})); }
        else { setUsernameError(''); }
    };

    // Profil güncelleme API isteği
    const handleProfileUpdate = async (event) => {
        event.preventDefault();
        setMessage({ type: '', text: '' });
        if (usernameError) { setMessage({ type: 'error', text: t('profile_page_error_username') }); return; }

        const usernameTrimmed = username.trim();
        const nameTrimmed = name.trim();
        const bioTrimmed = bio.trim();
        const usernameChanged = usernameTrimmed !== initialUsername.current;
        const nameChanged = nameTrimmed !== (initialName.current || '');
        const bioChanged = bioTrimmed !== (initialBio.current || '');
        const avatarChanged = !!selectedFile;

        if (!avatarChanged && !usernameChanged && !nameChanged && !bioChanged) {
            setMessage({ type: 'info', text: t('profile_page_message_no_change') });
            return;
        }

        setIsSaving(true);
        const formData = new FormData();
        if (usernameChanged) formData.append('username', usernameTrimmed);
        if (nameChanged) formData.append('name', nameTrimmed);
        if (bioChanged) formData.append('bio', bioTrimmed);
        if (avatarChanged) formData.append('avatar', selectedFile);

        try {
            const response = await axios.put('/api/users/profile', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data && response.data.user) {
                setMessage({ type: 'success', text: response.data.message || t('profile_page_message_success') });
                setSelectedFile(null);
                const newToken = response.data.token || token;
                login(newToken, response.data.user);
            } else if (response.data && response.data.message) {
                setMessage({ type: 'info', text: response.data.message });
            } else {
                setMessage({ type: 'error', text: t('profile_page_message_success_unexpected') });
            }
        } catch (error) {
            setMessage({ type: 'error', text: t('profile_page_message_fail', { message: error.response?.data?.message || 'Sunucu hatası veya bağlantı sorunu.' }) });
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading) return <div className="flex justify-center items-center min-h-[300px]"><FaSpinner className="animate-spin text-brand text-4xl" /></div>;
    if (!token || !user) return null;

    // Profil bilgileri
    const displayName = user.name || user.username;
    const usernameHandle = user.username ? `@${user.username}` : '';
    const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' }) : t('unknown_date');

    // Kaydet butonunun durumu
    const isSubmitDisabled = isSaving || !!usernameError || (!selectedFile && username.trim() === initialUsername.current && (name === null ? '' : name.trim()) === (initialName.current || '') && (bio === null ? '' : bio.trim()) === (initialBio.current || ''));

    return (
        <div className="min-h-screen bg-black w-full">
            <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
                {/* Profil Kartı */}
                <div className="bg-[#181818] rounded-3xl p-8 flex flex-col items-center text-center w-full">
                    {previewUrl ? (
                        <img src={previewUrl} alt="Profil Resmi" className="w-24 h-24 rounded-full mb-4 border-black object-cover" />
                    ) : (
                        <img src={DEFAULT_AVATAR_URL} alt="Varsayılan Profil" className="w-24 h-24 rounded-full mb-4 border-black object-cover" />
                    )}
                    <h2 className="text-2xl font-bold text-white mb-1">{displayName}</h2>
                    {usernameHandle && <div className="text-gray-400 text-base">{usernameHandle}</div>}
                    <div className="text-gray-500 text-sm flex items-center justify-center mt-1 mb-4">
                        <FaCalendarAlt className="mr-1" />
                        {t('public_profile_member_since', { date: joinDate })}
                    </div>
                    <div className="flex justify-center gap-8 mt-2 w-full text-center">
                        <div>
                            <div className="text-white font-semibold text-xl">-</div>
                            <div className="text-gray-400 text-xs">{t('public_profile_followers')}</div>
                        </div>
                        <div>
                            <div className="text-white font-semibold text-xl">-</div>
                            <div className="text-gray-400 text-xs">{t('public_profile_following')}</div>
                        </div>
                        <div>
                            <div className="text-white font-semibold text-xl">-</div>
                            <div className="text-gray-400 text-xs">{t('public_profile_logs')}</div>
                        </div>
                        <div>
                            <div className="text-white font-semibold text-xl">-</div>
                            <div className="text-gray-400 text-xs">{t('public_profile_lists')}</div>
                        </div>
                    </div>
                    <button
                        onClick={triggerFileInput}
                        className="mt-6 px-6 py-2 rounded-xl bg-[#232323] text-gray-200 text-base font-medium border border-[#232323] hover:bg-[#2a2a2a] transition"
                        type="button"
                        disabled={isSaving}
                    >
                        {t('profile_page_change_picture_button')}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/gif, image/webp" className="hidden" disabled={isSaving}/>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('profile_page_picture_hint')}</p>
                </div>

                {/* Profil Düzenleme Formu */}
                <div className="bg-[#181818] rounded-3xl p-8 space-y-6">
                    <h2 className="text-2xl font-bold text-white mb-6">{t('profile_page_title')}</h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                        {/* Kullanıcı Adı */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                                {t('profile_page_username_label')} <span className="text-xs text-gray-400">{t('register_username_rules', {min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH})}</span>
                            </label>
                            <input
                                type="text" id="username" value={username}
                                onChange={handleUsernameChange}
                                className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 sm:text-sm bg-gray-900 text-gray-100 placeholder-gray-500 border-gray-700 focus:ring-brand focus:border-brand disabled:opacity-60 ${usernameError ? 'border-red-500 focus:ring-red-500' : ''}`}
                                disabled={isSaving}
                                required
                                aria-describedby="profile-username-error"
                            />
                            {usernameError && <p id="profile-username-error" className="mt-1 text-xs text-red-400">{usernameError}</p>}
                        </div>
                        {/* Görünür İsim */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                                {t('profile_page_display_name_label')} <span className="text-xs text-gray-400">{t('profile_page_display_name_optional')}</span>
                            </label>
                            <input
                                type="text" id="name" value={name || ''} onChange={(e) => setName(e.target.value)}
                                className="block w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg shadow-sm text-gray-100 focus:ring-brand focus:border-brand disabled:opacity-60"
                                disabled={isSaving}
                                placeholder={t('profile_page_display_name_placeholder')}
                            />
                        </div>
                        {/* Biyografi */}
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1">
                                {t('profile_page_bio_label')} <span className="text-xs text-gray-400">{t('profile_page_bio_optional')}</span>
                            </label>
                            <textarea
                                id="bio"
                                value={bio || ''}
                                onChange={(e) => setBio(e.target.value)}
                                rows="4"
                                maxLength="160"
                                className="block w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg shadow-sm text-gray-100 focus:ring-brand focus:border-brand disabled:opacity-60 resize-none"
                                disabled={isSaving}
                                placeholder={t('profile_page_bio_placeholder')}
                            />
                            <p className="mt-1 text-xs text-gray-400 text-right">
                                {bio?.length || 0}/160
                            </p>
                        </div>
                        {/* E-posta (Değiştirilemez) */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
                                {t('profile_page_email_label')}
                            </label>
                            <input type="email" id="email" value={email} readOnly className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed" />
                        </div>
                        {/* Kaydet Butonu ve Mesaj Alanı */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                            <div className="flex-1 text-center sm:text-left">
                                {message.text && (
                                    <p className={`text-sm font-medium ${message.type === 'error' ? 'text-red-400' : message.type === 'success' ? 'text-green-400' : 'text-blue-400'}`}>
                                        {message.type === 'success' && <FaCheck className="inline w-4 h-4 mr-1 mb-0.5" />}
                                        {message.text}
                                    </p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitDisabled}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-brand hover:bg-opacity-85 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSaving ? ( <FaSpinner className="animate-spin -ml-1 mr-2 h-5 w-5" /> ) : ( <FaCheck className="-ml-1 mr-2 h-5 w-5" /> )}
                                {isSaving ? t('profile_page_saving_button') : t('profile_page_save_button')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Veri Yönetimi Bölümü */}
                <div className="bg-[#181818] rounded-3xl p-8">
                    <h2 className="text-lg font-semibold text-gray-100 mb-4 border-b border-gray-700 pb-2">
                        {t('profile_page_data_management_title')}
                    </h2>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-400">
                            {t('profile_page_data_management_desc')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link
                                to="/import/letterboxd"
                                className="inline-flex items-center justify-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-200 bg-[#232323] hover:bg-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500 transition-colors"
                            >
                                <FaFileImport className="w-4 h-4 mr-2" />
                                {t('profile_page_import_letterboxd_button')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;
