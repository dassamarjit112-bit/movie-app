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

  // The user requested that we always use vidlink.pro with the TMDB id for downloads,
  // because they have a mechanism for auto-downloading from that page.
  const finalUrl = type === 'series'
    ? `https://vidlink.pro/tv/${id}/${season}/${episode}`
    : `https://vidlink.pro/movie/${id}`;

  console.log(`[API] Returning vidlink.pro download link for TMDB ID: ${id}`);

  // Return the resolved download URL
  return res.status(200).json({ 
    success: true, 
    downloadUrl: finalUrl 
  });
};
