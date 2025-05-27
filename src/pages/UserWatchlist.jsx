import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const UserWatchlist = () => {
  const { username } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [userWatchlist, setUserWatchlist] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserWatchlist = async () => {
      try {
        const response = await axios.get(`/api/users/${username}/watchlist`);
        setUserInfo(response.data.userInfo);
        setUserWatchlist(response.data.watchlist);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || t('error_fetching_watchlist'));
        setLoading(false);
      }
    };

    fetchUserWatchlist();
  }, [username, t]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {t('userWatchlist.title', { username })}
            </h1>
            {userInfo && (
              <p className="text-gray-600 mt-2">
                {t('userWatchlist.stats', {
                  count: userWatchlist.length,
                  username: username
                })}
              </p>
            )}
          </div>
          {currentUser?.username === username && (
            <button
              onClick={() => navigate('/watchlist')}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
            >
              {t('userWatchlist.editMyList')}
            </button>
          )}
        </div>
      </div>

      {userWatchlist.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {t('userWatchlist.empty', { username })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {userWatchlist.map((item) => (
            <div
              key={item.id}
              className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
            >
              <img
                src={item.poster_path}
                alt={item.title}
                className="w-full h-auto object-cover"
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-gray-400 text-sm mt-1">
                  {item.release_date?.split('-')[0] || 'TBA'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserWatchlist; 