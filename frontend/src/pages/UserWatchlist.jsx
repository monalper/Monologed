import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

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
        const response = await api.get(`/api/users/${username}/watchlist`);
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

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default UserWatchlist; 