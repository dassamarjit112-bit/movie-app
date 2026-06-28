const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function extractM3U8() {
  const tmdbId = '533535';
  const url = `https://vidlink.pro/movie/${tmdbId}`;

  let browser;
  try {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    
    browser = await puppeteer.launch({
      executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    let m3u8Url = null;

    page.on('request', request => {
      if (request.url().includes('.m3u8')) m3u8Url = request.url();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(()=>{});
    
    // click center repeatedly for 5 seconds to bypass play buttons
    for (let i = 0; i < 5; i++) {
        await page.mouse.click(640, 360).catch(()=>{});
        await new Promise(r => setTimeout(r, 1000));
        if (m3u8Url) break;
    }
    
    console.log(m3u8Url || 'NOT FOUND');
  } catch(e) {
    console.error(e);
  } finally {
    if (browser) await browser.close();
  }
}
extractM3U8();
