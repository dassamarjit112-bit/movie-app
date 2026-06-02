/* ============================================================
   CineStream — TMDB API Module
   Fetches real movie data: Bollywood, Hollywood, Tollywood, South, TV Serials
   API: https://www.themoviedb.org
   ============================================================ */

const TMDB = (() => {
  const API_KEY = window.ENV?.TMDB_API_KEY && window.ENV.TMDB_API_KEY !== '%VITE_TMDB_API_KEY%' ? window.ENV.TMDB_API_KEY : 'b7bb606801e160a12504bae3568cced9';
  const BASE    = 'https://api.themoviedb.org/3';
  const IMG     = 'https://image.tmdb.org/t/p/w500';
  const IMG_BG  = 'https://image.tmdb.org/t/p/w1280';

  // TMDB genre IDs
  const GENRE_MAP = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
    80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
    14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
    9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
    53: 'Thriller', 10752: 'War', 37: 'Western'
  };

  // ── Working public iframe streams ──
  // We use third-party embed servers (VidSrc) that map directly to TMDB IDs.
  // URL Format: https://vidsrc.me/embed/movie?tmdb={id}
  // URL Format: https://vidsrc.me/embed/tv?tmdb={id}&season={s}&episode={e}

  // ── Convert a TMDB movie/tv object to our internal format ──
  function normalize(item, mediaType = 'movie') {
    const isTV    = mediaType === 'tv' || item.media_type === 'tv' || item.first_air_date;
    const genreId = item.genre_ids?.[0];
    const genre   = genreId ? (GENRE_MAP[genreId] || 'Drama') : 'Drama';
    const year    = isTV
      ? (item.first_air_date || '').slice(0, 4)
      : (item.release_date  || '').slice(0, 4);
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    // Generate real streaming URLs using TMDB ID
    const tmdbId = item.id;
    const streams = isTV ? [
      `https://www.2embed.cc/embedtv/${tmdbId}&s=1&e=1`,
      `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=1&episode=1`,
      `https://vidlink.pro/tv/${tmdbId}/1/1`,
      `https://vixsrc.to/tv/${tmdbId}/1/1`
    ] : [
      `https://www.2embed.cc/embed/${tmdbId}`,
      `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
      `https://vidlink.pro/movie/${tmdbId}`,
      `https://vixsrc.to/movie/${tmdbId}`
    ];
    const primary = streams[0];
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
      stream:      primary,
      streams:     streams,
      language:    item.original_language,
      popularity:  item.popularity,
      vote_count:  item.vote_count,
      industry:    isTV ? 'TV Serial' : 'Movie',
      release_date: isTV ? item.first_air_date : item.release_date
    };
  }
  
  // ── Get embed stream URLs for a TMDB title ──
  // For series: pass season and episode numbers
  // For movies: pass null for season and episode
  function getRegionalStreams(tmdbId, season, episode) {
    // If called with an item object (legacy), extract the id and return its streams array
    if (tmdbId && typeof tmdbId === 'object') {
      return tmdbId.streams || [];
    }
    const id = tmdbId;
    if (season != null && episode != null) {
      // Series episode streams
      return [
        `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`,
        `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`,
        `https://vidlink.pro/tv/${id}/${season}/${episode}`,
        `https://vixsrc.to/tv/${id}/${season}/${episode}`
      ];
    } else {
      // Movie streams
      return [
        `https://www.2embed.cc/embed/${id}`,
        `https://vidsrc.me/embed/movie?tmdb=${id}`,
        `https://vidlink.pro/movie/${id}`,
        `https://vixsrc.to/movie/${id}`
      ];
    }
  }
  
  // ── Helper to format embed URLs ──
  function getEmbedUrl(tmdbId, type, season = 1, episode = 1) {
    if (type === 'tv') {
      return `https://vidlink.pro/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
    }
    return `https://www.2embed.cc/embed/${tmdbId}`;
  }

  // ── Generic fetch helper with error handling ──
  async function tmdbFetch(endpoint, params = {}) {
    const url = new URL(`${BASE}${endpoint}`);
    url.searchParams.set('api_key', API_KEY);
    url.searchParams.set('language', 'en-US');
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`TMDB ${res.status}`);
      const data = await res.json();
      return data.results || [];
    } catch (e) {
      console.warn('TMDB fetch error:', e);
      return [];
    }
  }

  // ── Trending (all, week) ──
  async function fetchTrending() {
    const results = await tmdbFetch('/trending/all/week');
    return results.map(r => normalize(r, r.media_type));
  }

  // ── Now Playing (global latest) ──
  async function fetchNowPlaying() {
    const results = await tmdbFetch('/movie/now_playing');
    return results.map(r => normalize(r, 'movie'));
  }

  // ── Bollywood — Hindi language, Indian region ──
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

  // ── Hollywood — English language ──
  async function fetchHollywood(page = 1) {
    const results = await tmdbFetch('/discover/movie', {
      with_original_language: 'en',
      sort_by: 'popularity.desc',
      'vote_count.gte': 200,
      page
    });
    return results.map(r => ({ ...normalize(r, 'movie'), industry: 'Hollywood', language: 'English' }));
  }

  // ── Tollywood — Telugu language ──
  async function fetchTollywood(page = 1) {
    const results = await tmdbFetch('/discover/movie', {
      with_original_language: 'te',
      sort_by: 'release_date.desc',
      'vote_count.gte': 10,
      page
    });
    return results.map(r => ({ ...normalize(r, 'movie'), industry: 'Tollywood', language: 'Telugu' }));
  }

  // ── South Indian (Tamil, Kannada, Malayalam) ──
  async function fetchSouthMovies(page = 1) {
    // Tamil
    const tamil = await tmdbFetch('/discover/movie', {
      with_original_language: 'ta',
      sort_by: 'popularity.desc',
      'vote_count.gte': 10,
      page
    });
    // Malayalam
    const malayalam = await tmdbFetch('/discover/movie', {
      with_original_language: 'ml',
      sort_by: 'popularity.desc',
      'vote_count.gte': 10,
      page
    });
    // Kannada
    const kannada = await tmdbFetch('/discover/movie', {
      with_original_language: 'kn',
      sort_by: 'popularity.desc',
      'vote_count.gte': 5,
      page
    });

    const combined = [
      ...tamil.map(r => ({ ...normalize(r, 'movie'), industry: 'Tamil', language: 'Tamil' })),
      ...malayalam.map(r => ({ ...normalize(r, 'movie'), industry: 'Malayalam', language: 'Malayalam' })),
      ...kannada.map(r => ({ ...normalize(r, 'movie'), industry: 'Kannada', language: 'Kannada' })),
    ];
    return combined.sort((a, b) => b.popularity - a.popularity);
  }

  // ── TV Serials & Web Series (Indian + International) ──
  async function fetchTVSeries(page = 1) {
    const hindi = await tmdbFetch('/discover/tv', {
      with_original_language: 'hi',
      sort_by: 'popularity.desc',
      page
    });
    const english = await tmdbFetch('/discover/tv', {
      with_original_language: 'en',
      sort_by: 'popularity.desc',
      'vote_count.gte': 100,
      page
    });
    return [
      ...hindi.map(r => ({ ...normalize(r, 'tv'), industry: 'TV Serial', language: 'Hindi' })),
      ...english.map(r => ({ ...normalize(r, 'tv'), industry: 'Web Series', language: 'English' })),
    ].sort((a, b) => b.popularity - a.popularity);
  }

  // ── Top Rated Movies (all languages) ──
  async function fetchTopRated() {
    const results = await tmdbFetch('/movie/top_rated', { 'vote_count.gte': 1000 });
    return results.map(r => normalize(r, 'movie'));
  }

  // ── Upcoming Movies ──
  async function fetchUpcoming() {
    const results = await tmdbFetch('/movie/upcoming');
    return results.map(r => normalize(r, 'movie'));
  }

  // ── Search (movies + TV) ──
  async function search(query, page = 1) {
    if (!query || query.length < 2) return [];
    const results = await tmdbFetch('/search/multi', { query, page });
    return results
      .filter(r => r.media_type !== 'person' && (r.poster_path || r.backdrop_path))
      .map(r => normalize(r, r.media_type || 'movie'));
  }

  // ── Get Movie Details by TMDB ID ──
  async function getDetails(tmdbId, type = 'movie') {
    try {
      const url = `${BASE}/${type}/${tmdbId}?api_key=${API_KEY}&language=en-US&append_to_response=credits,videos`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const raw = await res.json();
      // Normalize base fields
      const item = normalize(raw, type);
      // Attach cast and crew from TMDB credits if available
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

      // If TV series, fetch seasons and episodes details
      if (type === 'tv') {
        // Fetch full TV details with season info
        const tvUrl = `${BASE}/tv/${tmdbId}?api_key=${API_KEY}&language=en-US&append_to_response=credits,videos`;
        const tvRes = await fetch(tvUrl);
        if (tvRes.ok) {
          const tvData = await tvRes.json();
          // Populate seasons count
          const seasons = tvData.seasons || [];
          item.seasons = seasons.length;
          // Prepare episodes per season
          const episodesMap = {};
          // For each season, fetch episodes (limit to first few to avoid overload)
          for (const seasonInfo of seasons) {
            const seasonNum = seasonInfo.season_number;
            const seasonUrl = `${BASE}/tv/${tmdbId}/season/${seasonNum}?api_key=${API_KEY}&language=en-US`;
            const seasonRes = await fetch(seasonUrl);
            if (!seasonRes.ok) continue;
            const seasonData = await seasonRes.json();
            const eps = (seasonData.episodes || []).map(ep => {
              // Build real stream link for this specific episode
                const epStreams = [
                  `https://www.2embed.cc/embedtv/${tmdbId}&s=${seasonNum}&e=${ep.episode_number}`,
                  `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${seasonNum}&episode=${ep.episode_number}`,
                  `https://vidlink.pro/tv/${tmdbId}/${seasonNum}/${ep.episode_number}`,
                  `https://vixsrc.to/tv/${tmdbId}/${seasonNum}/${ep.episode_number}`
                ];
              return {
                epNum: ep.episode_number,
                title: ep.name || `Episode ${ep.episode_number}`,
                desc: ep.overview || '',
                thumb: ep.still_path ? `${IMG}${ep.still_path}` : item.poster,
                duration: ep.runtime || 45,
                stream: epStreams[0],
                streams: epStreams
              };
            });
            episodesMap[seasonNum] = eps;
          }
          item.episodes = episodesMap;
        }
      }
      // Register the content for demo if needed
      return item;
    } catch (e) {
      console.warn('TMDB getDetails error:', e);
      return null;
    }
  }

  // ── Load all home sections in parallel ──
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

    // Merge everything into DEMO_CONTENT so the rest of the app works
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
    IMG_BG
  };
})();

window.TMDB = TMDB;
