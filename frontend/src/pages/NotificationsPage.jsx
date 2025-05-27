import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { FaSpinner, FaBellSlash, FaCheckCircle, FaUserPlus, FaHeart, FaComment, FaUserCircle } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const getNotificationDetails = (notification, t) => {
  const actor = notification.actorUsername ? `@${notification.actorUsername}` : t('notifications_dropdown_actor_unknown');
  switch (notification.type) {
    case 'NEW_FOLLOWER':
      return {
        icon: <FaUserPlus className="text-blue-400" />,
        message: t('notifications_dropdown_type_follow', { actor }),
        link: `/user/${notification.actorUserId}`
      };
    case 'NEW_LIKE':
      return {
        icon: <FaHeart className="text-red-400" />,
        message: t('notifications_dropdown_type_like', { actor }),
        link: `/log/${notification.entityId}`
      };
    case 'NEW_COMMENT':
      return {
        icon: <FaComment className="text-green-400" />,
        message: t('notifications_dropdown_type_comment', { actor }),
        link: `/log/${notification.entityId}`
      };
    case 'NEW_ACHIEVEMENT':
      return {
        icon: <FaCheckCircle className="text-yellow-400" />,
        message: t('notifications_dropdown_type_achievement'),
        link: `/user/${notification.userId}`
      };
    default:
      return {
        icon: <FaBellSlash className="text-gray-500" />,
        message: t('notifications_dropdown_type_unknown'),
        link: '#'
      };
  }
};

const DEFAULT_AVATAR_URL = 'https://journal-app-avatars.s3.eu-north-1.amazonaws.com/avatars/SPRK_default_preset_name_custom+%E2%80%93+1.svg';

function NotificationsPage({ setUnreadCount }) {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true); setError(null);
    if (!token) {
      setIsLoading(false);
      setError(t('activity_feed_error_auth'));
      setNotifications([]);
      return;
    }
    try {
      const response = await axios.get('/api/notifications?all=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data?.notifications || []);
    } catch (err) {
      setError(t('notifications_dropdown_error'));
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, t]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Bildirimler yüklendikten sonra okunmamışları okundu olarak işaretle
  useEffect(() => {
    if (!token || notifications.length === 0) return;
    const unread = notifications.filter(n => !n.isRead).map(n => ({ createdAt: n.createdAt, notificationId: n.notificationId }));
    if (unread.length === 0) return;
    axios.put('/api/notifications/mark-read', { notificationIds: unread }, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => {
      setNotifications(prev => prev.map(n => unread.some(u => u.notificationId === n.notificationId) ? { ...n, isRead: true } : n));
      if (setUnreadCount) setUnreadCount(0);
    }).catch(() => {/* hata durumunda sessizce geç */});
  }, [token, notifications, setUnreadCount]);

  const handleNotificationClick = (notification) => {
    const { link } = getNotificationDetails(notification, t);
    if (link && link !== '#') { navigate(link); }
  };

  const locale = i18n.language === 'tr' ? tr : enUS;

  return (
    <div className="min-h-screen bg-black w-full py-10 px-2">
      <div className="max-w-2xl mx-auto bg-[#181818] rounded-3xl shadow-lg p-4 sm:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center flex items-center justify-center gap-2">
          <FaCheckCircle className="text-brand text-2xl" /> {t('notifications_dropdown_title')}
        </h1>
        {isLoading ? (
          <div className="flex justify-center items-center py-12 text-gray-400">
            <FaSpinner className="animate-spin mr-2 text-yellow-500" /> {t('notifications_dropdown_loading')}
          </div>
        ) : error ? (
          <div className="text-center text-red-400 py-8">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-500">
            <FaBellSlash className="text-4xl mb-2" />
            <div>{t('notifications_dropdown_empty')}</div>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {notifications.map((notification) => {
              const { icon, message } = getNotificationDetails(notification, t);
              const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale });
              const actorAvatarUrl = notification.actorAvatarUrl;
              return (
                <li
                  key={notification.notificationId}
                  className={`relative flex items-center gap-4 p-4 rounded-2xl shadow-md bg-neutral-900 transition-all duration-200 border border-transparent hover:shadow-xl hover:-translate-y-0.5 cursor-pointer group ${!notification.isRead ? 'ring-2 ring-yellow-500/40 border-yellow-700/40' : 'hover:border-gray-700'}`}
                  onClick={() => handleNotificationClick(notification)}
                  title={message}
                >
                  {!notification.isRead && (
                    <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-500 rounded-l-2xl" />
                  )}
                  <div className="flex-shrink-0 z-10">
                    {actorAvatarUrl ? (
                      <img src={actorAvatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-yellow-600/60 group-hover:border-yellow-400 transition-colors" />
                    ) : (
                      <img src={DEFAULT_AVATAR_URL} alt="Varsayılan Profil" className="w-10 h-10 rounded-full object-cover border-2 border-yellow-600/60 group-hover:border-yellow-400 transition-colors" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{icon}</span>
                      <span className={`text-sm md:text-base font-medium ${!notification.isRead ? 'text-white' : 'text-gray-300'}`}>{message}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-800 rounded-full text-gray-400 font-mono">{timeAgo}</span>
                      {!notification.isRead && (
                        <span className="ml-2 w-2 h-2 bg-yellow-400 rounded-full" aria-label="Okunmadı"></span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage; 