// src/pages/HomePage.jsx
import React from 'react';
import MovieList from '../components/MovieList';
import TvShowList from '../components/TvShowList';
import HomepageWatchlist from '../components/HomepageWatchlist';
import HomepageHero from '../components/HomepageHero'; // <<< YENİ: Hero bileşenini import et

function HomePage() {
  return (
    // Ana kapsayıcı - Bölümler arasına boşluk
    // Hero bölümü için ekstra üst boşluk gerekebilir, PageLayout'a bağlı
    <div className="space-y-12 md:space-y-16 lg:space-y-20">

      {/* <<< YENİ: Hero Bölümü >>> */}
      <HomepageHero />

      {/* Popüler Filmler Bölümü */}
      <MovieList />

      {/* Popüler Diziler Bölümü */}
      <TvShowList />

      {/* İzleme Listesi Önizleme Bölümü */}
      <HomepageWatchlist />

      {/* Gelecekte buraya başka bölümler eklenebilir */}

    </div>
  );
}
export default HomePage;
