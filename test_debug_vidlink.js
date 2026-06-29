const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

async function debugVidlink() {
  const tmdbId = '533535';
  const url = `https://vidlink.pro/movie/${tmdbId}`;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    page.on('request', request => {
      const u = request.url();
      if (u.includes('playlist') || u.includes('.m3u8') || u.includes('.mp4') || u.includes('master') || u.includes('stream')) {
        console.log(`[Request] ${request.method()} - ${u}`);
      }
    });

    page.on('response', response => {
      const u = response.url();
      if (u.includes('playlist') || u.includes('.m3u8') || u.includes('.mp4') || u.includes('master') || u.includes('stream')) {
        console.log(`[Response] ${response.status()} - ${u}`);
      }
    });

    console.log("Navigating to:", url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    console.log("Initial Page Loaded. Waiting 5s...");
    await new Promise(r => setTimeout(r, 5000));

    // Scrape HTML structure
    const bodyHTML = await page.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({
        src: f.src,
        id: f.id,
        class: f.className
      }));
      const videos = Array.from(document.querySelectorAll('video')).map(v => ({
        src: v.src,
        sources: Array.from(v.querySelectorAll('source')).map(s => s.src)
      }));
      return { iframes, videos, title: document.title };
    });

    console.log("DOM elements found:", JSON.stringify(bodyHTML, null, 2));

    // Let's click center to trigger play
    console.log("Clicking center of the page to trigger playback...");
    await page.mouse.click(640, 360);
    await new Promise(r => setTimeout(r, 5000));

    // Check DOM elements again after click
    const bodyHTMLAfterClick = await page.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({
        src: f.src,
        id: f.id,
        class: f.className
      }));
      const videos = Array.from(document.querySelectorAll('video')).map(v => ({
        src: v.src,
        sources: Array.from(v.querySelectorAll('source')).map(s => s.src)
      }));
      return { iframes, videos };
    });

    console.log("DOM elements after click:", JSON.stringify(bodyHTMLAfterClick, null, 2));

  } catch (err) {
    console.error("Error during debug run:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

debugVidlink();
