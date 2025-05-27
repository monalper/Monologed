import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FaSpinner, FaTrash, FaEllipsisH, FaCheckCircle } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import PostItem from '../components/PostItem';

function PostDetailPage() {
    const { postId } = useParams();
    const { t, i18n } = useTranslation();
    const { token, user: loggedInUser } = useAuth();
    const navigate = useNavigate();

    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isCommenting, setIsCommenting] = useState(false);
    const [error, setError] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [commentImage, setCommentImage] = useState(null);
    const [commentImagePreview, setCommentImagePreview] = useState(null);

    const DEFAULT_AVATAR_URL = 'https://journal-app-avatars.s3.eu-north-1.amazonaws.com/avatars/SPRK_default_preset_name_custom+%E2%80%93+1.svg';

    // Post detaylarını yükle
    useEffect(() => {
        const fetchPost = async () => {
            try {
                const response = await axios.get(`/api/logs/${postId}`);
                setPost(response.data.log);
                await loadComments();
            } catch (error) {
                console.error("Post yüklenirken hata:", error);
                setError(t('post_detail_error', 'Post yüklenirken bir hata oluştu.'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchPost();
    }, [postId, t]);

    // Yorumları yükle
    const loadComments = async () => {
        try {
            const response = await axios.get(`/api/logs/${postId}/comments`);
            setComments(response.data.comments || []);
        } catch (error) {
            console.error("Yorumlar yüklenirken hata:", error);
            setError(t('post_item_comments_load_error'));
        }
    };

    // Yorum ekle
    const handleAddComment = async () => {
        if (!token || !newComment.trim() || isCommenting) return;
        setIsCommenting(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('text', newComment.trim());
            if (commentImage) {
                formData.append('image', commentImage);
            }
            const response = await axios.post(`/api/logs/${postId}/comments`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setComments(prev => [response.data.comment, ...prev]);
            setNewComment('');
            setCommentImage(null);
            setCommentImagePreview(null);
        } catch (error) {
            console.error("Yorum eklenirken hata:", error);
            setError(t('post_item_comment_add_error'));
        } finally {
            setIsCommenting(false);
        }
    };

    // Yorum sil
    const handleDeleteComment = async (commentId) => {
        if (!token || !commentId) return;
        
        try {
            await axios.delete(`/api/logs/${postId}/comments/${commentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setComments(prev => prev.filter(comment => comment.commentId !== commentId));
        } catch (error) {
            console.error("Yorum silinirken hata:", error);
            setError(t('post_item_comment_delete_error'));
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <FaSpinner className="animate-spin text-4xl text-yellow-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 bg-yellow-500 text-black rounded-full hover:bg-yellow-600 transition-colors"
                >
                    {t('post_detail_back', 'Geri Dön')}
                </button>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-gray-400 mb-4">{t('post_detail_not_found', 'Post bulunamadı.')}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 bg-yellow-500 text-black rounded-full hover:bg-yellow-600 transition-colors"
                >
                    {t('post_detail_back', 'Geri Dön')}
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            {/* Post */}
            <PostItem post={post} />

            {/* Yorum Formu */}
            <div className="mt-8 bg-neutral-900 rounded-3xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                    {t('post_detail_comments_title', 'Yorumlar')}
                </h2>
                
                <div className="mb-6">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={t('post_item_comment_placeholder')}
                        className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-gray-700 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 resize-none"
                        rows="3"
                        maxLength={500}
                    />
                    <div className="flex items-center mt-2 gap-4">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                    const file = e.target.files[0];
                                    setCommentImage(file || null);
                                    setCommentImagePreview(file ? URL.createObjectURL(file) : null);
                                }}
                            />
                            <span className="px-3 py-1 bg-neutral-800 text-gray-300 rounded-full border border-gray-600 hover:bg-neutral-700 transition-colors text-sm">
                                {t('post_item_comment_image', 'Görsel Ekle')}
                            </span>
                        </label>
                        {commentImagePreview && (
                            <div className="relative">
                                <img src={commentImagePreview} alt="Önizleme" className="w-16 h-16 object-cover rounded-lg border border-gray-700" />
                                <button
                                    type="button"
                                    onClick={() => { setCommentImage(null); setCommentImagePreview(null); }}
                                    className="absolute -top-2 -right-2 bg-black bg-opacity-70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                        <div className="flex-1 flex justify-end">
                            <button
                                onClick={handleAddComment}
                                disabled={isCommenting || !newComment.trim()}
                                className="px-4 py-2 text-sm bg-yellow-500 text-black rounded-full hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCommenting ? (
                                    <>
                                        <FaSpinner className="animate-spin inline-block mr-2" />
                                        {t('post_item_comment_sending')}
                                    </>
                                ) : (
                                    t('post_item_comment_send')
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Yorum Listesi */}
                {comments.length === 0 ? (
                    <div className="text-gray-400 text-center py-4">
                        {t('post_item_no_comments')}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map(comment => (
                            <div key={comment.commentId} className="flex items-start space-x-3">
                                <img
                                    src={comment.userInfo?.avatarUrl || DEFAULT_AVATAR_URL}
                                    alt={comment.userInfo?.username || 'Kullanıcı'}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-semibold text-white flex items-center gap-1">
                                                {comment.userInfo?.displayName || comment.userInfo?.username}
                                                {comment.userInfo?.isVerified && (
                                                    <FaCheckCircle className="inline-block text-blue-500 ml-1" title="Doğrulanmış kullanıcı" />
                                                )}
                                            </span>
                                            {comment.userInfo?.displayName && comment.userInfo?.username && (
                                                <span className="text-gray-400 text-sm ml-2">
                                                    @{comment.userInfo.username}
                                                </span>
                                            )}
                                            <span className="text-gray-400 text-sm ml-2">
                                                {formatDistanceToNow(new Date(comment.createdAt), {
                                                    addSuffix: true,
                                                    locale: i18n.language === 'tr' ? tr : enUS
                                                })}
                                            </span>
                                        </div>
                                        {(loggedInUser?.userId === comment.userId || loggedInUser?.userId === post.userId) && (
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowDeleteConfirm(showDeleteConfirm === comment.commentId ? null : comment.commentId)}
                                                    className="text-gray-400 hover:text-white p-1"
                                                >
                                                    <FaEllipsisH className="w-4 h-4" />
                                                </button>
                                                
                                                {showDeleteConfirm === comment.commentId && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-neutral-800 rounded-lg shadow-lg py-1 z-10">
                                                        <button
                                                            onClick={() => {
                                                                handleDeleteComment(comment.commentId);
                                                                setShowDeleteConfirm(null);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-neutral-700"
                                                        >
                                                            {t('post_item_comment_delete')}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-white mt-1">{comment.text}</p>
                                    {comment.imageUrl && (
                                        <img
                                            src={comment.imageUrl}
                                            alt="Yorum görseli"
                                            className="mt-2 max-h-60 rounded-lg border border-gray-700"
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PostDetailPage; 