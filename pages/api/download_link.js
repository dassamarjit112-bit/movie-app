const axios = require('axios');

/**
 * GET /api/download_link
 * Layer-2 Aggregator Scraper
 * Tries multiple aggregator APIs to resolve a direct Layer-3 cloud link or standard fallback.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { id, type, season, episode } = req.query;

  if (!id || !type) {
    return res.status(400).json({ success: false, error: 'Missing required parameters: id, type' });
  }

  // Step 1: Convert TMDB ID to IMDB ID for Aggregators
  let imdbId = id;
  try {
    const tmdbApiKey = process.env.TMDB_API_KEY || '8d6d91941230817f7807d643736e8a49';
    const tmdbUrl = type === 'series'
      ? `https://api.themoviedb.org/3/tv/${id}/external_ids?api_key=${tmdbApiKey}`
      : `https://api.themoviedb.org/3/movie/${id}/external_ids?api_key=${tmdbApiKey}`;
    
    const tmdbRes = await axios.get(tmdbUrl, { timeout: 3000 });
    if (tmdbRes.data && tmdbRes.data.imdb_id) {
      imdbId = tmdbRes.data.imdb_id;
    }
  } catch (e) {
    console.warn('[DownloadAPI] Failed to convert TMDB to IMDB, falling back to original ID');
  }

  // Define our cluster of Layer-2 Aggregator APIs
  const aggregators = type === 'series' 
    ? [
        `https://vidsrc.to/api/embed/tv/${imdbId}`,
        `https://embed.su/api/tv/${imdbId}`
      ]
    : [
        `https://vidsrc.to/api/embed/movie/${imdbId}`,
        `https://embed.su/api/movie/${imdbId}`
      ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.google.com/'
  };

  let finalUrl = null;

  // Iterate over aggregators until one succeeds
  for (const endpoint of aggregators) {
    try {
      const response = await axios.get(endpoint, { headers, timeout: 5000 });
      
      const data = response.data;
      if (data) {
        if (data.success && data.download_mirror_url) finalUrl = data.download_mirror_url;
        else if (data.url) finalUrl = data.url;
      }

      if (finalUrl) {
        console.log(`[API] Scraped download link from ${endpoint}`);
        break; // Successfully scraped Layer 3 URL
      }
    } catch (e) {
      console.warn(`[API] Failed to scrape aggregator endpoint: ${endpoint}`);
    }
  }

  // If all APIs fail or are blocked, we return a fallback Layer-1 streaming index that contains a download button
  if (!finalUrl) {
    console.log(`[API] All aggregators failed. Falling back to public mirror.`);
    finalUrl = type === 'series'
      ? `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${imdbId}`;
  }

  // Return the resolved download URL
  return res.status(200).json({ 
    success: true, 
    downloadUrl: finalUrl 
  });
};
