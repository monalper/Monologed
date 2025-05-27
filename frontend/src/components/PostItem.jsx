// src/components/PostItem.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// <<< YENİ: FaCheckCircle kaldırıldı, VerifiedIcon import edildi >>>
import { FaRegHeart, FaHeart, FaRegCommentAlt, FaUserCircle, FaLink, FaQuoteLeft, FaTrash, FaSpinner, FaTimesCircle, FaEllipsisV, FaEdit, FaReply } from 'react-icons/fa';
import { FcLike, FcComments } from 'react-icons/fc';
import VerifiedIcon from '../assets/logedelements/Verified.svg'; // SVG ikonu
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { HiOutlineChatBubbleLeft } from 'react-icons/hi2';
import { MdFavoriteBorder, MdFavorite } from 'react-icons/md';

const DEFAULT_AVATAR_URL = 'https://journal-app-avatars.s3.eu-north-1.amazonaws.com/avatars/SPRK_default_preset_name_custom+%E2%80%93+1.svg';

function PostItem({ post, onDelete, isPinned, onPin, onUnpin, isOwnProfile, onEdit }) {
    const { t, i18n } = useTranslation();
    const { token, user: loggedInUser } = useAuth();
    const navigate = useNavigate();

    const {
        logId,
        userId,
        userInfo,
        postType,
        postText,
        imageUrl,
        linkedContentId,
        linkedContentType,
        linkedContentTitle,
        createdAt,
        likeCount: initialLikeCount = 0
    } = post;

    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [likeStatusLoading, setLikeStatusLoading] = useState(true);
    const [likeActionLoading, setLikeActionLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editText, setEditText] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editError, setEditError] = useState(null);
    const dropdownRef = useRef(null);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [commentError, setCommentError] = useState(null);
    const commentsRef = useRef(null);

    // DisplayName ve username ayırımı
    const displayName = userInfo?.name || userInfo?.username || (loggedInUser?.userId === userId ? (loggedInUser?.name || loggedInUser?.username) : t('log_item_unknown_user'));
    const postUsername = userInfo?.username || (loggedInUser?.userId === userId ? loggedInUser?.username : t('log_item_unknown_user'));
    const postUserAvatar = userInfo?.avatarUrl || null;
    // <<< YENİ: isPostUserVerified userInfo'dan alınır >>>
    const isPostUserVerified = userInfo?.isVerified ?? false;
    const userProfileLink = userId ? `/user/${userId}` : '#';
    const isOwnPost = loggedInUser?.userId === userId;

    let timeAgo = t('log_item_time_unknown');
    if (createdAt) {
        try {
            const locale = i18n.language === 'tr' ? tr : enUS;
            timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: locale });
        } catch (e) { console.error("createdAt tarih formatı hatası (PostItem):", e); }
    }

     useEffect(() => {
         let isMounted = true;
         if (token && logId) {
             const checkStatus = async () => {
                 setLikeStatusLoading(true);
                 try {
                     const response = await axios.get(`/api/logs/${logId}/like/status`, { headers: { Authorization: `Bearer ${token}` } });
                      if (isMounted) setIsLiked(response.data.isLiked);
                 } catch (err) { console.error("Like status check error (PostItem):", err); if (isMounted) setIsLiked(false); }
                 finally { if (isMounted) setLikeStatusLoading(false); }
             };
              const fetchLikeCount = async () => {
                  try {
                      const response = await axios.get(`/api/logs/${logId}/likes`);
                      if (isMounted) setLikeCount(response.data.likeCount || 0);
                  } catch(err) {
                      console.error("Like count fetch error (PostItem):", err);
                      if (isMounted) setLikeCount(initialLikeCount);
                  }
              };
             checkStatus();
             fetchLikeCount();
         } else {
             setIsLiked(false);
             setLikeCount(initialLikeCount);
             setLikeStatusLoading(false);
         }
          return () => { isMounted = false; };
     }, [logId, initialLikeCount, token]);

    const handleLikeToggle = useCallback(async () => {
         if (!token || likeActionLoading || likeStatusLoading || !logId) return;
         setLikeActionLoading(true);
         const currentLikedStatus = isLiked;
         setIsLiked(!currentLikedStatus);
         setLikeCount(prev => currentLikedStatus ? Math.max(0, prev - 1) : prev + 1);
         try {
             const headers = { Authorization: `Bearer ${token}` };
             let response;
             if (currentLikedStatus) { response = await axios.delete(`/api/logs/${logId}/like`, { headers }); }
             else { response = await axios.post(`/api/logs/${logId}/like`, {}, { headers }); }
             if (response.data && response.data.likeCount !== undefined) {
                setLikeCount(response.data.likeCount);
             }
         } catch (error) {
             console.error("Like toggle error (PostItem):", error);
             setIsLiked(currentLikedStatus);
             setLikeCount(prev => currentLikedStatus ? prev + 1 : Math.max(0, prev - 1));
         } finally { setLikeActionLoading(false); }
    }, [token, logId, isLiked, likeActionLoading, likeStatusLoading]);

    const handleDeletePost = useCallback(async () => {
        if (!token || !isOwnPost || isDeleting || !logId) return;
        if (!window.confirm(t('post_item_delete_confirm', 'Bu gönderiyi silmek istediğinizden emin misiniz?'))) {
            return;
        }
        setIsDeleting(true);
        try {
            await axios.delete(`/api/logs/${logId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (onDelete) {
                onDelete(logId);
            }
            // Silme işlemi başarılı olduğunda dropdown'u kapat
            setDropdownOpen(false);
        } catch (error) {
            console.error("Gönderi silme hatası (PostItem):", error);
            alert(t('post_item_delete_error', 'Gönderi silinirken bir hata oluştu.'));
        } finally {
            setIsDeleting(false);
        }
    }, [token, isOwnPost, isDeleting, logId, t, onDelete]);

    // Dışarı tıklanınca dropdown'u kapat
    useEffect(() => {
      function handleClickOutside(event) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setDropdownOpen(false);
        }
      }
      if (dropdownOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      } else {
        document.removeEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [dropdownOpen]);

    // Fotoğrafı kaydet fonksiyonu
    const handleSaveImage = useCallback(() => {
      if (imageUrl) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = imageUrl.split('/').pop() || 'image.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }, [imageUrl]);

    const linkedContentLink = linkedContentId && linkedContentType
        ? (linkedContentType === 'movie' ? `/movie/${linkedContentId}` : `/tv/${linkedContentId}`)
        : null;

    // Post metnini düzenleme fonksiyonu
    const handleEditPost = useCallback(async () => {
        if (!token || !logId || isEditing || !editText.trim()) return;
        
        setIsEditing(true);
        setEditError(null);
        
        try {
            const response = await axios.put(`/api/logs/${logId}`, {
                postText: editText.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (onEdit) {
                onEdit(logId, response.data);
            }
            setShowEditModal(false);
        } catch (error) {
            console.error("Gönderi düzenleme hatası:", error);
            setEditError(t('post_item_edit_error', 'Gönderi düzenlenirken bir hata oluştu.'));
        } finally {
            setIsEditing(false);
        }
    }, [token, logId, isEditing, editText, t, onEdit]);

    // Modal açıldığında mevcut metni set et
    useEffect(() => {
        if (showEditModal) {
            setEditText(postText || '');
        }
    }, [showEditModal, postText]);

    // Yorumları yükle
    const loadComments = useCallback(async () => {
        if (!token || !logId) return;
        setIsLoadingComments(true);
        setCommentError(null);
        try {
            const response = await axios.get(`/api/logs/${logId}/comments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setComments(response.data.comments || []);
        } catch (error) {
            console.error("Yorumlar yüklenirken hata:", error);
            setCommentError(t('post_item_comments_load_error', 'Yorumlar yüklenirken bir hata oluştu.'));
        } finally {
            setIsLoadingComments(false);
        }
    }, [token, logId, t]);

    // Yorum ekle
    const handleAddComment = useCallback(async () => {
        if (!token || !logId || !newComment.trim() || isCommenting) return;
        setIsCommenting(true);
        setCommentError(null);
        try {
            const response = await axios.post(`/api/logs/${logId}/comments`, {
                text: newComment.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setComments(prev => [response.data.comment, ...prev]);
            setNewComment('');
        } catch (error) {
            console.error("Yorum eklenirken hata:", error);
            setCommentError(t('post_item_comment_add_error', 'Yorum eklenirken bir hata oluştu.'));
        } finally {
            setIsCommenting(false);
        }
    }, [token, logId, newComment, isCommenting, t]);

    // Yorum sil
    const handleDeleteComment = useCallback(async (commentId) => {
        if (!token || !logId || !commentId) return;
        try {
            await axios.delete(`/api/logs/${logId}/comments/${commentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setComments(prev => prev.filter(comment => comment.commentId !== commentId));
        } catch (error) {
            console.error("Yorum silinirken hata:", error);
            setCommentError(t('post_item_comment_delete_error', 'Yorum silinirken bir hata oluştu.'));
        }
    }, [token, logId, t]);

    // Yorumları göster/gizle
    const toggleComments = useCallback(() => {
        setShowComments(prev => !prev);
        if (!showComments) {
            loadComments();
        }
    }, [showComments, loadComments]);

    return (
        <>
        {/* Fotoğraf Modalı */}
        {showImageModal && imageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowImageModal(false)}>
            <div className="relative max-w-3xl w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <button
                className="absolute top-2 right-2 text-white bg-black/60 rounded-full p-2 hover:bg-black/80 z-10"
                onClick={() => setShowImageModal(false)}
                aria-label="Kapat"
              >
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
              <img src={imageUrl} alt="Tam boy fotoğraf" className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl" />
            </div>
          </div>
        )}
        {/* Düzenleme Modalı */}
        {showEditModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowEditModal(false)}>
                <div className="relative max-w-2xl w-full mx-4 bg-neutral-900 rounded-2xl shadow-xl" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-gray-700">
                        <h3 className="text-lg font-semibold text-white">{t('post_item_edit_title', 'Gönderiyi Düzenle')}</h3>
                    </div>
                    <div className="p-4">
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full h-32 p-3 bg-neutral-800 text-white rounded-lg border border-gray-700 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 resize-none"
                            placeholder={t('post_form_placeholder', 'Ne düşünüyorsun?')}
                            maxLength={500}
                        />
                        {editError && (
                            <p className="mt-2 text-sm text-red-500">{editError}</p>
                        )}
                    </div>
                    <div className="p-4 border-t border-gray-700 flex justify-end space-x-3">
                        <button
                            onClick={() => setShowEditModal(false)}
                            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                        >
                            {t('post_item_edit_cancel', 'İptal')}
                        </button>
                        <button
                            onClick={handleEditPost}
                            disabled={isEditing || !editText.trim()}
                            className="px-4 py-2 text-sm bg-yellow-500 text-black rounded-full hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isEditing ? (
                                <>
                                    <FaSpinner className="animate-spin inline-block mr-2" />
                                    {t('post_item_edit_saving', 'Kaydediliyor...')}
                                </>
                            ) : (
                                t('post_item_edit_save', 'Kaydet')
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}
        <div className="bg-neutral-900 rounded-3xl shadow-xl px-8 py-7 sm:px-10 sm:py-8 w-full max-w-3xl relative group my-1 mx-auto min-h-[180px]">
            {/* Üst Bilgi */}
            <div className="flex items-center mb-2">
              <Link to={userProfileLink}>
                <img src={postUserAvatar || DEFAULT_AVATAR_URL} alt={`${postUsername} Avatar`} className="w-12 h-12 rounded-full mr-3 border-neutral-800 object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <span className="font-bold text-white text-[17px] mr-2 truncate leading-tight">{displayName}</span>
                  {isPostUserVerified && (
                    <img src={VerifiedIcon} alt={t('verified_account')} className="w-4 h-4 ml-1 align-baseline inline-block" title={t('verified_account')} />
                  )}
                </div>
                <div className="text-gray-400 text-sm truncate leading-tight">
                  @{postUsername} · {timeAgo}
                </div>
              </div>
              {/* Dropdown Menü */}
              {isOwnProfile && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    className="text-gray-400 hover:text-gray-200 p-2 ml-2 focus:outline-none"
                    onClick={() => setDropdownOpen((v) => !v)}
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                    aria-label="Daha fazla seçenek"
                  >
                    <FaEllipsisV className="w-5 h-5" />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-36 bg-neutral-800 border border-gray-700 rounded-xl shadow-lg z-20 animate-fadeIn">
                      {/* Düzenle butonu */}
                      <button
                        onClick={() => { setDropdownOpen(false); setShowEditModal(true); }}
                        className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-blue-900/20 transition-colors"
                      >
                        ✏️ {t('dropdown_edit_post', 'Düzenle')}
                      </button>
                      {/* Pinle/Sabit Kaldır */}
                      {!isPinned && (
                        <button
                          onClick={() => { setDropdownOpen(false); onPin && onPin(post.logId); }}
                          className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-yellow-900/20 transition-colors"
                        >
                          📌 {t('dropdown_pin', 'Pinle')}
                        </button>
                      )}
                      {isPinned && (
                        <button
                          onClick={() => { setDropdownOpen(false); onUnpin && onUnpin(post.logId); }}
                          className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-yellow-900/20 transition-colors"
                        >
                          �� {t('dropdown_unpin', 'Sabit Kaldır')}
                        </button>
                      )}
                      {/* Diğer dropdown seçenekleri */}
                      {imageUrl && (
                        <button
                          onClick={() => { setDropdownOpen(false); handleSaveImage(); }}
                          className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-cyan-900/20 transition-colors"
                        >
                          💾 {t('dropdown_save_image', 'Fotoğrafı Kaydet')}
                        </button>
                      )}
                      {isOwnPost && (
                        <button
                          onClick={() => { setDropdownOpen(false); handleDeletePost(); }}
                          disabled={isDeleting}
                          className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? <FaSpinner className="animate-spin w-4 h-4 mr-2" /> : '🗑️'}
                          {t('dropdown_delete_post', 'Gönderiyi Sil')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Post Metni */}
            {postText && (
              <div className="text-white text-[15px] mb-3 leading-relaxed">
                {postText}
              </div>
            )}
            {/* Görsel */}
            {imageUrl && (
              <div className="mb-3">
                <img
                  src={imageUrl}
                  alt={t('post_item_image_alt', 'Gönderi fotoğrafı')}
                  className="rounded-2xl w-full object-cover max-h-72 cursor-pointer border border-gray-700 hover:opacity-90 transition"
                  loading="lazy"
                  onClick={() => setShowImageModal(true)}
                />
              </div>
            )}
            {/* Alt Bilgi */}
            <div className="flex items-center justify-between mt-1">
              {linkedContentLink && linkedContentTitle && (
                <span className="text-gray-400 text-sm">
                  <span className="font-semibold">{linkedContentType === 'movie' ? t('post_item_linked_movie', 'Film:') : t('post_item_linked_tv', 'Dizi:')}</span> {linkedContentTitle}
                </span>
              )}
              <div className="flex items-center space-x-4">
                {/* Yorum butonu */}
                <button 
                    onClick={() => navigate(`/post/${logId}`)}
                    className="flex items-center" 
                    title={t('log_item_comment_tooltip')}
                >
                    <HiOutlineChatBubbleLeft className="w-5 h-5 text-gray-400" />
                    <span className="text-[15px] ml-1 text-gray-400">
                        {comments.length > 0 ? comments.length : ''}
                    </span>
                </button>
                {/* Beğen butonu */}
                <button
                  onClick={handleLikeToggle}
                  disabled={!token || likeActionLoading || likeStatusLoading}
                  className={`flex items-center disabled:opacity-60`}
                  title={isLiked ? t('log_item_unlike_tooltip') : t('log_item_like_tooltip')}
                >
                  {isLiked ? (
                    <MdFavorite className="w-5 h-5 text-pink-500" />
                  ) : (
                    <MdFavoriteBorder className="w-5 h-5 text-gray-400" />
                  )}
                  <span className={`text-[15px] ml-1 font-normal ${isLiked ? 'text-pink-500' : 'text-gray-400'}`}>
                    {likeStatusLoading ? '...' : likeCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Yorumlar Bölümü */}
            {showComments && (
                <div className="mt-4 border-t border-gray-700 pt-4">
                    {/* Yorum Formu */}
                    <div className="mb-4">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={t('post_item_comment_placeholder', 'Yorumunuzu yazın...')}
                            className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-gray-700 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 resize-none"
                            rows="2"
                            maxLength={500}
                        />
                        <div className="flex justify-end mt-2">
                            <button
                                onClick={handleAddComment}
                                disabled={isCommenting || !newComment.trim()}
                                className="px-4 py-2 text-sm bg-yellow-500 text-black rounded-full hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCommenting ? (
                                    <>
                                        <FaSpinner className="animate-spin inline-block mr-2" />
                                        {t('post_item_comment_sending', 'Gönderiliyor...')}
                                    </>
                                ) : (
                                    t('post_item_comment_send', 'Yorum Yap')
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Yorum Listesi */}
                    {isLoadingComments ? (
                        <div className="flex justify-center py-4">
                            <FaSpinner className="animate-spin text-gray-400" />
                        </div>
                    ) : commentError ? (
                        <div className="text-red-500 text-sm text-center py-2">{commentError}</div>
                    ) : comments.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center py-2">
                            {t('post_item_no_comments', 'Henüz yorum yapılmamış. İlk yorumu siz yapın!')}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {comments.map(comment => (
                                <div key={comment.commentId} className="flex items-start space-x-3">
                                    <Link to={`/user/${comment.userId}`}>
                                        {comment.userAvatar ? (
                                            <img src={comment.userAvatar} alt={comment.username} className="w-8 h-8 rounded-full" />
                                        ) : (
                                            <img src={DEFAULT_AVATAR_URL} alt={comment.username} className="w-8 h-8 rounded-full" />
                                        )}
                                    </Link>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Link to={`/user/${comment.userId}`} className="font-semibold text-white hover:underline">
                                                    {comment.displayName || comment.username}
                                                </Link>
                                                <span className="text-gray-400 text-sm ml-2">
                                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: i18n.language === 'tr' ? tr : enUS })}
                                                </span>
                                            </div>
                                            {(loggedInUser?.userId === comment.userId || isOwnPost) && (
                                                <button
                                                    onClick={() => handleDeleteComment(comment.commentId)}
                                                    className="text-gray-400 hover:text-red-500"
                                                    title={t('post_item_comment_delete', 'Yorumu Sil')}
                                                >
                                                    <FaTrash className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-white mt-1">{comment.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
        </>
    );
}

export default PostItem;
