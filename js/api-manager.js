/* ============================================================
   CineStream — Multi-API Manager with Automatic Fallback
   Supports: TMDB, OMDb, Trakt.tv, TVmaze, Simkl
   Automatically falls back to next API on failure
   ============================================================ */

const APIManager = (() => {
  // Load API Keys from Environment Variables
  const API_KEYS = {
    tmdb: import.meta.env.VITE_TMDB_API_KEY || window.ENV?.TMDB_API_KEY || '',
    omdb: import.meta.env.VITE_OMDB_API_KEY || window.ENV?.OMDB_API_KEY || '',
    trakt: import.meta.env.VITE_TRAKT_API_KEY || window.ENV?.TRAKT_API_KEY || '',
    trakt_client_id: import.meta.env.VITE_TRAKT_CLIENT_ID || window.ENV?.TRAKT_CLIENT_ID || '',
    tvmaze: import.meta.env.VITE_TVMAZE_API_KEY || window.ENV?.TVMAZE_API_KEY || '',
    simkl: import.meta.env.VITE_SIMKL_API_KEY || window.ENV?.SIMKL_API_KEY || '',
    simkl_client_id: import.meta.env.VITE_SIMKL_CLIENT_ID || window.ENV?.SIMKL_CLIENT_ID || ''
  };

  // API Configuration
  const PRIMARY_API = import.meta.env.VITE_PRIMARY_API || 'tmdb';
  const ENABLE_FALLBACK = import.meta.env.VITE_API_FALLBACK_ENABLED !== 'false';
  const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT) || 8000;
  const STREAM_PRIORITY = (import.meta.env.VITE_STREAM_PRIORITY || 'tmdb,omdb,trakt,tvmaze,simkl').split(',');

  // API Priority Order (with fallback chain)
  const API_PRIORITY = ['tmdb', 'omdb', 'trakt', 'tvmaze', 'simkl'];
  let currentAPIIndex = API_PRIORITY.indexOf(PRIMARY_API) || 0;

  // Validation status
  const validAPIs = checkValidAPIs();

  function checkValidAPIs() {
    const valid = {};
    valid.tmdb = !(!API_KEYS.tmdb || API_KEYS.tmdb.includes('your-') || API_KEYS.tmdb === '%VITE_TMDB_API_KEY%');
    valid.omdb = !(!API_KEYS.omdb || API_KEYS.omdb.includes('your-') || API_KEYS.omdb === '%VITE_OMDB_API_KEY%');
    valid.trakt = !(!API_KEYS.trakt || API_KEYS.trakt.includes('your-') || API_KEYS.trakt === '%VITE_TRAKT_API_KEY%');
    valid.tvmaze = true; // TVmaze doesn't require API key
    valid.simkl = !(!API_KEYS.simkl || API_KEYS.simkl.includes('your-') || API_KEYS.simkl === '%VITE_SIMKL_API_KEY%');
    
    console.log('🔍 API Status:', valid);
    return valid;
  }

  // Generic fetch with timeout and error handling
  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', ...options.headers }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  // Get next available API
  function getNextAPI(currentAPI) {
    const currentIdx = API_PRIORITY.indexOf(currentAPI);
    for (let i = currentIdx + 1; i < API_PRIORITY.length; i++) {
      if (validAPIs[API_PRIORITY[i]]) {
        return API_PRIORITY[i];
      }
    }
    return null;
  }

  // ========== TMDB API ==========
  const TMDB = {
    async search(query, page = 1) {
      const url = `/tmdb-api/search/multi?api_key=${API_KEYS.tmdb}&query=${encodeURIComponent(query)}&page=${page}`;
      const data = await fetchWithTimeout(url);
      return (data.results || []).map(r => this.normalize(r));
    },

    async getTrending() {
      const url = `/tmdb-api/trending/all/week?api_key=${API_KEYS.tmdb}`;
      const data = await fetchWithTimeout(url);
      return (data.results || []).map(r => this.normalize(r));
    },

    async getDetails(id, type = 'movie') {
      const url = `/tmdb-api/${type}/${id}?api_key=${API_KEYS.tmdb}&append_to_response=credits,videos`;
      const data = await fetchWithTimeout(url);
      return this.normalize(data, type);
    },

    normalize(item, type = null) {
      const isTV = type === 'tv' || item.media_type === 'tv' || item.first_air_date;
      return {
        id: String(item.id),
        title: item.title || item.name || 'Untitled',
        type: isTV ? 'series' : 'movie',
        year: isTV ? (item.first_air_date || '').slice(0, 4) : (item.release_date || '').slice(0, 4),
        poster: item.poster_path ? `/tmdb-img-500${item.poster_path}` : null,
        backdrop: item.backdrop_path ? `/tmdb-img-1280${item.backdrop_path}` : null,
        description: item.overview || '',
        rating: item.vote_average ? item.vote_average.toFixed(1) : 'N/A',
        source: 'tmdb',
        tmdb_id: item.id
      };
    }
  };

  // ========== OMDb API ==========
  const OMDB = {
    async search(query, page = 1) {
      const url = `https://www.omdbapi.com/?apikey=${API_KEYS.omdb}&s=${encodeURIComponent(query)}&page=${page}&type=movie`;
      const data = await fetchWithTimeout(url);
      if (data.Response === 'False') throw new Error(data.Error);
      return (data.Search || []).map(r => this.normalize(r));
    },

    async getDetails(id) {
      const url = `https://www.omdbapi.com/?apikey=${API_KEYS.omdb}&i=${id}&plot=full`;
      const data = await fetchWithTimeout(url);
      if (data.Response === 'False') throw new Error(data.Error);
      return this.normalize(data);
    },

    normalize(item) {
      return {
        id: item.imdbID,
        title: item.Title || 'Untitled',
        type: (item.Type || 'movie').toLowerCase(),
        year: item.Year,
        poster: item.Poster !== 'N/A' ? item.Poster : null,
        description: item.Plot || '',
        rating: item.imdbRating !== 'N/A' ? item.imdbRating : 'N/A',
        source: 'omdb',
        imdb_id: item.imdbID
      };
    }
  };

  // ========== TRAKT.TV API ==========
  const TRAKT = {
    async search(query, page = 1) {
      const url = `https://api.trakt.tv/search?query=${encodeURIComponent(query)}&page=${page}&limit=20`;
      const data = await fetchWithTimeout(url, {
        headers: { 'trakt-api-version': '2', 'trakt-api-key': API_KEYS.trakt_client_id }
      });
      return (data || []).map(r => this.normalize(r));
    },

    async getTrending() {
      const url = `https://api.trakt.tv/movies/trending?limit=30`;
      const data = await fetchWithTimeout(url, {
        headers: { 'trakt-api-version': '2', 'trakt-api-key': API_KEYS.trakt_client_id }
      });
      return (data || []).map(r => this.normalize({ movie: r.movie, ...r }));
    },

    normalize(item) {
      const movie = item.movie || item;
      return {
        id: String(movie.ids?.trakt),
        title: movie.title || 'Untitled',
        type: item.show ? 'series' : 'movie',
        year: movie.year,
        poster: null, // Trakt doesn't provide posters in search results
        description: movie.overview || '',
        rating: movie.rating || 'N/A',
        source: 'trakt',
        trakt_id: movie.ids?.trakt
      };
    }
  };

  // ========== TVmaze API ==========
  const TVMAZE = {
    async search(query, page = 1) {
      const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;
      const data = await fetchWithTimeout(url);
      return (data || []).map(r => this.normalize(r));
    },

    async getDetails(id) {
      const url = `https://api.tvmaze.com/shows/${id}?embed=seasons&embed=cast`;
      const data = await fetchWithTimeout(url);
      return this.normalize({ show: data });
    },

    normalize(item) {
      const show = item.show || item;
      return {
        id: String(show.id),
        title: show.name || 'Untitled',
        type: 'series',
        year: show.premiered ? show.premiered.slice(0, 4) : '',
        poster: show.image?.medium || null,
        backdrop: show.image?.original || null,
        description: show.summary ? show.summary.replace(/<[^>]*>/g, '') : '',
        rating: show.rating?.average || 'N/A',
        source: 'tvmaze',
        tvmaze_id: show.id
      };
    }
  };

  // ========== SIMKL API ==========
  const SIMKL = {
    async search(query, page = 1) {
      const url = `https://api.simkl.com/search?q=${encodeURIComponent(query)}&type=movie&extended=full`;
      const data = await fetchWithTimeout(url);
      return (data.results || []).map(r => this.normalize(r));
    },

    async getTrending() {
      const url = `https://api.simkl.com/movies/trending?extended=full`;
      const data = await fetchWithTimeout(url);
      return (data.movies || []).map(r => this.normalize(r));
    },

    normalize(item) {
      const movie = item.movie || item;
      return {
        id: String(movie.ids?.simkl),
        title: movie.title || 'Untitled',
        type: item.show ? 'series' : 'movie',
        year: movie.year,
        poster: movie.poster || null,
        description: movie.overview || '',
        rating: movie.rating || 'N/A',
        source: 'simkl',
        simkl_id: movie.ids?.simkl
      };
    }
  };

  // API Registry
  const APIs = {
    tmdb: { ...TMDB, isValid: () => validAPIs.tmdb },
    omdb: { ...OMDB, isValid: () => validAPIs.omdb },
    trakt: { ...TRAKT, isValid: () => validAPIs.trakt },
    tvmaze: { ...TVMAZE, isValid: () => validAPIs.tvmaze },
    simkl: { ...SIMKL, isValid: () => validAPIs.simkl }
  };

  // Main search with fallback
  async function search(query, page = 1) {
    const attemptedAPIs = new Set();
    let currentAPI = PRIMARY_API;

    while (currentAPI && !attemptedAPIs.has(currentAPI)) {
      attemptedAPIs.add(currentAPI);

      try {
        if (!validAPIs[currentAPI]) {
          console.warn(`⚠️ ${currentAPI.toUpperCase()} not configured, trying next...`);
          currentAPI = getNextAPI(currentAPI);
          continue;
        }

        console.log(`🔄 Searching with ${currentAPI.toUpperCase()}...`);
        const results = await APIs[currentAPI].search(query, page);

        if (results.length > 0) {
          console.log(`✅ Found ${results.length} results using ${currentAPI.toUpperCase()}`);
          return results;
        }

        currentAPI = getNextAPI(currentAPI);
      } catch (err) {
        console.warn(`❌ ${currentAPI.toUpperCase()} search failed: ${err.message}. Trying next API...`);
        currentAPI = getNextAPI(currentAPI);
      }
    }

    console.error('❌ All APIs exhausted for search');
    return [];
  }

  // Trending with fallback
  async function getTrending() {
    const attemptedAPIs = new Set();
    let currentAPI = PRIMARY_API;

    while (currentAPI && !attemptedAPIs.has(currentAPI)) {
      attemptedAPIs.add(currentAPI);

      try {
        if (!validAPIs[currentAPI] || !APIs[currentAPI].getTrending) {
          currentAPI = getNextAPI(currentAPI);
          continue;
        }

        console.log(`🔄 Fetching trending from ${currentAPI.toUpperCase()}...`);
        const results = await APIs[currentAPI].getTrending();

        if (results.length > 0) {
          console.log(`✅ Fetched ${results.length} trending items from ${currentAPI.toUpperCase()}`);
          return results;
        }

        currentAPI = getNextAPI(currentAPI);
      } catch (err) {
        console.warn(`⚠️ ${currentAPI.toUpperCase()} trending failed: ${err.message}`);
        currentAPI = getNextAPI(currentAPI);
      }
    }

    return [];
  }

  // Details with fallback
  async function getDetails(id, type = 'movie') {
    const attemptedAPIs = new Set();
    let currentAPI = PRIMARY_API;

    while (currentAPI && !attemptedAPIs.has(currentAPI)) {
      attemptedAPIs.add(currentAPI);

      try {
        if (!validAPIs[currentAPI]) {
          currentAPI = getNextAPI(currentAPI);
          continue;
        }

        console.log(`🔄 Fetching details from ${currentAPI.toUpperCase()}...`);
        const details = await APIs[currentAPI].getDetails(id, type);

        if (details) {
          console.log(`✅ Got details from ${currentAPI.toUpperCase()}`);
          return details;
        }

        currentAPI = getNextAPI(currentAPI);
      } catch (err) {
        console.warn(`⚠️ ${currentAPI.toUpperCase()} details failed: ${err.message}`);
        currentAPI = getNextAPI(currentAPI);
      }
    }

    return null;
  }

  // Status check
  function getStatus() {
    return {
      primaryAPI: PRIMARY_API,
      validAPIs,
      enabledFallback: ENABLE_FALLBACK,
      availableAPIs: API_PRIORITY.filter(api => validAPIs[api])
    };
  }

  console.log('🚀 APIManager initialized with fallback support');
  console.log('📡 Primary API:', PRIMARY_API);
  console.log('🔗 Fallback enabled:', ENABLE_FALLBACK);
  console.log('✅ Available APIs:', API_PRIORITY.filter(api => validAPIs[api]).join(', '));

  return {
    search,
    getTrending,
    getDetails,
    getStatus,
    APIs
  };
})();

window.APIManager = APIManager;
