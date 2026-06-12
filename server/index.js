require('dotenv').config();
const express = require('express');
const cors = require('cors');
const scraper = require('../utils/scraper');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

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

/**
 * GET /api/scrape
 * Zero-API fallback scraper — searches DuckDuckGo + scrapes TMDB public pages
 * Query parameters:
 *   - search: Movie or TV show name (required)
 *   - type: "movie" or "tv" (optional, default: "movie")
 */
app.get('/api/scrape', async (req, res) => {
  const { search, type = 'movie' } = req.query;
  if (!search) return res.status(400).json({ error: 'Provide a search parameter' });

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const siteTarget = mediaType === 'tv' ? 'site:themoviedb.org/tv' : 'site:themoviedb.org/movie';

  try {
    // Step 1: Search DuckDuckGo HTML to find the TMDB page URL
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(search + ' ' + siteTarget)}`;
    const searchResponse = await axios.get(searchUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    let $ = cheerio.load(searchResponse.data);

    // Extract the first matching TMDB URL from search results
    let tmdbId = null;
    let foundPath = '';
    const tmdbPathPattern = mediaType === 'tv' ? '/tv/' : '/movie/';

    $('.result__url, .result__a, a[href*="themoviedb.org"]').each((i, el) => {
      if (tmdbId) return; // already found
      const text = $(el).text().trim();
      const href = $(el).attr('href') || '';
      const combined = text + ' ' + href;
      const idx = combined.indexOf(tmdbPathPattern);
      if (idx !== -1) {
        const after = combined.slice(idx + tmdbPathPattern.length);
        const idMatch = after.match(/^(\d+)/);
        if (idMatch) {
          tmdbId = idMatch[1];
          foundPath = combined;
        }
      }
    });

    // Fallback: try extracting from raw HTML text
    if (!tmdbId) {
      const rawHtml = searchResponse.data;
      const pattern = new RegExp(`themoviedb\\.org${tmdbPathPattern.replace('/', '\\/')}(\\d+)`, 'i');
      const match = rawHtml.match(pattern);
      if (match) tmdbId = match[1];
    }

    if (!tmdbId) {
      return res.status(404).json({
        success: false,
        error: 'Could not locate a matching TMDB page for this title. Try a more specific search term.'
      });
    }

    // Step 2: Fetch and parse the TMDB public movie/tv page
    const targetUrl = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;
    const pageResponse = await axios.get(targetUrl, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    $ = cheerio.load(pageResponse.data);

    // Extract title
    const title =
      $('div.title h2 a').first().text().trim() ||
      $('section.inner_content h2 a').first().text().trim() ||
      $('h2').first().text().trim() ||
      search;

    // Extract overview/description
    const overview =
      $('div.overview p').text().trim() ||
      $('[class*="overview"] p').text().trim() ||
      $('p.overview').text().trim() ||
      '';

    // Extract poster image
    let posterPath = null;
    const posterImgEl = $('img.poster').first() || $('[class*="poster"] img').first();
    const rawSrc = posterImgEl.attr('src') || posterImgEl.attr('data-src') || '';
    if (rawSrc) {
      posterPath = rawSrc.startsWith('http') ? rawSrc : `https://image.tmdb.org/t/p/w500${rawSrc}`;
    }

    // Extract cast from actor cards
    const cast = [];
    $('li.card', 'ol.people').each((i, el) => {
      if (i >= 6) return;
      const name = $(el).find('p a').first().text().trim();
      const character = $(el).find('p.character').text().trim().replace(/\s+/g, ' ');
      if (name) cast.push({ name, character });
    });

    // Extract year/release date
    const releaseText = $('span.release_date').text().trim() ||
                        $('[class*="release_date"]').text().trim() || '';
    const yearMatch = releaseText.match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : null;

    // Build stream URLs from the scraped TMDB ID
    const streams = mediaType === 'tv' ? [
      `https://www.2embed.cc/embedtv/${tmdbId}&s=1&e=1`,
      `https://vidlink.pro/tv/${tmdbId}/1/1`,
      `https://autoembed.co/tv/tmdb/${tmdbId}-1-1`
    ] : [
      `https://www.2embed.cc/embed/${tmdbId}`,
      `https://vidlink.pro/movie/${tmdbId}`,
      `https://autoembed.co/movie/tmdb/${tmdbId}`
    ];

    return res.json({
      success: true,
      tmdb_id: tmdbId,
      title,
      year,
      type: mediaType,
      description: overview,
      poster: posterPath,
      cast_list: cast,
      stream: streams[0],
      streams,
      source_url: targetUrl
    });

  } catch (error) {
    console.error('Scraping engine error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve public movie data. The external site may be temporarily unavailable.'
    });
  }
});

/**
 * GET /api/sports/fancode
 * Scrapes and formats the community FanCode JSON stream index
 */
const FANCODE_MIRROR_JSON = "https://raw.githubusercontent.com/kajju027/Fancode-Events-Json/main/fancode.json";

app.get('/api/sports/fancode', async (req, res) => {
  try {
    const response = await axios.get(FANCODE_MIRROR_JSON, { timeout: 10000 });
    const liveMatches = response.data.matches || response.data || [];
    
    if (!Array.isArray(liveMatches)) {
      throw new Error("Invalid response format from FanCode mirror");
    }

    // Format data cleanly to sync with existing UI architecture
    const formattedFixtures = liveMatches.map((match, i) => ({
      matchId: match.match_id || `fc-${i}`,
      title: match.match_name || 'FanCode Event',
      tournament: match.event_name || 'Premium Sports',
      sportType: (match.event_category || 'cricket').toLowerCase(),
      homeTeam: match.team_1_name || 'Team 1',
      awayTeam: match.team_2_name || 'Team 2',
      homeLogo: match.team_1_flag || '',
      awayLogo: match.team_2_flag || '',
      banner: match.banner || '',
      streamUrl: match.stream_link || '',
      status: 'LIVE',
      score: 'LIVE',
      isFancode: true
    }));

    return res.json({ success: true, matches: formattedFixtures });
  } catch (error) {
    console.error("FanCode routing node failure:", error.message);
    return res.status(500).json({ error: "FanCode server cluster unreachable" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`CinePro backend listening on http://localhost:${PORT}`);
});
