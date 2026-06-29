const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

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

async function extract() {
  const [,, tmdbId, type = 'movie', season = 1, episode = 1] = process.argv;
  if (!tmdbId) {
    process.exit(1);
  }

  const isTvSeries = type === 'series' || type === 'tv';
  const sources = isTvSeries 
    ? [`https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`]
    : [`https://vidlink.pro/movie/${tmdbId}`];

  let browser;
  try {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    
    browser = await puppeteer.launch({
      executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({width: 1280, height: 720});

    let m3u8Url = null;
    let mp4Url = null;

    // Intercept requests to catch the m3u8 or mp4 file
    await page.setRequestInterception(true);
    page.on('request', request => {
      const reqUrl = request.url();
      if ((reqUrl.includes('.mp4') || reqUrl.includes('.m3u8') || reqUrl.includes('playlist') || reqUrl.includes('/master') || reqUrl.includes('/stream')) && !isAdOrTracker(reqUrl)) {
        if (reqUrl.includes('.mp4')) {
          if (!mp4Url) mp4Url = reqUrl;
        } else {
          if (!m3u8Url) m3u8Url = reqUrl;
        }
      }
      request.continue();
    });

    for (const url of sources) {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
        
        // click center repeatedly for up to 15 seconds to bypass play buttons/ads
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

        // Fallback: DOM extraction if request interception missed it
        if (!mp4Url && !m3u8Url) {
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
            if (extracted.includes('.mp4')) {
              mp4Url = extracted;
            } else {
              m3u8Url = extracted;
            }
          }
        }

        const finalUrl = mp4Url || m3u8Url;
        if (finalUrl) {
            console.log(finalUrl);
            break;
        }
    }
  } catch(e) {
      // fail silently
  } finally {
    if (browser) await browser.close();
  }
}

extract();
