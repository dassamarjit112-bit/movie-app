module.exports = async function handler(req, res) {
  // Allow CORS if necessary (or rely on next.js/vercel defaults)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { id, type = 'movie', season = 1, episode = 1, title = 'movie' } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing TMDB id' });
  
  console.log(`[JobAPI Serverless] Requesting background extraction for TMDB ID: ${id}`);
  
  let downloadUrl = null;
  // Vercel serverless functions cannot run Puppeteer. 
  // We instantly fail this to trigger the client-side Layer-2 fallbacks in download-manager.js

  if (!downloadUrl || !downloadUrl.startsWith('http')) {
    return res.status(404).json({ success: false, error: 'Could not extract a stream URL from the provider.' });
  }

  const safeTitle = (title || 'cinestream').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
  const filename = `${safeTitle}_${type === 'series' ? `S${season}E${episode}` : 'movie'}.mp4`;

  res.status(200).json({ success: true, directDownloadUrl: downloadUrl, filename });
};
