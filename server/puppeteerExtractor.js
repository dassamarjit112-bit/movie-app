const puppeteer = require('puppeteer');

/**
 * Headless extraction of the master m3u8 playlist from iframe embed URLs
 * Uses puppeteer to intercept network requests, exactly mimicking an Electron environment.
 */
async function extractMasterPlaylistUrl(tmdbId, type, season, episode) {
  let browser;
  try {
    console.log(`[PuppeteerExtractor] Launching headless browser...`);
    browser = await puppeteer.launch({
      headless: 'new',
      protocolTimeout: 120000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    // Intercept network requests to catch the m3u8
    await page.setRequestInterception(true);

    let m3u8Url = null;
    
    // Listen to network requests
    page.on('request', request => {
      const url = request.url();
      if (url.includes('.m3u8')) {
        console.log(`[PuppeteerExtractor] Found M3U8: ${url}`);
        m3u8Url = url;
        // Optionally abort further requests to save bandwidth once we have what we need
        request.abort();
      } else {
        // Block heavy media to speed up extraction
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      }
    });

    const sources = type === 'series'
      ? [
          `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,
          `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`
        ]
      : [
          `https://vidsrc.to/embed/movie/${tmdbId}`,
          `https://embed.su/embed/movie/${tmdbId}`,
          `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
        ];

    for (const url of sources) {
      console.log(`[PuppeteerExtractor] Navigating to: ${url}`);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        
        // Wait an extra few seconds for JS to execute and trigger the stream request
        // Aggressively click the center of the viewport to bypass play buttons / ad overlays
        for(let i=0; i<20; i++) {
          if(m3u8Url) break;
          try {
            await page.mouse.click(400, 300);
            // Also try pressing Space or Enter in case the player is focused
            await page.keyboard.press('Space');
          } catch(e) {}
          await new Promise(r => setTimeout(r, 500));
        }
        
        if (m3u8Url) break;
      } catch (err) {
        console.error(`[PuppeteerExtractor] Error on ${url}: ${err.message}`);
      }
    }

    return m3u8Url;
  } catch (error) {
    console.error(`[PuppeteerExtractor] Fatal error:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { extractMasterPlaylistUrl };
