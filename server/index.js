require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { CineProScraper } = require('@cinepro/core');

const app = express();
app.use(cors());
app.use(express.json());

// Initialise scraper with TMDB API key from environment variables
const scraper = new CineProScraper({
  tmdbApiKey: process.env.TMDB_API_KEY,
  timeout: 10000 // 10 seconds timeout
});

/**
 * GET /api/stream
 * Query parameters:
 *   - mediaId: TMDB ID of the movie or TV show (required)
 *   - type: "movie" or "tv" (required)
 *   - season: season number (optional, for TV shows)
 *   - episode: episode number (optional, for TV shows)
 */
app.get('/api/stream', async (req, res) => {
  const { mediaId, type, season, episode } = req.query;
  if (!mediaId || !type) {
    return res.status(400).json({ success: false, error: 'mediaId and type are required' });
  }
  try {
    const streamSources = await scraper.resolveStreams({
      id: mediaId,
      type: type,
      season: season ? Number(season) : undefined,
      episode: episode ? Number(episode) : undefined
    });
    const activeStreams = streamSources.filter(src => src.isPlayable);
    const payload = activeStreams.map(s => ({
      provider: s.providerName,
      url: s.streamUrl,
      quality: s.quality,
      subtitles: s.subtitles || []
    }));
    res.json({ success: true, streams: payload });
  } catch (err) {
    console.error('CinePro scraping error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch media streams' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`CinePro backend listening on http://localhost:${PORT}`);
});
