import scraper from '../../utils/scraper';

/**
 * GET /api/stream
 * Query parameters:
 *   - mediaId (string, required) - TMDB ID of the movie or TV show
 *   - type ("movie" | "tv", required)
 *   - season (number, optional, for TV)
 *   - episode (number, optional, for TV)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { mediaId, type, season, episode } = req.query;

  if (!mediaId || !type) {
    return res
      .status(400)
      .json({ success: false, error: 'Missing required parameters: mediaId, type' });
  }

  try {
    const streamSources = await scraper.resolveStreams({
      id: String(mediaId),
      type: String(type),
      season: season ? Number(season) : undefined,
      episode: episode ? Number(episode) : undefined,
    });

    const activeStreams = streamSources.filter(function (s) {
      return s.isPlayable;
    });

    res.status(200).json({
      success: true,
      streams: activeStreams.map(function (s) {
        return {
          provider: s.providerName,
          url: s.streamUrl,
          quality: s.quality,
          subtitles: s.subtitles || [],
        };
      }),
    });
  } catch (error) {
    console.error('CinePro scraping error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch media streams' });
  }
}
