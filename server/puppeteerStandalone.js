const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
  const [,, tmdbId, type = 'movie', season = '1', episode = '1'] = process.argv;
  if (!tmdbId) process.exit(1);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Visible browser so user can debug
      args: ['--no-sandbox', '--disable-setuid-sandbox']
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
      
      try {
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        const playBtn = '.play-button, iframe, video, .plyr__control--overlaid'; 
        if (await page.$(playBtn)) {
          await page.click(playBtn).catch(() => {});
        }
        await new Promise(r => setTimeout(r, 3000));
      } catch (e) {}
    }

    if (videoStreamUrl) {
      console.log(videoStreamUrl); // ONLY print the URL to stdout
    } else {
      process.exit(1);
    }
  } catch (e) {
    process.exit(1);
  } finally {
    if (browser) await browser.close().catch(() => {});
    process.exit(0);
  }
}

run();
