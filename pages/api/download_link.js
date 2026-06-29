const axios = require('axios');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { id, type, season = 1, episode = 1 } = req.query;

  if (!id || !type) {
    return res.status(400).json({ success: false, error: 'Missing required parameters: id, type' });
  }

  console.log(`[API Serverless] Resolving download for TMDB ID: ${id} (${type})`);

  let imdbId = id;
  let movieTitle = null;
  let movieYear = null;

  // Resolve TMDB -> IMDB + title/year
  try {
    const tmdbApiKey = process.env.TMDB_API_KEY || '8d6d91941230817f7807d643736e8a49';
    const tmdbUrl = type === 'series' || type === 'tv'
      ? `https://api.themoviedb.org/3/tv/${id}?api_key=${tmdbApiKey}&append_to_response=external_ids`
      : `https://api.themoviedb.org/3/movie/${id}?api_key=${tmdbApiKey}&append_to_response=external_ids`;
    const tmdbRes = await axios.get(tmdbUrl, { timeout: 5000 });
    if (tmdbRes.data) {
      if (tmdbRes.data.external_ids?.imdb_id) {
        imdbId = tmdbRes.data.external_ids.imdb_id;
      }
      movieTitle = tmdbRes.data.title || tmdbRes.data.name;
      const rd = tmdbRes.data.release_date || tmdbRes.data.first_air_date;
      if (rd) movieYear = rd.split('-')[0];
    }
  } catch (e) {
    console.warn('[API Serverless] TMDB lookup failed, continuing with raw ID.');
  }

  let finalUrl = null;
  let isM3U8 = false;

  // Step 1: Vercel does not support Puppeteer. Skip headless extraction on Vercel.
  console.log(`[API Serverless] Skipping headless browser extraction on serverless environment...`);

  // Step 3: Layer-2 aggregator APIs
  if (!finalUrl) {
    try {
      console.log(`[API Serverless] Step 3: Layer-2 aggregator APIs...`);
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
            console.log(`[API Serverless] Aggregator hit: ${endpoint}`);
            break;
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error('[API Serverless] Aggregators lookup failed:', err.message);
    }
  }

  // Step 4: Layer-1 embed fallback
  if (!finalUrl) {
    console.log(`[API Serverless] Step 4: All scrapers failed. Returning embed player URL.`);
    finalUrl = type === 'series' || type === 'tv'
      ? `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${imdbId}`;
  }

  return res.status(200).json({
    success: true,
    downloadUrl: finalUrl,
    isM3U8,
    title: movieTitle
  });
};
