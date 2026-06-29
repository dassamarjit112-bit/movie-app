const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

function isAdOrTracker(url) {
  const lower = url.toLowerCase();
  return lower.includes('tracker') || 
         lower.includes('analytics') || 
         lower.includes('/ads/') || 
         lower.includes('adserver') || 
         lower.includes('adsystem') || 
         lower.includes('adservice') || 
         lower.includes('popads') || 
         lower.includes('doubleclick') ||
         lower.includes('google-analytics');
}

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
    let mp4Url = null;
    let m3u8Url = null;

    // Intercept requests to catch the m3u8 or mp4 file
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      
      if ((url.includes('.mp4') || url.includes('.m3u8') || url.includes('playlist') || url.includes('/master') || url.includes('/stream')) && !isAdOrTracker(url)) {
        if (url.includes('.mp4')) {
          console.log(`[VidlinkScraper] Intercepted MP4 URL: ${url}`);
          if (!mp4Url) mp4Url = url;
        } else {
          console.log(`[VidlinkScraper] Intercepted M3U8 URL: ${url}`);
          if (!m3u8Url) m3u8Url = url;
        }
      }
      request.continue();
    });

    // Go to the vidlink page
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    
    console.log(`[VidlinkScraper] Page loaded. Waiting for network requests and clicking...`);
    
    // Click center repeatedly to trigger play
    for (let i = 0; i < 15; i++) {
      if (mp4Url || m3u8Url) break;
      
      try {
        await page.mouse.click(640, 360).catch(() => {});
        await page.evaluate(() => {
          const playBtn = document.querySelector('.vjs-big-play-button') || document.querySelector('button') || document.querySelector('.play-btn');
          if (playBtn) playBtn.click();
        }).catch(() => {});
      } catch (e) {}
      
      await new Promise(r => setTimeout(r, 1000));
    }

    // Fallback: If network requests didn't yield a URL, scrape the live DOM structure directly
    if (!mp4Url && !m3u8Url) {
      console.log(`[VidlinkScraper] Network interception did not yield URL. Falling back to DOM evaluation...`);
      const extracted = await page.evaluate(() => {
        const videoElement = document.querySelector('video');
        if (videoElement) {
          if (videoElement.src && !videoElement.src.startsWith('blob:')) {
            return videoElement.src;
          }
          const source = videoElement.querySelector('source');
          if (source && source.src && !source.src.startsWith('blob:')) {
            return source.src;
          }
        }
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.src && !iframe.src.startsWith('javascript:')) {
          return iframe.src;
        }
        return null;
      }).catch(() => null);

      if (extracted) {
        console.log(`[VidlinkScraper] DOM extraction succeeded: ${extracted}`);
        if (extracted.includes('.mp4')) {
          mp4Url = extracted;
        } else {
          m3u8Url = extracted;
        }
      }
    }
    
    mediaUrl = mp4Url || m3u8Url;

    if (mediaUrl) {
      console.log(`[VidlinkScraper] Successfully extracted media link: ${mediaUrl}`);
    } else {
      console.log(`[VidlinkScraper] Failed to find stream URL.`);
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
