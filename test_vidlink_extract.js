const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

async function extractM3U8() {
  const tmdbId = '533535';
  const type = 'movie';
  const url = `https://vidlink.pro/movie/${tmdbId}`;

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
    let m3u8Url = null;

    page.on('request', request => {
      const reqUrl = request.url();
      if (reqUrl.includes('.m3u8')) {
        m3u8Url = reqUrl;
      }
    });

    console.log("Navigating to", url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for the iframe or video to load the m3u8
    console.log("Waiting for network requests...");
    for (let i = 0; i < 15; i++) {
        if (m3u8Url) break;
        await new Promise(r => setTimeout(r, 1000));
    }

    if (m3u8Url) {
        console.log("FOUND:", m3u8Url);
    } else {
        console.log("NOT FOUND");
    }
  } catch(e) {
    console.error(e);
  } finally {
    if (browser) await browser.close();
  }
}

extractM3U8();
