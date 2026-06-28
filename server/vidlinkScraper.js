const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * Scrapes vidlink.pro to extract the actual .m3u8 or .mp4 URL by intercepting network requests.
 * @param {string} tmdbId - The TMDB ID of the content.
 * @param {string} type - 'movie' or 'tv'
 * @param {string} season - Season number (if tv)
 * @param {string} episode - Episode number (if tv)
 * @returns {Promise<string|null>} - The direct media URL or null if not found.
 */
async function scrapeVidlink(tmdbId, type = 'movie', season = '', episode = '') {
  const targetUrl = type === 'series' || type === 'tv' 
    ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`
    : `https://vidlink.pro/movie/${tmdbId}`;

  console.log(`[VidlinkScraper] Starting stealth scraper for: ${targetUrl}`);
  
  let browser;
  try {
    const fs = require('fs');
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    
    browser = await puppeteer.launch({
      executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--mute-audio'
      ]
    });

    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    
    let mediaUrl = null;

    // Intercept requests to catch the m3u8 or mp4 file
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      
      // Look for master playlist or any mp4 file
      if (url.includes('.m3u8') || url.includes('.mp4')) {
        // Exclude some ad or tracking junk if necessary, but usually the first .m3u8 is the main video or playlist
        if (!url.includes('ad') && !url.includes('tracker')) {
          console.log(`[VidlinkScraper] Intercepted media URL: ${url}`);
          if (!mediaUrl) mediaUrl = url;
        }
      }
      request.continue();
    });

    // Go to the vidlink page
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Sometimes play button needs to be clicked for the request to fire
    console.log(`[VidlinkScraper] Page loaded. Waiting for network requests...`);
    
    // Wait up to 10 seconds to see if mediaUrl was caught
    for (let i = 0; i < 20; i++) {
      if (mediaUrl) break;
      await new Promise(r => setTimeout(r, 500));
      
      // Try to click play button if available
      try {
        await page.evaluate(() => {
          const playBtn = document.querySelector('.vjs-big-play-button') || document.querySelector('button');
          if (playBtn) playBtn.click();
        });
      } catch (e) {}
    }

    if (mediaUrl) {
      console.log(`[VidlinkScraper] Successfully extracted media link: ${mediaUrl}`);
    } else {
      console.log(`[VidlinkScraper] Failed to find .m3u8 or .mp4 in network tab.`);
    }

    await browser.close();
    return mediaUrl;

  } catch (error) {
    console.error('[VidlinkScraper] Error during scraping:', error.message);
    if (browser) await browser.close();
    return null;
  }
}

module.exports = { scrapeVidlink };
