// src/pages/AdminPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import {
    FaUsers, FaSpinner, FaExclamationCircle, FaCheckCircle, FaTimesCircle,
    FaUserShield, FaTrash, FaUserCog, FaListAlt, FaChartBar, FaEdit // FaEdit eklendi
} from 'react-icons/fa';
import AdminEditorialListsPage from './AdminEditorialListsPage';
import AdminEditorialPages from './AdminEditorialPages'; // Yeni bileşeni import et

// Küçük Avatar Placeholder (UserRow için)
const DefaultAvatarSmall = () => (
    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
        <FaUserShield className="w-5 h-5 text-gray-400" />
    </div>
);

// Yüklenme Göstergesi
const LoadingIndicator = ({ text = "Yükleniyor..." }) => (
    <div className="flex justify-center items-center py-10 text-gray-500 dark:text-gray-400">
        <FaSpinner className="animate-spin text-brand text-3xl mr-3" />
        {text}
    </div>
);

// Hata Göstergesi
const ErrorDisplay = ({ message }) => (
    <div className="text-center p-6 border border-red-700 rounded-lg bg-red-900/30 text-red-300">
        <FaExclamationCircle className="w-6 h-6 mx-auto mb-2" />
        {message || "Bir hata oluştu."}
    </div>
);

// Kullanıcı Satırı Bileşeni
function UserRow({
    user,
    onVerifyToggle, isTogglingVerify, togglingUserId,
    onDeleteUser, isDeletingUser, deletingUserId,
    onAdminToggle, isTogglingAdmin, togglingAdminUserId
}) {
    const { userId, username, email, name, avatarUrl, isVerified, createdAt, isAdmin } = user;
    const { user: loggedInUser } = useAuth();
    const displayName = name || username;
    const joinDate = createdAt ? new Date(createdAt).toLocaleDateString('tr-TR') : 'Bilinmiyor';
    const isCurrentlyTogglingVerify = isTogglingVerify && togglingUserId === userId;
    const isCurrentlyDeleting = isDeletingUser && deletingUserId === userId;
    const isCurrentlyTogglingAdmin = isTogglingAdmin && togglingAdminUserId === userId;
    const isSelf = loggedInUser?.userId === userId;
    const isAnyActionInProgress = isCurrentlyTogglingVerify || isCurrentlyDeleting || isCurrentlyTogglingAdmin;

    return (
        <tr className={`border-b border-gray-700 hover:bg-gray-700/50 transition-colors ${isCurrentlyDeleting ? 'opacity-50 bg-red-900/30' : ''}`}>
            <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <DefaultAvatarSmall />
                        )}
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-100 flex items-center">
                            {displayName}
                            {isVerified && <FaCheckCircle className="w-3 h-3 text-blue-400 ml-1.5 flex-shrink-0" title="Onaylanmış Hesap" />}
                            {isAdmin && <FaUserShield className="w-3 h-3 text-yellow-400 ml-1.5 flex-shrink-0" title="Yönetici" />}
                        </div>
                        <div className="text-xs text-gray-400">@{username}</div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{email}</td>
            <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{joinDate}</td>
            <td className="px-4 py-3 whitespace-nowrap text-center">
                <button
                    onClick={() => onVerifyToggle(userId, !isVerified)}
                    disabled={isAnyActionInProgress}
                    className={`inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:opacity-50 ${
                        isVerified
                        ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                        : 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500'
                    }`}
                    title={isVerified ? 'Onayı Kaldır' : 'Onayla'}
                >
                    {isCurrentlyTogglingVerify ? <FaSpinner className="animate-spin h-3 w-3" /> : (isVerified ? <FaCheckCircle className="h-3.5 w-3.5 mr-1" /> : <FaTimesCircle className="h-3.5 w-3.5 mr-1" />)}
                    {isVerified ? 'Onaylı' : 'Onayla'}
                </button>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                {!isSelf && (
                    <button
                        onClick={() => onAdminToggle(userId, !isAdmin)}
                        disabled={isAnyActionInProgress}
                        className={`p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isAdmin
                            ? 'text-yellow-500 hover:text-yellow-300 hover:bg-yellow-900/30'
                            : 'text-gray-400 hover:text-green-400 hover:bg-green-900/30'
                        }`}
                        title={isAdmin ? 'Yönetici Yetkisini Kaldır' : 'Yönetici Yap'}
                    >
                        {isCurrentlyTogglingAdmin ? <FaSpinner className="animate-spin h-4 w-4" /> : <FaUserCog className="h-4 w-4" />}
                    </button>
                 )}
                {!isSelf && (
                    <button
                        onClick={() => onDeleteUser(userId, username)}
                        disabled={isAnyActionInProgress}
                        className="text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-1 rounded hover:bg-red-900/30"
                        title="Kullanıcıyı Sil"
                    >
                        {isCurrentlyDeleting ? <FaSpinner className="animate-spin h-4 w-4" /> : <FaTrash className="h-4 w-4" />}
                    </button>
                )}
            </td>
        </tr>
    );
}

