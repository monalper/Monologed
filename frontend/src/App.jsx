// src/App.jsx
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import axios from 'axios';
import './App.css';
import { useTranslation } from 'react-i18next';

// Sayfaları ve Bileşenleri import et
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import MovieDetailPage from './pages/MovieDetailPage';
import TvShowDetailPage from './pages/TvShowDetailPage';
import SeasonDetailPage from './pages/SeasonDetailPage';
import UserLogsPage from './pages/UserLogsPage';
import SearchResultsPage from './pages/SearchResultsPage';
import CreateListPage from './pages/CreateListPage';
import MyListsPage from './pages/MyListsPage';
import ListPage from './pages/ListPage';
import WatchlistPage from './pages/WatchlistPage';
import PublicProfilePage from './pages/PublicProfilePage';
import PublicUserStatsPage from './pages/PublicUserStatsPage';
import ActivityFeedPage from './pages/ActivityFeedPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import NotFoundPage from './pages/NotFoundPage';
import AuthOptionsPage from './pages/AuthOptionsPage';
import PageLayout from './components/PageLayout';
import NotificationsDropdown from './components/NotificationsDropdown';
import Footer from './components/Footer';
import AboutPage from './pages/AboutPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import AdminPage from './pages/AdminPage';
import UserAchievementsPage from './pages/UserAchievementsPage';
import LetterboxdImportPage from './pages/LetterboxdImportPage';
import EditorialListPage from './pages/EditorialListPage'; // Editöryel Liste Detay Sayfası
import EditorialDisplayPage from './pages/EditorialDisplayPage'; // YENİ: Editöryel Sayfa Görüntüleme
import NotificationsPage from './pages/NotificationsPage';
import PostDetailPage from './pages/PostDetailPage';
import AdminEditorialTopListPage from './pages/AdminEditorialTopListPage';
import Guide from './pages/Guide';
import WatchlistPreviewPage from './pages/WatchlistPreviewPage';

// React Icons
import { FaSearch, FaTimes, FaRegBell, FaCheckCircle, FaBars, FaTimesCircle, FaFilm, FaTv, FaUserShield, FaGlobe } from 'react-icons/fa';

// Logo importu
import siteLogo from './assets/logedelements/logo.png';

// Sabitler ve hook'lar
const SUGGESTION_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w92';
const PLACEHOLDER_SUGGESTION_POSTER = 'https://via.placeholder.com/92x138.png?text=N/A';
const DEFAULT_AVATAR_URL = 'https://journal-app-avatars.s3.eu-north-1.amazonaws.com/avatars/SPRK_default_preset_name_custom+%E2%80%93+1.svg';

// Debounce hook'u
function useDebounce(callback, delay) {
  const timeoutRef = useRef(null);
  useEffect(() => {
    return () => { if (timeoutRef.current) { clearTimeout(timeoutRef.current); } };
  }, []);
  return useCallback((...args) => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); }
    timeoutRef.current = setTimeout(() => { callback(...args); }, delay);
  }, [callback, delay]);
}

// Dil Değiştirici Bileşeni
function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="p-2 rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Change language"
      >
        <FaGlobe className="h-5 w-5" />
      </button>
      {isOpen && (
        <div
          ref={dropdownRef}
          className="origin-top-right absolute right-0 mt-2 w-36 rounded-md shadow-lg py-1 bg-gray-800/95 backdrop-blur-sm ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-600 z-[60]"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="language-menu-button"
        >
          <button
            onClick={() => changeLanguage('en')}
            className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
              i18n.language === 'en'
                ? 'bg-gray-700 text-white font-semibold'
                : 'text-gray-200 hover:text-white hover:bg-gray-700/60'
            }`}
            role="menuitem"
          >
            English
          </button>
          <button
            onClick={() => changeLanguage('tr')}
            className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
              i18n.language === 'tr'
                ? 'bg-gray-700 text-white font-semibold'
                : 'text-gray-200 hover:text-white hover:bg-gray-700/60'
            }`}
            role="menuitem"
          >
            Türkçe
          </button>
        </div>
      )}
    </div>
  );
}


