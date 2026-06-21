require('dotenv').config();
const express = require('express');
const cors = require('cors');
const scraper = require('../utils/scraper');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────────────────────────
// Embedded Streaming Servers — India-friendly + Worldwide
// These servers work great in India for all movie types:
// Old classics, Bollywood, Hollywood, South Indian, etc.
// ──────────────────────────────────────────────────────────────
const STREAM_SERVERS = {
  movie: {
    // Primary embed servers (highest reliability in India)
    vidsrc_to: (id) => `https://vidsrc.to/embed/movie/${id}`,
    vidsrc_me: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}`,
    embed_su: (id) => `https://embed.su/embed/movie/${id}`,
    embed2: (id) => `https://www.2embed.cc/embed/${id}`,
    vidlink: (id) => `https://vidlink.pro/movie/${id}`,
    autoembed: (id) => `https://autoembed.co/movie/tmdb/${id}`,
    multiembed: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    moviesapi: (id) => `https://moviesapi.club/movie/${id}`,
    vidsrc_icu: (id) => `https://vidsrc.icu/embed/movie/${id}`,
    superembed: (id) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`,
    // Indian-friendly servers for Bollywood & regional content
    hindimovies: (id) => `https://hindimovies.to/embed/movie/${id}`,
    dbgo: (id) => `https://dbgo.fun/embed/movie/${id}`,
    flix555: (id) => `https://flix555.com/movie/${id}`,
    streamimdb: (id) => `https://streamimdb.ru/embed/movie/${id}`,
    // Old movies & classics servers
    clasicos: (id) => `https://clasicos.netlify.app/embed/movie/${id}`,
    moviesapi_club: (id) => `https://moviesapi.club/movie/${id}`,
  },
  tv: {
    vidsrc_to: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
    vidsrc_me: (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
    embed_su: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
    embed2: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
    vidlink: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
    autoembed: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`,
    moviesapi: (id, s, e) => `https://moviesapi.club/tv/${id}-${s}-${e}`,
    multiembed: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
    vidsrc_icu: (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}`,
    streamimdb: (id, s, e, imdbId) => `https://streamimdb.ru/embed/tv/${imdbId || id}/${s}/${e}`,
    dbgo: (id, s, e) => `https://dbgo.fun/embed/tv/${id}/${s}/${e}`,
  }
};

// ── Server Health Check ───────────────────────────────────────
// Pre-checks which embed servers are responding before returning to client
const SERVER_TIMEOUT = 5000; // 5 second timeout per server

async function checkServerHealth(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SERVER_TIMEOUT);
    const res = await axios.get(url, {
      signal: controller.signal,
      timeout: SERVER_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      validateStatus: (status) => status < 500 // Accept any non-500 status
    });
    clearTimeout(timeoutId);
    // Consider server healthy if we get any response that's not a 5xx
    return res.status < 500;
  } catch (err) {
    return false;
  }
}

/**
 * GET /api/servers/health
 * Returns which streaming servers are currently online and responsive
 */
app.get('/api/servers/health', async (req, res) => {
  const { tmdbId, type = 'movie', season, episode } = req.query;
  if (!tmdbId) {
    return res.status(400).json({ success: false, error: 'tmdbId is required' });
  }

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const servers = STREAM_SERVERS[mediaType];
  const results = [];

  for (const [name, builder] of Object.entries(servers)) {
    let url;
    if (mediaType === 'tv') {
      const s = parseInt(season) || 1;
      const e = parseInt(episode) || 1;
      url = builder(tmdbId, s, e, null);
    } else {
      url = builder(tmdbId);
    }
    
    const isAlive = await checkServerHealth(url);
    results.push({ name, url, isAlive, status: isAlive ? 'online' : 'offline' });
  }

  // Sort: online first, then offline
  results.sort((a, b) => (a.isAlive === b.isAlive ? 0 : a.isAlive ? -1 : 1));

  res.json({ success: true, servers: results });
});

/**
 * GET /api/servers/list
 * Returns all available streaming servers without health check
 */
