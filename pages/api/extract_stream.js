const { spawn, exec } = require('child_process');
const axios = require('axios');
const path = require('path');

module.exports = async function handler(req, res) {
  // Fast response for HEAD requests
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  const { id, type = 'movie', season = 1, episode = 1, title = 'movie' } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing TMDB id' });

  console.log(`[ExtractStream Serverless] Starting extraction for TMDB ID: ${id}`);

  let m3u8Url = null;
  try {
    // Run the standalone scraper script in a child process
    const scriptPath = path.join(process.cwd(), 'server', 'puppeteerStandalone.js');
    
    m3u8Url = await new Promise((resolve) => {
      exec(`node ${scriptPath} ${id} ${type} ${season} ${episode}`, { timeout: 45000 }, (error, stdout) => {
        if (error || !stdout) {
          console.error('[ExtractStream Serverless] Standalone script error:', error?.message);
          resolve(null);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  } catch (err) {
    console.error('[ExtractStream Serverless] Extraction failed:', err.message);
  }

  // If Puppeteer standalone failed, try to fallback to Layer-2/3 aggregator links from download_link logic
  if (!m3u8Url || !m3u8Url.startsWith('http')) {
    try {
      console.log('[ExtractStream Serverless] Puppeteer extraction failed. Attempting to resolve via download_link fallbacks...');
      const tmdbApiKey = process.env.TMDB_API_KEY || '8d6d91941230817f7807d643736e8a49';
      const tmdbUrl = type === 'series' || type === 'tv'
        ? `https://api.themoviedb.org/3/tv/${id}?api_key=${tmdbApiKey}&append_to_response=external_ids`
        : `https://api.themoviedb.org/3/movie/${id}?api_key=${tmdbApiKey}&append_to_response=external_ids`;
      const tmdbRes = await axios.get(tmdbUrl, { timeout: 3000 });
      let imdbId = id;
      if (tmdbRes.data?.external_ids?.imdb_id) {
        imdbId = tmdbRes.data.external_ids.imdb_id;
      }

      const aggregators = type === 'series' || type === 'tv'
        ? [`https://vidsrc.to/api/embed/tv/${imdbId}`, `https://embed.su/api/tv/${imdbId}`]
        : [`https://vidsrc.to/api/embed/movie/${imdbId}`, `https://embed.su/api/movie/${imdbId}`];
      
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.google.com/',
      };
      
      for (const endpoint of aggregators) {
        try {
          const r = await axios.get(endpoint, { headers, timeout: 3000 });
          const d = r.data;
          const url = d?.download_mirror_url || d?.url;
          if (url && url.startsWith('http')) {
            m3u8Url = url;
            console.log(`[ExtractStream Serverless] Resolved fallback URL: ${m3u8Url}`);
            break;
          }
        } catch (_) {}
      }
    } catch (fallbackErr) {
      console.error('[ExtractStream Serverless] Fallback resolution failed:', fallbackErr.message);
    }
  }

  // Return 404 so that the client falls back to the native anchor download.
  if (!m3u8Url || !m3u8Url.startsWith('http')) {
    return res.status(404).json({
      success: false,
      error: 'Could not extract a stream URL. The provider requires a persistent browser session.',
    });
  }

  // Sanitise filename for Content-Disposition header
  const safeTitle = (title || 'cinestream').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
  const filename = `${safeTitle}_${type === 'series' ? `S${season}E${episode}` : 'movie'}.mp4`;

  // Set response headers so the browser triggers a real Save-As dialog
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'video/mp4');

  const isMp4 = m3u8Url.includes('.mp4');
  if (isMp4) {
    console.log(`[ExtractStream Serverless] Direct MP4 detected. Proxying without FFmpeg → ${filename}`);
    try {
      const streamRes = await axios({
        method: 'get',
        url: m3u8Url,
        responseType: 'stream',
        headers: {
          'Referer': 'https://vidlink.pro/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (streamRes.headers['content-length']) {
        res.setHeader('Content-Length', streamRes.headers['content-length']);
      }
      
      streamRes.data.pipe(res);
      req.on('close', () => { if (streamRes.data.destroy) streamRes.data.destroy(); });
    } catch (e) {
      console.error('[ExtractStream Serverless] MP4 proxy error:', e.message);
      if (!res.headersSent) res.status(500).json({ error: 'MP4 proxy failed' });
      else res.end();
    }
    return;
  }

  // Vercel Serverless Functions do not support FFmpeg binaries!
  // Send 404 to trigger fallback
  console.log(`[ExtractStream Serverless] FFmpeg is not supported on Vercel for m3u8 piping.`);
  return res.status(404).json({ success: false, error: 'FFmpeg not supported on serverless environment.' });
};
