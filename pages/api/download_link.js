const axios = require('axios');
const { scrapeVidlink } = require('../../server/vidlinkScraper');
const { scrapeLayer3Link } = require('../../server/vegaScraper');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { id, type, season = 1, episode = 1 } = req.query;

  if (!id || !type) {
    return res.status(400).json({ success: false, error: 'Missing required parameters: id, type' });
  }

  console.log(`[API] Resolving download link for TMDB ID: ${id} (${type})`);

  // ── Step 0: Resolve TMDB → IMDB + title/year ──────────────────────────────
  let imdbId = id;
  let movieTitle = null;
  let movieYear = null;

  try {
    const tmdbApiKey = process.env.TMDB_API_KEY || '8d6d91941230817f7807d643736e8a49';
    const tmdbUrl = type === 'series' || type === 'tv'
      ? `https://api.themoviedb.org/3/tv/${id}?api_key=${tmdbApiKey}&append_to_response=external_ids`
      : `https://api.themoviedb.org/3/movie/${id}?api_key=${tmdbApiKey}&append_to_response=external_ids`;
    const tmdbRes = await axios.get(tmdbUrl, { timeout: 5000 });
    if (tmdbRes.data) {
      if (tmdbRes.data.external_ids?.imdb_id) {
        imdbId = tmdbRes.data.external_ids.imdb_id;
        console.log(`[API] TMDB ${id} → IMDB ${imdbId}`);
      }
      movieTitle = tmdbRes.data.title || tmdbRes.data.name;
      const rd = tmdbRes.data.release_date || tmdbRes.data.first_air_date;
      if (rd) movieYear = rd.split('-')[0];
    }
  } catch (e) {
    console.warn('[API] TMDB lookup failed, continuing with raw ID.');
  }

  let finalUrl = null;
  let isM3U8 = false;

  // ── Step 1: Puppeteer headless extraction (primary method) ────────────────
  try {
    console.log(`[API] Step 1: Headless browser extraction via vidlink.pro...`);
    finalUrl = await scrapeVidlink(id, type, season, episode);
    if (finalUrl) {
      console.log(`[API] ✅ Headless extraction succeeded: ${finalUrl}`);
      if (finalUrl.includes('.m3u8')) {
        isM3U8 = true;
      }
    }
  } catch (err) {
    console.warn('[API] Step 1: Headless extraction failed/unsupported:', err.message);
  }

  // ── Step 2: VegaMovies stealth scrape ─────────────────────────────────────
  if (!finalUrl && movieTitle) {
    try {
      console.log(`[API] Step 2: VegaMovies stealth scrape for '${movieTitle}'...`);
      finalUrl = await scrapeLayer3Link(movieTitle, movieYear, type === 'series' || type === 'tv' ? 'tv' : 'movie');
    } catch (err) {
      console.warn('[API] Step 2: VegaMovies scrape failed:', err.message);
    }
  }

  // ── Step 3: Layer-2 aggregator APIs ──────────────────────────────────────
  if (!finalUrl) {
    console.log(`[API] Step 3: Layer-2 aggregator APIs...`);
    const aggregators = type === 'series' || type === 'tv'
      ? [`https://vidsrc.to/api/embed/tv/${imdbId}`, `https://embed.su/api/tv/${imdbId}`]
      : [`https://vidsrc.to/api/embed/movie/${imdbId}`, `https://embed.su/api/movie/${imdbId}`];
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.google.com/',
    };
    for (const endpoint of aggregators) {
      try {
        const r = await axios.get(endpoint, { headers, timeout: 5000 });
        const d = r.data;
        if (d?.download_mirror_url) finalUrl = d.download_mirror_url;
        else if (d?.url) finalUrl = d.url;
        if (finalUrl) { 
          console.log(`[API] Aggregator hit: ${endpoint}`); 
          break; 
        }
      } catch (_) {}
    }
  }

  // ── Step 4: Layer-1 embed fallback ────────────────────────────────────────
  if (!finalUrl) {
    console.log(`[API] Step 4: All scrapers failed. Returning embed player URL.`);
    finalUrl = type === 'series' || type === 'tv'
      ? `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${imdbId}`;
  }

  if (finalUrl) {
    return res.status(200).json({ 
      success: true, 
      downloadUrl: finalUrl,
      isM3U8,
      title: movieTitle
    });
  } else {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to extract download link from all sources' 
    });
  }
};