app.get('/api/servers/list', (req, res) => {
  const { type = 'all' } = req.query;
  if (type === 'movie') {
    const servers = Object.entries(STREAM_SERVERS.movie).map(([name, builder]) => ({
      name,
      url: builder('{TMDB_ID}'),
      pattern: builder('{TMDB_ID}'),
      type: 'movie'
    }));
    return res.json({ success: true, servers });
  } else if (type === 'tv') {
    const servers = Object.entries(STREAM_SERVERS.tv).map(([name, builder]) => ({
      name,
      url: builder('{TMDB_ID}', '{SEASON}', '{EPISODE}', '{IMDB_ID}'),
      pattern: builder('{TMDB_ID}', '{SEASON}', '{EPISODE}', '{IMDB_ID}'),
      type: 'tv'
    }));
    return res.json({ success: true, servers });
  }
  
  // Return all servers
  const allServers = {};
  for (const [mediaType, serverMap] of Object.entries(STREAM_SERVERS)) {
    allServers[mediaType] = Object.keys(serverMap);
  }
  res.json({ success: true, servers: allServers });
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

/**
 * GET /api/scrape
 * Zero-API fallback scraper — searches DuckDuckGo + scrapes TMDB public pages
 */
app.get('/api/scrape', async (req, res) => {
  const { search, type = 'movie' } = req.query;
  if (!search) return res.status(400).json({ error: 'Provide a search parameter' });

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const siteTarget = mediaType === 'tv' ? 'site:themoviedb.org/tv' : 'site:themoviedb.org/movie';

  try {
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
    let tmdbId = null;
    let foundPath = '';
    const tmdbPathPattern = mediaType === 'tv' ? '/tv/' : '/movie/';

    $('.result__url, .result__a, a[href*="themoviedb.org"]').each((i, el) => {
      if (tmdbId) return;
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

    if (!tmdbId) {
      const rawHtml = searchResponse.data;
      const pattern = new RegExp(`themoviedb\\.org${tmdbPathPattern.replace('/', '\\/')}(\\d+)`, 'i');
      const match = rawHtml.match(pattern);
      if (match) tmdbId = match[1];
    }

    if (!tmdbId) {
      return res.status(404).json({
        success: false,
        error: 'Could not locate a matching TMDB page for this title.'
      });
    }

    // Step 2: Fetch and parse the TMDB public page
    const targetUrl = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;
    const pageResponse = await axios.get(targetUrl, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    $ = cheerio.load(pageResponse.data);

    const title =
      $('div.title h2 a').first().text().trim() ||
      $('section.inner_content h2 a').first().text().trim() ||
      $('h2').first().text().trim() ||
      search;

    const overview =
      $('div.overview p').text().trim() ||
      $('[class*="overview"] p').text().trim() ||
      $('p.overview').text().trim() ||
      '';

    let posterPath = null;
    const posterImgEl = $('img.poster').first() || $('[class*="poster"] img').first();
    const rawSrc = posterImgEl.attr('src') || posterImgEl.attr('data-src') || '';
    if (rawSrc) {
      posterPath = rawSrc.startsWith('http') ? rawSrc : `https://image.tmdb.org/t/p/w500${rawSrc}`;
    }

    const cast = [];
    $('li.card', 'ol.people').each((i, el) => {
      if (i >= 6) return;
      const name = $(el).find('p a').first().text().trim();
      const character = $(el).find('p.character').text().trim().replace(/\s+/g, ' ');
      if (name) cast.push({ name, character });
    });

    const releaseText = $('span.release_date').text().trim() ||
                        $('[class*="release_date"]').text().trim() || '';
    const yearMatch = releaseText.match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : null;

    // Build ALL embed streams using the server list
    const embedServers = STREAM_SERVERS[mediaType];
    const streams = Object.entries(embedServers).map(([name, builder]) => {
      if (mediaType === 'tv') {
        return { name, url: builder(tmdbId, 1, 1, null) };
      }
      return { name, url: builder(tmdbId) };
    });

    return res.json({
      success: true,
      tmdb_id: tmdbId,
      title,
      year,
      type: mediaType,
      description: overview,
      poster: posterPath,
      cast_list: cast,
      stream: streams[0]?.url || '',
      streams,
      source_url: targetUrl
    });

  } catch (error) {
    console.error('Scraping engine error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve public movie data.'
    });
  }
});

/**
 * GET /api/sports/fancode
 */
const FANCODE_MIRROR_JSON = "https://raw.githubusercontent.com/kajju027/Fancode-Events-Json/main/fancode.json";

app.get('/api/sports/fancode', async (req, res) => {
  try {
    const response = await axios.get(FANCODE_MIRROR_JSON, { timeout: 10000 });
    const liveMatches = response.data.matches || response.data || [];
    
    if (!Array.isArray(liveMatches)) {
      throw new Error("Invalid response format from FanCode mirror");
    }

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
  console.log(`Stream servers loaded: Movies=${Object.keys(STREAM_SERVERS.movie).length}, TV=${Object.keys(STREAM_SERVERS.tv).length}`);
});