/* ============================================================
   CineStream — TMDB API Module (Production Ready)
   Fetches real movie data: Bollywood, Hollywood, Tollywood, South, TV Serials
   API: https://www.themoviedb.org
   Secure API handling for cross-device access
   ============================================================ */

const TMDB = (() => {
  // Production API Key - Get from: https://www.themoviedb.org/settings/api
  // Supports: Vite environment variables, window.ENV injection, and fallback
  const RAW_API_KEYS = import.meta.env.VITE_TMDB_API_KEYS || 
                  (window.ENV?.TMDB_API_KEYS && 
                   window.ENV.TMDB_API_KEYS !== '%VITE_TMDB_API_KEYS%' ? 
                   window.ENV.TMDB_API_KEYS : 
                   (import.meta.env.VITE_TMDB_API_KEY || window.ENV?.TMDB_API_KEY || null));
                   
  const API_KEYS = RAW_API_KEYS ? RAW_API_KEYS.split(',').map(k => k.trim()).filter(Boolean) : [];
  let currentKeyIndex = 0;
  const getApiKey = () => API_KEYS[currentKeyIndex];
  
  // Validate and log API configuration status
  if (API_KEYS.length === 0 || API_KEYS[0].includes('your-') || API_KEYS[0] === '%VITE_TMDB_API_KEYS%') {
    console.error('❌ TMDB API Key not configured for production.');
    console.error('📋 SETUP INSTRUCTIONS:');
    console.error('   1. Visit: https://www.themoviedb.org/settings/api');
    console.error('   2. Copy your API Key');
    console.error('   3. For Local Dev: Create .env file with VITE_TMDB_API_KEYS=your-key1,your-key2');
    console.error('   4. For Vercel: Add VITE_TMDB_API_KEYS to Environment Variables');
    console.error('   5. Redeploy your app');
    // Show scraper fallback suggestion after page loads
    setTimeout(() => {
      if (window.UI?.toast) {
        window.UI.toast(
          '⚠️ TMDB API unavailable — <a href="#/scraper" style="color:#14d1ff;text-decoration:underline;font-weight:600;">use the Scraper fallback</a> to find movies.',
          'warning',
          6000
        );
      }
    }, 1500);
  } else {
    console.log(`✅ TMDB API Keys (${API_KEYS.length}) configured successfully - Movies will load across all devices`);
  }
  
  const BASE    = '/tmdb-api';
  const IMG     = '/tmdb-img-500';
  const IMG_BG  = '/tmdb-img-1280';

  // TMDB genre IDs mapping
  const GENRE_MAP = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
    80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
    14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
    9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
    53: 'Thriller', 10752: 'War', 37: 'Western'
  };

  // Working public streaming embed URLs (No CORS restrictions)
  // These work on all devices without origin restrictions
  function normalize(item, mediaType = 'movie') {
    const isTV    = mediaType === 'tv' || item.media_type === 'tv' || item.first_air_date;
    const genreId = item.genre_ids?.[0];
    const genre   = genreId ? (GENRE_MAP[genreId] || 'Drama') : 'Drama';
    const year    = isTV
      ? (item.first_air_date || '').slice(0, 4)
      : (item.release_date  || '').slice(0, 4);
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    // Generate real streaming URLs using TMDB ID (works on all devices)
    const tmdbId = item.id;
    const streams = isTV ? [
      `https://www.2embed.cc/embedtv/${tmdbId}&s=1&e=1`,
      `https://streamimdb.ru/embed/tv/${tmdbId}/1/1`,
      `https://vidlink.pro/tv/${tmdbId}/1/1`,
      `https://autoembed.co/tv/tmdb/${tmdbId}-1-1`,
    ] : [
      `https://www.2embed.cc/embed/${tmdbId}`,
      `https://streamimdb.ru/embed/movie/${tmdbId}`,
      `https://vidlink.pro/movie/${tmdbId}`,
      `https://autoembed.co/movie/tmdb/${tmdbId}`,
    ];
    
    return {
      id:          String(item.id),
      tmdb_id:     item.id,
      title:       item.title || item.name || 'Untitled',
      type:        isTV ? 'series' : 'movie',
      genre,
      year:        parseInt(year) || 2024,
      duration:    item.runtime || (isTV ? 45 : 110),
      imdb:        rating,
      poster:      item.poster_path   ? `${IMG}${item.poster_path}`   : 'https://via.placeholder.com/500x750?text=No+Poster',
      thumbnail:   item.backdrop_path ? `${IMG_BG}${item.backdrop_path}` : (item.poster_path ? `${IMG}${item.poster_path}` : 'https://via.placeholder.com/1280x720?text=No+Image'),
      description: item.overview || 'No description available.',
      stream:      streams[0],
      streams:     streams,
      language:    item.original_language,
      popularity:  item.popularity,
      vote_count:  item.vote_count,
      industry:    isTV ? 'TV Serial' : 'Movie',
      release_date: isTV ? item.first_air_date : item.release_date
    };
  }
  
  // Get embed stream URLs for TMDB title
  function getRegionalStreams(itemOrId, season, episode) {
    if (itemOrId && typeof itemOrId === 'object' && itemOrId.streams && season == null && episode == null) {
      // Rebuild the 4 streams instead of relying on cached item.streams which might be wrong
    }
    
    // Support both direct ID or full item object
    const id = (typeof itemOrId === 'object') ? itemOrId.tmdb_id || itemOrId.id : itemOrId;
    const imdbId = (typeof itemOrId === 'object') ? itemOrId.imdb_id || id : id;

    if (season != null && episode != null) {
      return [
        `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`,
        `https://streamimdb.ru/embed/tv/${imdbId}/${season}/${episode}`,
        `https://vidlink.pro/tv/${id}/${season}/${episode}`,
        `https://autoembed.co/tv/tmdb/${id}-${season}-${episode}`
      ];
    } else {
      return [
        `https://www.2embed.cc/embed/${id}`,
        `https://streamimdb.ru/embed/movie/${imdbId}`,
        `https://vidlink.pro/movie/${id}`,
        `https://autoembed.co/movie/tmdb/${id}`
      ];
    }
  }

  // Generic fetch helper with production-grade error handling
  async function tmdbFetch(endpoint, params = {}, retryCount = 0) {
    const key = getApiKey();
    if (!key || key.includes('your-') || key.includes('%VITE_')) {
      console.error('🔴 TMDB API Key is not configured. Cannot load movies.');
      return [];
    }
    
    const url = new URL(`${BASE}${endpoint}`, window.location.origin);
    url.searchParams.set('api_key', key);
    url.searchParams.set('language', 'en-US');
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const res = await fetch(url.toString(), { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        console.warn(`⚠️ TMDB API Error ${res.status}: ${res.statusText} using key index ${currentKeyIndex}`);
        if ((res.status === 429 || res.status === 401 || res.status === 403) && retryCount < API_KEYS.length - 1) {
          currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
          console.log(`🔄 Retrying with next API key (index ${currentKeyIndex})...`);
          return tmdbFetch(endpoint, params, retryCount + 1);
        }
        return [];
      }
      
      const data = await res.json();
      return data.results || [];
    } catch (e) {
      console.warn('⚠️ TMDB fetch failed:', e.message);
      if (retryCount < API_KEYS.length - 1) {
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
        console.log(`🔄 Retrying with next API key (index ${currentKeyIndex}) after network failure...`);
        return tmdbFetch(endpoint, params, retryCount + 1);
      }
      // All keys exhausted — suggest the scraper fallback
      console.warn('🔴 All TMDB API keys exhausted or network is offline. Use #/scraper for zero-API fallback.');
      if (window.UI?.toast) {
        window.UI.toast(
          '🌐 API/network error — <a href="#/scraper" style="color:#14d1ff;text-decoration:underline;font-weight:600;">Try Scraper Search</a> instead.',
          'error',
          5000
        );
      }
      return [];
    }
  }

  // Trending movies and shows (all, week)
  async function fetchTrending() {
    const results = await tmdbFetch('/trending/all/week');
    return results.map(r => normalize(r, r.media_type));
  }

  // Now Playing movies globally
  async function fetchNowPlaying() {
    const results = await tmdbFetch('/movie/now_playing');
    return results.map(r => normalize(r, 'movie'));
  }

  // Bollywood (Hindi language)
  async function fetchBollywood(page = 1) {
    const results = await tmdbFetch('/discover/movie', {
      with_original_language: 'hi',
      sort_by: 'release_date.desc',
      'release_date.lte': new Date().toISOString().slice(0, 10),
      'vote_count.gte': 20,
      page
    });
    return results.map(r => ({ ...normalize(r, 'movie'), industry: 'Bollywood', language: 'Hindi' }));
  }

  // Hollywood (English language)
  async function fetchHollywood(page = 1) {
    const results = await tmdbFetch('/discover/movie', {
      with_original_language: 'en',
      sort_by: 'popularity.desc',
      'vote_count.gte': 200,
      page
    });
    return results.map(r => ({ ...normalize(r, 'movie'), industry: 'Hollywood', language: 'English' }));
  }

  // Tollywood (Telugu language)
  async function fetchTollywood(page = 1) {
    const results = await tmdbFetch('/discover/movie', {
      with_original_language: 'te',
      sort_by: 'release_date.desc',
      'vote_count.gte': 10,
      page
    });
    return results.map(r => ({ ...normalize(r, 'movie'), industry: 'Tollywood', language: 'Telugu' }));
  }

  // South Indian movies (Tamil, Kannada, Malayalam)
  async function fetchSouthMovies(page = 1) {
    const [tamil, malayalam, kannada] = await Promise.all([
      tmdbFetch('/discover/movie', {
        with_original_language: 'ta',
        sort_by: 'popularity.desc',
        'vote_count.gte': 10,
        page
      }),
      tmdbFetch('/discover/movie', {
        with_original_language: 'ml',
        sort_by: 'popularity.desc',
        'vote_count.gte': 10,
        page
      }),
      tmdbFetch('/discover/movie', {
        with_original_language: 'kn',
        sort_by: 'popularity.desc',
        'vote_count.gte': 5,
        page
      })
    ]);

    const combined = [
      ...tamil.map(r => ({ ...normalize(r, 'movie'), industry: 'Tamil', language: 'Tamil' })),
      ...malayalam.map(r => ({ ...normalize(r, 'movie'), industry: 'Malayalam', language: 'Malayalam' })),
      ...kannada.map(r => ({ ...normalize(r, 'movie'), industry: 'Kannada', language: 'Kannada' })),
    ];
    return combined.sort((a, b) => b.popularity - a.popularity);
  }

  // TV Serials & Web Series (Hindi and English)
  async function fetchTVSeries(page = 1) {
    const [hindi, english] = await Promise.all([
      tmdbFetch('/discover/tv', {
        with_original_language: 'hi',
        sort_by: 'popularity.desc',
        page
      }),
      tmdbFetch('/discover/tv', {
        with_original_language: 'en',
        sort_by: 'popularity.desc',
        'vote_count.gte': 100,
        page
      })
    ]);
    
    return [
      ...hindi.map(r => ({ ...normalize(r, 'tv'), industry: 'TV Serial', language: 'Hindi' })),
      ...english.map(r => ({ ...normalize(r, 'tv'), industry: 'Web Series', language: 'English' })),
    ].sort((a, b) => b.popularity - a.popularity);
  }

  // Top Rated Movies (all languages)
  async function fetchTopRated() {
    const results = await tmdbFetch('/movie/top_rated', { 'vote_count.gte': 1000 });
    return results.map(r => normalize(r, 'movie'));
  }

  // Upcoming Movies
  async function fetchUpcoming() {
    const results = await tmdbFetch('/movie/upcoming');
    return results.map(r => normalize(r, 'movie'));
  }

  // Search movies and TV shows
  async function search(query, page = 1) {
    if (!query || query.length < 2) return [];
    const results = await tmdbFetch('/search/multi', { query, page });
    return results
      .filter(r => r.media_type !== 'person' && (r.poster_path || r.backdrop_path))
      .map(r => normalize(r, r.media_type || 'movie'));
  }

  // Get detailed information for a movie/show by TMDB ID
  async function getDetails(tmdbId, type = 'movie', retryCount = 0) {
    const key = getApiKey();
    if (!key || key.includes('your-') || key.includes('%VITE_')) {
      console.error('TMDB API Key is not configured');
      return null;
    }
    
    try {
      let url = `${BASE}/${type}/${tmdbId}?api_key=${key}&language=en-US&append_to_response=credits,videos,external_ids`;
      let res = await fetch(url);
      
      if (!res.ok && (res.status === 429 || res.status === 401 || res.status === 403) && retryCount < API_KEYS.length - 1) {
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
        console.log(`🔄 Retrying getDetails with next API key (index ${currentKeyIndex})...`);
        return getDetails(tmdbId, type, retryCount + 1);
      }

      // Fallback: try opposite type if not found
      if (!res.ok && res.status !== 429 && res.status !== 401 && res.status !== 403) {
        const fallbackType = type === 'movie' ? 'tv' : 'movie';
        url = `${BASE}/${fallbackType}/${tmdbId}?api_key=${key}&language=en-US&append_to_response=credits,videos,external_ids`;
        res = await fetch(url);
        if (res.ok) type = fallbackType;
      }
      
      if (!res.ok) return null;
      const raw = await res.json();
      const item = normalize(raw, type);
      item.imdb_id = raw.external_ids ? raw.external_ids.imdb_id : null;

      // Rebuild streams using IMDb ID for StreamIMDB (normalize() didn't have imdb_id yet)
      if (item.imdb_id) {
        const sid = item.imdb_id;
        const tid = item.tmdb_id || item.id;
        if (type === 'movie') {
          item.streams = [
            `https://www.2embed.cc/embed/${tid}`,
            `https://streamimdb.ru/embed/movie/${sid}`,
            `https://vidlink.pro/movie/${tid}`,
            `https://autoembed.co/movie/tmdb/${tid}`,
          ];
          item.stream = item.streams[0];
        }
        // TV stream rebuild happens inside the TV block below after tvImdbId is resolved
      }

      // Add cast and crew
      if (raw.credits) {
        item.cast = (raw.credits.cast || []).map(c => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profile_path: c.profile_path ? `${IMG}${c.profile_path}` : null
        }));
        item.crew = (raw.credits.crew || []).map(c => ({
          id: c.id,
          name: c.name,
          job: c.job,
          profile_path: c.profile_path ? `${IMG}${c.profile_path}` : null
        }));
      }

      // For TV series: fetch full TV details + all seasons/episodes
      if (type === 'tv') {
        // NOTE: We must directly fetch (not use tmdbFetch which strips to .results[])
        const tvUrl = `${BASE}/tv/${tmdbId}?api_key=${key}&language=en-US&append_to_response=external_ids`;
        const tvRes = await fetch(tvUrl);
        if (tvRes.ok) {
          const tvData = await tvRes.json();
          // Get IMDb ID from TV data external_ids (more reliable than movie external_ids)
          const tvImdbId = tvData.external_ids?.imdb_id || item.imdb_id || tmdbId;
          if (tvImdbId) item.imdb_id = tvImdbId; // update with the confirmed IMDb ID

          const allSeasons = (tvData.seasons || []).filter(s => s.season_number >= 0);
          // Count only real seasons (exclude season 0 = specials from the count shown)
          const realSeasons = allSeasons.filter(s => s.season_number > 0);
          item.seasons = realSeasons.length || 1;
          item.total_episodes = tvData.number_of_episodes || 0;

          const episodesMap = {};
          // Fetch all seasons in parallel for speed
          await Promise.all(allSeasons.map(async (seasonInfo) => {
            const seasonNum = seasonInfo.season_number;
            try {
              const seasonUrl = `${BASE}/tv/${tmdbId}/season/${seasonNum}?api_key=${key}&language=en-US`;
              const seasonRes = await fetch(seasonUrl);
              if (!seasonRes.ok) return;
              const seasonData = await seasonRes.json();
              const eps = (seasonData.episodes || []).map(ep => {
                const sn = seasonNum;
                const en = ep.episode_number;
                // StreamIMDB requires IMDb ID (tt-format); others use TMDB ID
                const epStreams = [
                  `https://www.2embed.cc/embedtv/${tmdbId}&s=${sn}&e=${en}`,
                  `https://streamimdb.ru/embed/tv/${tvImdbId}/${sn}/${en}`,
                  `https://vidlink.pro/tv/${tmdbId}/${sn}/${en}`,
                  `https://autoembed.co/tv/tmdb/${tmdbId}-${sn}-${en}`,
                ];
                return {
                  epNum: en,
                  title: ep.name || `Episode ${en}`,
                  desc: ep.overview || '',
                  thumb: ep.still_path ? `${IMG}${ep.still_path}` : item.poster,
                  duration: ep.runtime || tvData.episode_run_time?.[0] || 45,
                  stream: epStreams[0],
                  streams: epStreams
                };
              });
              if (eps.length > 0) episodesMap[seasonNum] = eps;
            } catch (err) {
              console.warn(`Failed to load season ${seasonNum}:`, err);
            }
          }));
          item.episodes = episodesMap;
          console.log(`✅ TV series loaded: ${Object.keys(episodesMap).length} seasons, ${item.total_episodes} eps — IMDb: ${tvImdbId}`);
        }
      }
      return item;
    } catch (e) {
      console.warn('TMDB getDetails error:', e);
      return null;
    }
  }

  // Load all home sections in parallel for fast page load
  async function fetchHomeData() {
    const [trending, nowPlaying, bollywood, hollywood, tollywood, south, topRated] = await Promise.all([
      fetchTrending(),
      fetchNowPlaying(),
      fetchBollywood(),
      fetchHollywood(),
      fetchTollywood(),
      fetchSouthMovies(),
      fetchTopRated()
    ]);

    // Cache everything for quick access
    const all = [...trending, ...nowPlaying, ...bollywood, ...hollywood, ...tollywood, ...south, ...topRated];
    const unique = Object.values(Object.fromEntries(all.filter(m => m.poster).map(m => [m.id, m])));
    window.DEMO_CONTENT = unique;

    return { trending, nowPlaying, bollywood, hollywood, tollywood, south, topRated };
  }

  return {
    fetchTrending,
    fetchNowPlaying,
    fetchBollywood,
    fetchHollywood,
    fetchTollywood,
    fetchSouthMovies,
    fetchTVSeries,
    fetchTopRated,
    fetchUpcoming,
    search,
    getDetails,
    getRegionalStreams,
    fetchHomeData,
    IMG,
    IMG_BG,
    isConfigured: () => API_KEYS.length > 0 && !API_KEYS[0].includes('your-') && !API_KEYS[0].includes('%VITE_')
  };
})();

window.TMDB = TMDB;
