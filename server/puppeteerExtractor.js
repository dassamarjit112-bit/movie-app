const puppeteerBase = require('puppeteer');

/**
 * CineStream — Headless Stream Extractor
 * Uses Puppeteer network interception to snatch the raw .m3u8 HLS master playlist URL.
 */
async function extractMasterPlaylistUrl(tmdbId, type = 'movie', season = 1, episode = 1) {
  let browser;

  try {
    console.log(`[Extractor] Starting extraction for TMDB:${tmdbId} type:${type}`);
    const chromePath = await puppeteerBase.executablePath();

    browser = await puppeteerBase.launch({
      headless: true,
      executablePath: chromePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--window-size=1280,720',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let videoStreamUrl = null;
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('.m3u8') || url.includes('playlist.m3u8')) {
        videoStreamUrl = url;
      }
      if (request.resourceType() === 'image' || url.includes('analytics') || url.includes('popads')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    const sources = type === 'series'
      ? [`https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`]
      : [`https://vidlink.pro/movie/${tmdbId}`, `https://vidsrc.to/embed/movie/${tmdbId}`];

    for (const targetUrl of sources) {
      if (videoStreamUrl) break;
      console.log(`[Extractor] Navigating to: ${targetUrl}`);

      try {
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        
        const playButtonSelector = '.play-button, iframe, video, .plyr__control--overlaid'; 
        if (await page.$(playButtonSelector)) {
          await page.click(playButtonSelector).catch(() => {});
        }
        
        // Wait slightly to allow background API handshakes to resolve
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.warn(`[Extractor] Warning on ${targetUrl}: ${error.message}`);
      }
    }

    if (videoStreamUrl) {
      console.log(`[Extractor] ✅ Stream extracted: ${videoStreamUrl}`);
    } else {
      console.log(`[Extractor] ❌ No stream extracted.`);
    }

    return videoStreamUrl;

  } catch (error) {
    console.error(`[Extractor] Fatal error:`, error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

module.exports = { extractMasterPlaylistUrl };