// Admin Paneli Ana Bileşeni
function AdminPage() {
    const { user, token, isLoading: authLoading } = useAuth();
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [errorUsers, setErrorUsers] = useState(null);
    const [isTogglingVerify, setIsTogglingVerify] = useState(false);
    const [togglingUserId, setTogglingUserId] = useState(null);
    const [verifyError, setVerifyError] = useState(null);
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState(null);
    const [deleteError, setDeleteError] = useState(null);
    const [isTogglingAdmin, setIsTogglingAdmin] = useState(false);
    const [togglingAdminUserId, setTogglingAdminUserId] = useState(null);
    const [adminToggleError, setAdminToggleError] = useState(null);

    const [activeAdminSection, setActiveAdminSection] = useState('users'); // 'users', 'editorialLists', 'editorialPages', 'stats'

    const [siteStats, setSiteStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [errorStats, setErrorStats] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true); setErrorUsers(null); setUsers([]);
        try {
            const response = await axios.get('/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data.users || []);
        } catch (err) {
            console.error("Admin - Kullanıcıları çekme hatası:", err.response?.data || err.message);
            setErrorUsers(err.response?.data?.message || "Kullanıcılar yüklenirken bir hata oluştu.");
            setUsers([]);
        } finally { setLoadingUsers(false); }
    }, [token]);

    const fetchSiteStats = useCallback(async () => {
        setLoadingStats(true); setErrorStats(null); setSiteStats(null);
        try {
            const response = await axios.get('/api/admin/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSiteStats(response.data);
        } catch (err) {
            console.error("Admin - Site istatistikleri çekme hatası:", err.response?.data || err.message);
            setErrorStats(err.response?.data?.message || "Site istatistikleri yüklenirken bir hata oluştu.");
        } finally {
            setLoadingStats(false);
        }
    }, [token]);

    useEffect(() => {
        if (user?.isAdmin) {
            if (activeAdminSection === 'users') {
                fetchUsers();
            } else if (activeAdminSection === 'stats') {
                fetchSiteStats();
            }
            // Editöryel listeler ve sayfalar kendi içlerinde veri çekecek
        }
    }, [user?.isAdmin, activeAdminSection, fetchUsers, fetchSiteStats]);

    const handleVerifyToggle = useCallback(async (userIdToToggle, newStatus) => {
        if (isDeletingUser || isTogglingAdmin) return;
        setIsTogglingVerify(true); setTogglingUserId(userIdToToggle); setVerifyError(null);
        try {
            await axios.put(`/api/users/${userIdToToggle}/verify`, { verified: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(prevUsers => prevUsers.map(u => u.userId === userIdToToggle ? { ...u, isVerified: newStatus } : u ));
        } catch (err) {
            setVerifyError(`Kullanıcı durumu değiştirilemedi: ${err.response?.data?.message || 'Bir hata oluştu.'}`);
            setTimeout(() => setVerifyError(null), 4000);
        } finally { setIsTogglingVerify(false); setTogglingUserId(null); }
    }, [token, isDeletingUser, isTogglingAdmin]);

    const handleDeleteUser = useCallback(async (userIdToDelete, usernameToDelete) => {
        if (isTogglingVerify || isTogglingAdmin) return;
        const confirmDelete = window.confirm(`'${usernameToDelete}' (${userIdToDelete}) kullanıcısını silmek istediğinize emin misiniz?\n\nBU İŞLEM GERİ ALINAMAZ ve kullanıcının TÜM verileri SİLİNECEKTİR!`);
        if (!confirmDelete) return;
        setIsDeletingUser(true); setDeletingUserId(userIdToDelete); setDeleteError(null);
        try {
            await axios.delete(`/api/admin/users/${userIdToDelete}`,{
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(prevUsers => prevUsers.filter(u => u.userId !== userIdToDelete));
        } catch (err) {
            setDeleteError(`Kullanıcı silinemedi: ${err.response?.data?.message || 'Bir hata oluştu.'}`);
            setTimeout(() => setDeleteError(null), 4000);
        } finally { setIsDeletingUser(false); setDeletingUserId(null); }
    }, [token, isTogglingVerify, isTogglingAdmin]);

    const handleAdminToggle = useCallback(async (userIdToToggle, newAdminStatus) => {
        if (isTogglingVerify || isDeletingUser) return;
        if (user?.userId === userIdToToggle) {
            setAdminToggleError("Kendi rolünüzü değiştiremezsiniz.");
            setTimeout(() => setAdminToggleError(null), 4000);
            return;
        }
        setIsTogglingAdmin(true); setTogglingAdminUserId(userIdToToggle); setAdminToggleError(null);
        try {
            await axios.put(`/api/admin/users/${userIdToToggle}/role`, { isAdmin: newAdminStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(prevUsers => prevUsers.map(u => u.userId === userIdToToggle ? { ...u, isAdmin: newAdminStatus } : u ));
        } catch (err) {
            setAdminToggleError(`Kullanıcı rolü değiştirilemedi: ${err.response?.data?.message || 'Bir hata oluştu.'}`);
            setTimeout(() => setAdminToggleError(null), 4000);
        } finally { setIsTogglingAdmin(false); setTogglingAdminUserId(null); }
    }, [token, user?.userId, isTogglingVerify, isDeletingUser]);

    if (authLoading) { return <LoadingIndicator />; }
    if (!token) { return <Navigate to="/login" replace />; }
    if (!user?.isAdmin) {
        return (
            <div className="text-center py-10">
                <h1 className="text-2xl font-bold text-red-500 mb-4">Yetkisiz Erişim</h1>
                <p className="text-gray-400">Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex border-b border-gray-700 mb-6 overflow-x-auto">
                <button
                    onClick={() => setActiveAdminSection('users')}
                    className={`px-4 py-3 text-sm font-medium transition-colors focus:outline-none whitespace-nowrap ${activeAdminSection === 'users' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-gray-400 hover:text-gray-200 hover:border-b-2 hover:border-gray-500'}`}
                >
                    <FaUsers className="inline-block mr-2 mb-0.5" /> Kullanıcı Yönetimi
                </button>
                <button
                    onClick={() => setActiveAdminSection('editorialLists')}
                    className={`px-4 py-3 text-sm font-medium transition-colors focus:outline-none whitespace-nowrap ${activeAdminSection === 'editorialLists' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-gray-400 hover:text-gray-200 hover:border-b-2 hover:border-gray-500'}`}
                >
                    <FaListAlt className="inline-block mr-2 mb-0.5" /> Editöryel Listeler
                </button>
                {/* YENİ SEKME: Editöryel Sayfalar */}
                <button
                    onClick={() => setActiveAdminSection('editorialPages')}
                    className={`px-4 py-3 text-sm font-medium transition-colors focus:outline-none whitespace-nowrap ${activeAdminSection === 'editorialPages' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-gray-400 hover:text-gray-200 hover:border-b-2 hover:border-gray-500'}`}
                >
                    <FaEdit className="inline-block mr-2 mb-0.5" /> Editöryel Sayfalar
                </button>
                 <button
                    onClick={() => setActiveAdminSection('stats')}
                    className={`px-4 py-3 text-sm font-medium transition-colors focus:outline-none whitespace-nowrap ${activeAdminSection === 'stats' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-gray-400 hover:text-gray-200 hover:border-b-2 hover:border-gray-500'}`}
                >
                    <FaChartBar className="inline-block mr-2 mb-0.5" /> Site İstatistikleri
                </button>
            </div>

            {verifyError && ( <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-300 text-sm mb-4"> {verifyError} </div> )}
            {deleteError && ( <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-300 text-sm mb-4"> {deleteError} </div> )}
            {adminToggleError && ( <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-300 text-sm mb-4"> {adminToggleError} </div> )}

            {activeAdminSection === 'users' && (
                <>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-100 flex items-center">
                        <FaUsers className="mr-3 text-cyan-500" /> Kullanıcı Listesi
                    </h1>
                    {loadingUsers && <LoadingIndicator text="Kullanıcılar yükleniyor..." />}
                    {errorUsers && <ErrorDisplay message={errorUsers} />}
                    {!loadingUsers && !errorUsers && (
                        <div className="overflow-x-auto shadow-md rounded-lg border border-gray-700">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-800">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Kullanıcı</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">E-posta</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Katılma Tarihi</th>
                                        <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Doğrulama</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Eylemler</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-800/50 divide-y divide-gray-700">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-5 text-gray-500 italic">Sistemde kayıtlı kullanıcı bulunamadı.</td>
                                        </tr>
                                    ) : (
                                        users.map(u => (
                                            <UserRow
                                                key={u.userId}
                                                user={u}
                                                onVerifyToggle={handleVerifyToggle}
                                                isTogglingVerify={isTogglingVerify}
                                                togglingUserId={togglingUserId}
                                                onDeleteUser={handleDeleteUser}
                                                isDeletingUser={isDeletingUser}
                                                deletingUserId={deletingUserId}
                                                onAdminToggle={handleAdminToggle}
                                                isTogglingAdmin={isTogglingAdmin}
                                                togglingAdminUserId={togglingAdminUserId}
                                            />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {activeAdminSection === 'editorialLists' && (
                <AdminEditorialListsPage />
            )}

            {/* YENİ BÖLÜM: Editöryel Sayfalar */}
            {activeAdminSection === 'editorialPages' && (
                <AdminEditorialPages />
            )}

            {activeAdminSection === 'stats' && (
                 <>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-100 flex items-center">
                        <FaChartBar className="mr-3 text-cyan-500" /> Site İstatistikleri
                    </h1>
                    {loadingStats && <LoadingIndicator text="İstatistikler yükleniyor..." />}
                    {errorStats && <ErrorDisplay message={errorStats} />}
                    {!loadingStats && !errorStats && siteStats && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gray-800/60 p-5 rounded-lg border border-gray-700 shadow-sm text-center">
                                <p className="text-3xl font-bold text-cyan-400">{siteStats.totalUsers ?? 0}</p>
                                <p className="text-sm text-gray-400 mt-1">Toplam Kullanıcı</p>
                            </div>
                            <div className="bg-gray-800/60 p-5 rounded-lg border border-gray-700 shadow-sm text-center">
                                <p className="text-3xl font-bold text-green-400">{siteStats.totalLogs ?? 0}</p>
                                <p className="text-sm text-gray-400 mt-1">Toplam Log</p>
                            </div>
                            <div className="bg-gray-800/60 p-5 rounded-lg border border-gray-700 shadow-sm text-center">
                                <p className="text-3xl font-bold text-blue-400">{siteStats.totalUniqueMoviesLogged ?? 0}</p>
                                <p className="text-sm text-gray-400 mt-1">Benzersiz Film Logu</p>
                            </div>
                            <div className="bg-gray-800/60 p-5 rounded-lg border border-gray-700 shadow-sm text-center">
                                <p className="text-3xl font-bold text-purple-400">{siteStats.totalUniqueTvsLogged ?? 0}</p>
                                <p className="text-sm text-gray-400 mt-1">Benzersiz Dizi Logu</p>
                            </div>
                        </div>
                    )}
                    {!loadingStats && !errorStats && !siteStats && (
                        <p className="text-gray-500 italic text-center py-6 border border-dashed dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/30">
                            Site istatistikleri bulunamadı.
                        </p>
                    )}
                 </>
            )}
        </div>
    );
}

export default AdminPage;
