// frontend/src/components/CommentForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function CommentForm({ movieId, onCommentAdded }) {
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const { token } = useAuth();

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!text.trim()) {
            setError("Yorum metni boş olamaz.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await axios.post(
                `http://localhost:5000/api/logs/${movieId}/comments`,
                { text: text },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.status === 201) {
                console.log("Yorum başarıyla eklendi:", response.data.comment);
                onCommentAdded(response.data.comment); // Yeni yorumu üst bileşene gönder
                setText(''); // Formu temizle
            } else {
                setError("Yorum eklenirken bir hata oluştu.");
                console.error("Yorum eklenirken hata:", response.data);
            }
        } catch (error) {
            console.error("Yorum ekleme hatası:", error);
            setError("Yorum eklenirken bir hata oluştu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mb-4">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Yorumunuzu yazın..."
                className="w-full p-2 border rounded-md shadow-sm focus:ring focus:ring-blue-200 focus:outline-none"
                rows="3"
                required
            ></textarea>
            <div className="flex justify-end mt-2">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
                </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>
    );
}

export default CommentForm;