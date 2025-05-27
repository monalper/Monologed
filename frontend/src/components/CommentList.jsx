// src/components/CommentList.jsx
import React from 'react';

function CommentList({ comments }) {
    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Yorumlar</h3>
            {comments.length > 0 ? (
                <ul className="space-y-4">
                    {comments.map(comment => (
                        <li key={comment.commentId} className="p-4 border rounded-md bg-gray-50">
                            <p className="font-semibold">{comment.username}</p>
                            <p className="text-gray-700">{comment.text}</p>
                            <p className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500">Henüz hiç yorum yok.</p>
            )}
        </div>
    );
}

export default CommentList;