function App() {
  const { token, user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsError, setNotificationsError] = useState(null);

  const profileDropdownRef = useRef(null);
  const profileButtonRef = useRef(null);
  const notificationsDropdownRef = useRef(null);
  const notificationsButtonRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchIconRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target) && profileButtonRef.current && !profileButtonRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target) && notificationsButtonRef.current && !notificationsButtonRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && mobileMenuButtonRef.current && !mobileMenuButtonRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
      if (
        isSearchExpanded &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target) &&
        searchIconRef.current &&
        !searchIconRef.current.contains(event.target) &&
        (!suggestionsRef.current || !suggestionsRef.current.contains(event.target))
      ) {
        setIsSearchExpanded(false);
        setSuggestions([]);
        setSuggestionsError(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchExpanded]);

  const fetchSuggestions = useCallback(async (term) => {
    const trimmedTerm = term.trim();
    if (trimmedTerm.length < 2) {
      setSuggestions([]); setSuggestionsLoading(false); setSuggestionsError(null); return;
    }
    setSuggestionsLoading(true); setSuggestionsError(null); setSuggestions([]);
    try {
      const response = await axios.get(`/api/suggestions?query=${encodeURIComponent(trimmedTerm)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.data && Array.isArray(response.data)) {
        setSuggestions(response.data);
      } else {
        setSuggestions([]);
        setSuggestionsError(t('error_suggestions_format'));
      }
    } catch (error) {
      setSuggestions([]);
      setSuggestionsError(t('error_suggestions_fetch'));
    } finally {
      setSuggestionsLoading(false);
    }
  }, [token, t]);

  const debouncedFetchSuggestions = useDebounce(fetchSuggestions, 350);

  const handleSearchChange = (event) => {
    const newTerm = event.target.value;
    setSearchTerm(newTerm);
    debouncedFetchSuggestions(newTerm);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmedSearchTerm = searchTerm.trim();
    if (trimmedSearchTerm) {
      setSuggestions([]); setSuggestionsError(null); setIsSearchExpanded(false);
      navigate(`/search?query=${encodeURIComponent(trimmedSearchTerm)}`);
      setSearchTerm('');
    }
  };

  const handleSuggestionClick = () => {
    setSuggestions([]); setSuggestionsError(null); setIsSearchExpanded(false); setSearchTerm('');
  };

  useEffect(() => {
    setIsMobileMenuOpen(false); setIsSearchExpanded(false); setIsProfileDropdownOpen(false);
    setIsNotificationsOpen(false); setSuggestions([]); setSuggestionsError(null);
  }, [location.pathname, location.search]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
        const response = await axios.get('/api/notifications/unread-count', {
            headers: { Authorization: `Bearer ${token}` }
        });
      setUnreadCount(response.data.unreadCount || 0);
      setNotificationsError(null);
    } catch (error) {
      setNotificationsError(t('error_notifications_count'));
      if (error.response && error.response.status === 401) {
        logout();
      }
    }
   }, [token, logout, t]);

  useEffect(() => {
    let intervalId = null;
    if (token) {
      fetchUnreadCount();
      intervalId = setInterval(fetchUnreadCount, 60000);
    } else {
      setUnreadCount(0);
    }
    return () => { if (intervalId) { clearInterval(intervalId); } };
  }, [token, fetchUnreadCount]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-black">
        <div className="text-xl text-gray-700 dark:text-gray-300">{t('loading')}</div>
      </div>
    );
  }

  const closeAllMenus = () => {
    setIsProfileDropdownOpen(false); setIsNotificationsOpen(false); setIsMobileMenuOpen(false);
    setSuggestions([]);
    setSuggestionsError(null);
  };
  const toggleNotifications = () => {
    setIsNotificationsOpen(prev => !prev); setIsProfileDropdownOpen(false); setIsMobileMenuOpen(false);
    setIsSearchExpanded(false); setSuggestions([]); setSuggestionsError(null);
  };
  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(prev => !prev); setIsNotificationsOpen(false); setIsMobileMenuOpen(false);
    setIsSearchExpanded(false); setSuggestions([]); setSuggestionsError(null);
  };
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev); setIsProfileDropdownOpen(false); setIsNotificationsOpen(false);
    setIsSearchExpanded(false); setSuggestions([]); setSuggestionsError(null);
  };
  const toggleSearch = () => {
    setIsSearchExpanded(prev => {
        const nextState = !prev;
        if (nextState) {
            setIsProfileDropdownOpen(false);
            setIsNotificationsOpen(false);
            setIsMobileMenuOpen(false);
            setTimeout(() => { searchInputRef.current?.focus(); }, 100);
            if (searchTerm.trim().length >= 2) { fetchSuggestions(searchTerm); }
        } else {
            setSuggestions([]);
            setSuggestionsError(null);
        }
        return nextState;
    });
  };

  const shouldShowSuggestionsDropdown = isSearchExpanded && (suggestionsLoading || suggestionsError || suggestions.length > 0 || searchTerm.trim().length >= 2);
  const getSuggestionPosterUrl = (path) => path ? `${SUGGESTION_POSTER_BASE_URL}${path}` : PLACEHOLDER_SUGGESTION_POSTER;

  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-black"><div className="text-xl text-gray-700 dark:text-gray-300">{t('loading_translations')}</div></div>}>
      <div className="min-h-screen bg-gray-100 dark:bg-black flex flex-col">
        <header className="sticky top-0 z-50 bg-black/70 dark:bg-black/60 backdrop-blur-lg border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative flex items-center justify-between h-14 md:h-16">
              <div className="flex items-center space-x-4 lg:space-x-6">
                <Link to="/" className="flex-shrink-0" onClick={closeAllMenus} aria-label={t('nav_aria_homepage')}>
                  <img src={siteLogo} alt="mLoged Logo" className="h-8 w-auto" />
                </Link>
                {token && user && (
                  <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
                    <Link to="/my-logs" className={`nav-link text-sm font-medium whitespace-nowrap px-3 py-1.5 rounded-md transition-colors ${location.pathname === '/my-logs' ? 'text-white bg-white/15' : 'text-gray-300 hover:text-white hover:bg-white/10'}`} onClick={closeAllMenus}>{t('nav_my_logs')}</Link>
                    <Link to="/my-lists" className={`nav-link text-sm font-medium whitespace-nowrap px-3 py-1.5 rounded-md transition-colors ${location.pathname === '/my-lists' || location.pathname.startsWith('/list/') ? 'text-white bg-white/15' : 'text-gray-300 hover:text-white hover:bg-white/10'}`} onClick={closeAllMenus}>{t('nav_my_lists')}</Link>
                    <Link to="/watchlist" className={`nav-link text-sm font-medium whitespace-nowrap px-3 py-1.5 rounded-md transition-colors ${location.pathname === '/watchlist' ? 'text-white bg-white/15' : 'text-gray-300 hover:text-white hover:bg-white/10'}`} onClick={closeAllMenus}>{t('nav_watchlist')}</Link>
                    <Link to="/feed" className={`nav-link text-sm font-medium whitespace-nowrap px-3 py-1.5 rounded-md transition-colors ${location.pathname === '/feed' ? 'text-white bg-white/15' : 'text-gray-300 hover:text-white hover:bg-white/10'}`} onClick={closeAllMenus}>{t('nav_feed')}</Link>
                  </nav>
                )}
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div ref={searchContainerRef} className="relative flex items-center">
                   <div className={`flex items-center transition-all duration-200 ${isSearchExpanded ? 'w-80 sm:w-96' : 'w-0'} overflow-hidden`} >
                       <form onSubmit={handleSearchSubmit} className={`w-full ${isSearchExpanded ? 'opacity-100' : 'opacity-0'}`}>
                         <div className="relative">
                           <span className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                             <FaSearch className="w-5 h-5" />
                           </span>
                           <input
                             ref={searchInputRef}
                             type="search"
                             placeholder={t('search_placeholder')}
                             value={searchTerm}
                             onChange={handleSearchChange}
                             className={`w-full pl-14 pr-4 h-11 text-base rounded-full bg-gray-800 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-transparent transition-all duration-200 appearance-none disabled:opacity-60`}
                             autoComplete="off"
                             disabled={!isSearchExpanded}
                           />
                         </div>
                       </form>
                   </div>
                   <button
                     ref={searchIconRef}
                     type="button"
                     onClick={toggleSearch}
                     className={`p-2 rounded-full text-gray-300 hover:text-brand-text focus:outline-none focus:ring-0 focus:border-transparent transition-all duration-200 ${isSearchExpanded ? 'hidden' : ''}`}
                     aria-label={isSearchExpanded ? t('search_close_aria_label') : t('search_aria_label')}
                     aria-expanded={isSearchExpanded}
                   >
                     <FaSearch className="h-5 w-5" />
                   </button>
                  {shouldShowSuggestionsDropdown && (
                    <div ref={suggestionsRef} className="absolute top-full right-0 mt-2 w-72 sm:w-80 rounded-md shadow-lg bg-gray-800/95 backdrop-blur-sm border border-gray-700 z-[60] max-h-80 overflow-y-auto origin-top-right custom-scrollbar">
                       {suggestionsError && <div className="p-3 text-center text-red-400 text-sm">{suggestionsError}</div>}
                       {suggestionsLoading && !suggestionsError && <div className="p-3 text-center text-gray-400 text-sm italic">{t('suggestions_loading')}</div>}
                       {!suggestionsLoading && !suggestionsError && suggestions.length === 0 && searchTerm.trim().length >= 2 && <div className="p-3 text-center text-gray-400 text-sm">{t('suggestions_no_results', { term: searchTerm })}</div>}
                       {!suggestionsLoading && !suggestionsError && suggestions.length > 0 && (
                         <ul className="divide-y divide-gray-700/50">
                           {suggestions.map((item) => (
                             <li key={`${item.type}-${item.id}`}>
                               <Link to={item.type === 'movie' ? `/movie/${item.id}` : `/tv/${item.id}`} onClick={handleSuggestionClick} className="flex items-center px-3 py-2.5 hover:bg-gray-700/60 transition-colors group">
                                 <img src={getSuggestionPosterUrl(item.poster_path)} alt="" className="w-10 h-[60px] mr-3 object-cover rounded-sm flex-shrink-0 bg-gray-700" loading="lazy" />
                                 <div className="flex-1 min-w-0">
                                   <p className="text-sm font-medium text-gray-100 group-hover:text-brand-hover transition-colors truncate" title={item.title}> {item.title} </p>
                                   <div className="flex items-center text-xs text-gray-400 mt-0.5 space-x-2">
                                     {item.year && (<span>{item.year}</span>)}
                                     <span className={`inline-flex items-center opacity-80 ${item.type === 'movie' ? 'text-blue-400' : 'text-green-400'}`}>
                                       {item.type === 'movie' ? <FaFilm className="w-2.5 h-2.5 mr-1"/> : <FaTv className="w-2.5 h-2.5 mr-1"/>}
                                       {item.type === 'movie' ? t('type_movie') : t('type_tv')}
                                     </span>
                                   </div>
                                 </div>
                               </Link>
                             </li>
                           ))}
                           {searchTerm.trim() && !suggestionsLoading && !suggestionsError && (
                             <li className="border-t border-gray-700/50">
                               <Link to={`/search?query=${encodeURIComponent(searchTerm.trim())}`} onClick={handleSuggestionClick} className="block w-full text-center px-3 py-2 text-xs text-brand-text hover:text-brand-hover hover:bg-gray-700/60 font-semibold"> {t('suggestions_see_all')} </Link>
                             </li>
                           )}
                         </ul>
                       )}
                    </div>
                  )}
                </div>
                <LanguageSwitcher />
                {token && user ? (
                  <>
                    <div className="relative">
                      <button
                        ref={notificationsButtonRef}
                        type="button"
                        onClick={() => navigate('/notifications')}
                        className="p-2 rounded-md text-gray-300 hover:text-brandOrange focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black relative transition-all duration-200 ease-in-out transform hover:animate-bell-shake origin-bottom"
                        aria-label={t('notifications_aria_label')}
                      >
                        <FaRegBell className="h-5 w-5" />
                        {unreadCount > 0 && (
                          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 transform translate-x-1/3 -translate-y-1/3 bg-red-600 rounded-full pointer-events-none">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <button ref={profileButtonRef} type="button" onClick={toggleProfileDropdown} className="flex text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black p-0.5" id="user-menu-button" aria-expanded={isProfileDropdownOpen} aria-haspopup="true">
                        <span className="sr-only">{t('user_menu_open')}</span>
                        <img className="h-7 w-7 rounded-full object-cover" src={user.avatarUrl || DEFAULT_AVATAR_URL} alt={`${user.username} avatar`} />
                      </button>
                      {isProfileDropdownOpen && (
                        <div ref={profileDropdownRef} className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-gray-800/95 backdrop-blur-sm ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-600 z-[60]">
                           <div className="px-4 py-2 border-b border-gray-600/50">
                             <p className="text-sm text-gray-300">{t('logged_in_as')}</p>
                             <p className="text-sm font-medium text-white truncate flex items-center">
                               {user.name || user.username}
                               {user?.isVerified && ( <FaCheckCircle className="inline-block w-3 h-3 text-blue-400 ml-1 align-baseline" title={t('verified_account')} /> )}
                               {user?.isAdmin && ( <FaUserShield className="inline-block w-3 h-3 text-yellow-400 ml-1 align-baseline" title={t('admin_role')} /> )}
                             </p>
                             {user.name && ( <p className="text-xs text-gray-400 truncate"> @{user.username} </p> )}
                           </div>
                           <Link to={`/user/${user.userId}`} onClick={closeAllMenus} className="block px-4 py-2 text-sm text-gray-200 hover:text-white hover:bg-gray-700/60">{t('profile_menu_my_profile')}</Link>
                           <Link to="/profile" onClick={closeAllMenus} className="block px-4 py-2 text-sm text-gray-200 hover:text-white hover:bg-gray-700/60">{t('profile_menu_settings')}</Link>
                           {user?.isAdmin && ( <Link to="/admin" onClick={closeAllMenus} className="block px-4 py-2 text-sm text-yellow-400 hover:text-yellow-300 hover:bg-gray-700/60">{t('profile_menu_admin')}</Link> )}
                           <hr className="my-1 border-gray-600/50" />
                           <button onClick={() => { logout(); closeAllMenus(); navigate('/'); }} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-700/30"> {t('profile_menu_logout')} </button>
                        </div>
                      )}
                    </div>
                    <div className="md:hidden relative">
                       <button ref={mobileMenuButtonRef} type="button" onClick={toggleMobileMenu} className="p-2 rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black transition-colors" aria-label={t('menu_aria_label')} aria-expanded={isMobileMenuOpen}>
                         {isMobileMenuOpen ? <FaTimesCircle className="h-5 w-5"/> : <FaBars className="h-5 w-5" />}
                       </button>
                        {isMobileMenuOpen && (
                            <div ref={mobileMenuRef} className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-gray-800/95 backdrop-blur-sm ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-600 z-[60]">
                                <Link to="/my-logs" className={`block px-4 py-2 text-sm ${location.pathname === '/my-logs' ? 'text-white bg-gray-700' : 'text-gray-200 hover:text-white hover:bg-gray-700/60'}`} onClick={closeAllMenus}>{t('nav_my_logs')}</Link>
                                <Link to="/my-lists" className={`block px-4 py-2 text-sm ${location.pathname === '/my-lists' || location.pathname.startsWith('/list/') ? 'text-white bg-gray-700' : 'text-gray-200 hover:text-white hover:bg-gray-700/60'}`} onClick={closeAllMenus}>{t('nav_my_lists')}</Link>
                                <Link to="/watchlist" className={`block px-4 py-2 text-sm ${location.pathname === '/watchlist' ? 'text-white bg-gray-700' : 'text-gray-200 hover:text-white hover:bg-gray-700/60'}`} onClick={closeAllMenus}>{t('nav_watchlist')}</Link>
                                <Link to="/feed" className={`block px-4 py-2 text-sm ${location.pathname === '/feed' ? 'text-white bg-gray-700' : 'text-gray-200 hover:text-white hover:bg-gray-700/60'}`} onClick={closeAllMenus}>{t('nav_feed')}</Link>
                                <hr className="my-1 border-gray-600/50" />
                                <Link to="/lists/create" className="block px-4 py-2 text-sm text-gray-200 hover:text-white hover:bg-gray-700/60" onClick={closeAllMenus}>{t('nav_create_list')}</Link>
                            </div>
                        )}
                    </div>
                  </>
                ) : (
                  <>
                    <Link to="/auth/options" className="bg-brand hover:bg-opacity-80 text-white font-semibold py-1.5 px-4 rounded-full text-sm transition duration-150 ease-in-out whitespace-nowrap shadow-sm" onClick={closeAllMenus}>
                       {t('login_button_header')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-grow">
          <Routes>
              {/* Herkese Açık Rotalar */}
              <Route path="/" element={<PageLayout><HomePage /></PageLayout>} />
              <Route path="/movie/:movieId" element={<MovieDetailPage />} />
              <Route path="/tv/:tvId" element={<TvShowDetailPage />} />
              <Route path="/tv/:tvId/season/:seasonNumber" element={<SeasonDetailPage />} />
              <Route path="/user/:userId" element={<PageLayout><PublicProfilePage /></PageLayout>} />
              <Route path="/user/:userId/stats" element={<PageLayout><PublicUserStatsPage /></PageLayout>} />
              <Route path="/user/:userId/achievements" element={<PageLayout><UserAchievementsPage /></PageLayout>} />
              <Route path="/search" element={<PageLayout><SearchResultsPage /></PageLayout>} />
              <Route path="/about" element={<PageLayout><AboutPage /></PageLayout>} />
              <Route path="/terms" element={<PageLayout><TermsPage /></PageLayout>} />
              <Route path="/privacy" element={<PageLayout><PrivacyPage /></PageLayout>} />
              <Route path="/editorial-list/:listId" element={<EditorialListPage />} />
              <Route path="/editorial/:slug" element={<EditorialDisplayPage />} /> {/* PageLayout EditorialDisplayPage içinde */}
              <Route path="/guide" element={<Guide />} />


              {/* Sadece Giriş Yapmamış Kullanıcılar İçin Rotalar */}
              <Route path="/auth/options" element={!token ? <PageLayout><AuthOptionsPage /></PageLayout> : <Navigate to="/" replace />} />
              <Route path="/login" element={!token ? <PageLayout><LoginPage /></PageLayout> : <Navigate to="/" replace />} />
              <Route path="/register" element={!token ? <PageLayout><RegisterPage /></PageLayout> : <Navigate to="/" replace />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />

              {/* Sadece Giriş Yapmış Kullanıcılar İçin Rotalar */}
              <Route path="/profile" element={token ? <PageLayout><ProfilePage /></PageLayout> : <Navigate to="/auth/options" state={{ from: location }} replace />} />
              <Route path="/my-logs" element={token ? <PageLayout><UserLogsPage /></PageLayout> : <Navigate to="/auth/options" state={{ from: location }} replace />} />
              <Route path="/lists/create" element={token ? <PageLayout><CreateListPage /></PageLayout> : <Navigate to="/auth/options" state={{ from: location }} replace />} />
              <Route path="/my-lists" element={token ? <PageLayout><MyListsPage /></PageLayout> : <Navigate to="/auth/options" state={{ from: location }} replace />} />
              <Route path="/list/:listId" element={token ? <PageLayout><ListPage /></PageLayout> : <Navigate to="/auth/options" state={{ from: location }} replace />} />
              <Route path="/watchlist" element={token ? <PageLayout><WatchlistPage /></PageLayout> : <Navigate to="/auth/options" state={{ from: location }} replace />} />
              <Route path="/feed" element={token ? <PageLayout><ActivityFeedPage /></PageLayout> : <Navigate to="/auth/options" state={{ from: location }} replace />} />
              <Route path="/import/letterboxd" element={token ? <PageLayout><LetterboxdImportPage /></PageLayout> : <Navigate to="/auth/options" state={{ from: location }} replace />} />
              <Route path="/notifications" element={<NotificationsPage setUnreadCount={setUnreadCount} />} />

               {/* Sadece Admin Kullanıcılar İçin Rotalar */}
               <Route path="/admin" element={token && user?.isAdmin ? <PageLayout><AdminPage /></PageLayout> : <Navigate to="/" replace />} />
               <Route path="/admin/editorial-toplist" element={token && user?.isAdmin ? <PageLayout><AdminEditorialTopListPage /></PageLayout> : <Navigate to="/" replace />} />

              {/* 404 Sayfası */}
              <Route path="*" element={<PageLayout><NotFoundPage /></PageLayout>} />
              <Route path="/post/:postId" element={<PostDetailPage />} />
              <Route path="/list/watchlist-preview/:username" element={<WatchlistPreviewPage />} />
            </Routes>
        </main>
        <Footer />
      </div>
    </Suspense>
  );
}

export default App;
