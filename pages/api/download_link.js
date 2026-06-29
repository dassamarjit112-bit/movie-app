const { scrapeVidlink } = require('../../../server/vidlinkScraper');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { id, type, season = 1, episode = 1 } = req.query;

  if (!id || !type) {
    return res.status(400).json({ success: false, error: 'Missing required parameters: id, type' });
  }

  console.log(`[API] Scraping vidlink.pro for direct MP4 link for TMDB ID: ${id}`);

  let finalUrl = null;
  try {
    finalUrl = await scrapeVidlink(id, type, season, episode);
  } catch (err) {
    console.error('Scraping error:', err.message);
  }

  if (finalUrl) {
    return res.status(200).json({ 
      success: true, 
      downloadUrl: finalUrl 
    });
  } else {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to extract direct MP4 from vidlink.pro' 
    });
  }
};
