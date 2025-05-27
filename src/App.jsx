import UserWatchlist from './pages/UserWatchlist';

              {/* Herkese Açık Rotalar */}
              <Route path="/" element={<PageLayout><HomePage /></PageLayout>} />
              <Route path="/movie/:movieId" element={<MovieDetailPage />} />
              <Route path="/tv/:tvId" element={<TvShowDetailPage />} />
              <Route path="/tv/:tvId/season/:seasonNumber" element={<SeasonDetailPage />} />
              <Route path="/user/:userId" element={<PageLayout><PublicProfilePage /></PageLayout>} />
              <Route path="/user/:userId/stats" element={<PageLayout><PublicUserStatsPage /></PageLayout>} />
              <Route path="/user/:userId/achievements" element={<PageLayout><UserAchievementsPage /></PageLayout>} />
              <Route path="/watchlist/:username" element={<PageLayout><UserWatchlist /></PageLayout>} />
              <Route path="/search" element={<PageLayout><SearchResultsPage /></PageLayout>} /> 