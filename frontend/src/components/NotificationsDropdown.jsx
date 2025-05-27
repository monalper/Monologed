// frontend/src/components/NotificationsDropdown.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { FaSpinner, FaUserPlus, FaHeart, FaComment, FaCheckCircle, FaTimesCircle, FaBellSlash } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale'; // İngilizce locale eklendi
import { useTranslation } from 'react-i18next'; // *** useTranslation import edildi ***
import { useAuth } from '../context/AuthContext'; // Token almak için

// Bildirim türüne göre ikon ve metin döndüren yardımcı fonksiyon
const getNotificationDetails = (notification, t) => { // *** t fonksiyonu parametre olarak alındı ***
  const actor = notification.actorUsername ? `@${notification.actorUsername}` : t('notifications_dropdown_actor_unknown'); // *** Çeviri kullanıldı ***
  switch (notification.type) {
    case 'NEW_FOLLOWER':
      return {
        icon: <FaUserPlus className="text-blue-400" />,
        // *** Çeviri kullanıldı (değişken ile) ***
        message: t('notifications_dropdown_type_follow', { actor: actor }),
        link: `/user/${notification.actorUserId}`
      };
    case 'NEW_LIKE':
      return {
        icon: <FaHeart className="text-red-400" />,
        // *** Çeviri kullanıldı (değişken ile) ***
        message: t('notifications_dropdown_type_like', { actor: actor }),
        link: `/log/${notification.entityId}` // Varsayılan log linki
      };
    case 'NEW_COMMENT':
      return {
        icon: <FaComment className="text-green-400" />,
        // *** Çeviri kullanıldı (değişken ile) ***
        message: t('notifications_dropdown_type_comment', { actor: actor }),
        link: `/log/${notification.entityId}` // Varsayılan log linki
      };
     case 'NEW_ACHIEVEMENT':
       return {
         icon: <FaCheckCircle className="text-yellow-400" />,
         // *** Çeviri kullanıldı ***
         message: t('notifications_dropdown_type_achievement'),
         link: `/user/${notification.userId}`
       };
    default:
      return {
        icon: <FaBellSlash className="text-gray-500" />,
        // *** Çeviri kullanıldı ***
        message: t('notifications_dropdown_type_unknown'),
        link: '#'
      };
  }
};

function NotificationsDropdown({ onClose, onMarkRead }) {
  const { t, i18n } = useTranslation(); // *** t ve i18n alındı ***
  const { token } = useAuth(); // Token'ı al
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Bildirimleri backend'den çekme fonksiyonu
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true); setError(null);
    if (!token) { // Token yoksa işlem yapma
        setIsLoading(false);
        setError(t('activity_feed_error_auth')); // Uygun bir hata mesajı
        setNotifications([]);
        return;
    }
    try {
      const response = await axios.get('/api/notifications?all=true', { // Proxy varsayımı
          headers: { Authorization: `Bearer ${token}` } // Token ekle
      });
      setNotifications(response.data?.notifications || []);
    } catch (err) {
      console.error("Bildirimler alınırken hata:", err.response?.data || err.message);
      setError(t('notifications_dropdown_error')); // *** Çeviri kullanıldı ***
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, t]); // t eklendi

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Bildirimleri okundu olarak işaretleme fonksiyonu
  const markAsRead = useCallback(async (notificationsToMark) => {
    if (!notificationsToMark || notificationsToMark.length === 0 || !token) return;
    const unreadNotifications = notificationsToMark.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;
    const idsToMark = unreadNotifications.map(n => ({ createdAt: n.createdAt, notificationId: n.notificationId }));
    try {
        await axios.put('/api/notifications/mark-read', { notificationIds: idsToMark }, { // Proxy varsayımı
            headers: { Authorization: `Bearer ${token}` } // Token ekle
        });
        setNotifications(prev => prev.map(n => idsToMark.some(marked => marked.notificationId === n.notificationId) ? { ...n, isRead: true } : n));
        if (onMarkRead) onMarkRead(unreadNotifications.length);
    } catch (err) { console.error("Bildirimler okundu olarak işaretlenirken hata:", err.response?.data || err.message); }
  }, [token, onMarkRead]); // token bağımlılıklara eklendi

   // Dropdown açıldığında tüm görünenleri okundu olarak işaretle
   useEffect(() => {
       if (notifications.length > 0) {
            const currentlyUnread = notifications.filter(n => !n.isRead);
             if(currentlyUnread.length > 0){
                  const timer = setTimeout(() => { markAsRead(currentlyUnread); }, 1500);
                  return () => clearTimeout(timer);
             }
       }
   }, [notifications, markAsRead]);

  // Bildirime tıklanınca çalışacak fonksiyon
  const handleNotificationClick = (notification) => {
     const { link } = getNotificationDetails(notification, t); // t fonksiyonunu geçir
     if (!notification.isRead) { markAsRead([notification]); }
     if (link && link !== '#') { navigate(link); }
     onClose();
  };

  return (
    <div className="max-h-96 overflow-y-auto">
      <div className="px-4 py-2 border-b border-gray-600 flex justify-between items-center">
        {/* *** Başlık çevirisi *** */}
        <h3 className="text-sm font-semibold text-white">{t('notifications_dropdown_title')}</h3>
      </div>

      {isLoading && (
        <div className="p-4 text-center text-gray-400 flex justify-center items-center">
          {/* *** Yükleniyor metni çevirisi *** */}
          <FaSpinner className="animate-spin mr-2" /> {t('notifications_dropdown_loading')}
        </div>
      )}
      {error && (
        <div className="p-4 text-center text-red-400">
          <FaTimesCircle className="inline mr-1 mb-0.5" /> {error}
        </div>
      )}
      {!isLoading && !error && notifications.length === 0 && (
        <div className="p-4 text-center text-gray-500 text-sm">
          <FaBellSlash className="mx-auto mb-2 text-2xl text-gray-600" />
          {/* *** Boş durum metni çevirisi *** */}
          {t('notifications_dropdown_empty')}
        </div>
      )}
      {!isLoading && !error && notifications.length > 0 && (
        <ul>
          {notifications.map((notification) => {
            const { icon, message } = getNotificationDetails(notification, t); // t fonksiyonunu geçir
            // *** Dil seçimine göre locale kullan ***
            const locale = i18n.language === 'tr' ? tr : enUS;
            const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: locale });

            return (
              <li
                key={notification.notificationId}
                className={`border-b border-gray-700 last:border-b-0 ${!notification.isRead ? 'bg-gray-700/50 hover:bg-gray-600/70' : 'hover:bg-gray-700/50'}`}
              >
                <button
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full text-left px-4 py-3 flex items-start space-x-3 transition-colors duration-150 ease-in-out"
                  title={message}
                >
                  <span className="mt-1 flex-shrink-0 w-5 h-5 flex items-center justify-center">{icon}</span>
                  <div className="flex-1">
                    <p className={`text-sm ${!notification.isRead ? 'text-gray-100' : 'text-gray-300'}`}>
                      {message}
                    </p>
                    <p className={`text-xs mt-1 ${!notification.isRead ? 'text-cyan-400' : 'text-gray-500'}`}>
                      {timeAgo}
                    </p>
                  </div>
                   {!notification.isRead && (
                        <span className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 mt-1.5" aria-label="Okunmadı"></span>
                    )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default NotificationsDropdown;
