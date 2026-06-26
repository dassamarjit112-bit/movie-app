const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * CineStream — Headless Stream Extractor
 *
 * Launches a stealth Puppeteer browser and intercepts network traffic to snatch
 * the raw .m3u8 HLS master playlist URL from multiple embed providers.
 *
 * Priority order:
 *   1. vidlink.pro   (best m3u8 exposure, well-known endpoint pattern)
 *   2. vidsrc.to     (widely available, may require click)
 *   3. embed.su      (fallback)
 *   4. multiembed    (last resort)
 */
async function extractMasterPlaylistUrl(tmdbId, type = 'movie', season = 1, episode = 1) {
  let browser;
  try {
    console.log(`[PuppeteerExtractor] Launching stealth browser for TMDB ID: ${tmdbId} (${type})`);

    browser = await puppeteer.launch({
      headless: 'new',
      protocolTimeout: 120000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,720',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Realistic Chrome UA
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    // Extra headers to look like a real browser navigating from Google
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.google.com/',
    });

    await page.setRequestInterception(true);

    let m3u8Url = null;

    // ── Request-level interception ────────────────────────────────────────────
    page.on('request', (request) => {
      const url = request.url();

      // Snatch m3u8 from outgoing requests
      if (url.includes('.m3u8')) {
        if (!m3u8Url) {
          console.log(`[PuppeteerExtractor] ✅ M3U8 captured (request): ${url}`);
          m3u8Url = url;
        }
        request.abort(); // Stop loading the stream — we just need the URL
        return;
      }

      // Block heavy assets to speed up extraction significantly
      const type = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media', 'ping'].includes(type)) {
        request.abort();
        return;
      }

      // Block known ad/tracker networks
      const adPatterns = ['popads', 'analytics', 'doubleclick', 'googlesyndication', 'adservice'];
      if (adPatterns.some((p) => url.includes(p))) {
        request.abort();
        return;
      }

      request.continue();
    });

    // ── Response-level interception ───────────────────────────────────────────
    // Some providers fetch the playlist from a JSON API — sniff those too
    page.on('response', async (response) => {
      if (m3u8Url) return;
      const url = response.url();
      if (url.includes('.m3u8')) {
        console.log(`[PuppeteerExtractor] ✅ M3U8 captured (response): ${url}`);
        m3u8Url = url;
      }
    });

    // ── Source priority list ──────────────────────────────────────────────────
    const sources =
      type === 'series'
        ? [
            `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`,
            `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,
            `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`,
          ]
        : [
            `https://vidlink.pro/movie/${tmdbId}`,
            `https://vidsrc.to/embed/movie/${tmdbId}`,
            `https://embed.su/embed/movie/${tmdbId}`,
            `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
          ];

    for (const sourceUrl of sources) {
      if (m3u8Url) break;

      console.log(`[PuppeteerExtractor] → Navigating to: ${sourceUrl}`);
      try {
        await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (navError) {
        console.warn(`[PuppeteerExtractor] Navigation error: ${navError.message}`);
      }

      // Give JS time to boot, then aggressively poke the player
      const POLL_INTERVAL_MS = 400;
      const MAX_WAIT_MS = 15000;
      let elapsed = 0;

      while (!m3u8Url && elapsed < MAX_WAIT_MS) {
        try {
          // Click the center of the viewport (play button / overlay area)
          await page.mouse.click(640, 360);
          // Also press Space in case the video element has focus
          await page.keyboard.press('Space');
          // Click the specific selectors VidLink uses
          await page.click('video').catch(() => {});
          await page.click('.play-button, .jw-icon-playback, [aria-label="Play"], .plyr__control--overlaid').catch(() => {});
        } catch (_) {}

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        elapsed += POLL_INTERVAL_MS;
      }

      if (m3u8Url) break;
      console.log(`[PuppeteerExtractor] No m3u8 found on ${sourceUrl}, trying next source...`);
    }

    return m3u8Url || null;
  } catch (error) {
    console.error(`[PuppeteerExtractor] Fatal error:`, error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

module.exports = { extractMasterPlaylistUrl };
