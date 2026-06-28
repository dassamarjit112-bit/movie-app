const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

async function snap() {
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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({width: 1280, height: 720});

    console.log("Navigating...");
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(()=>{});
    await new Promise(r => setTimeout(r, 5000)); // wait for player

    await page.screenshot({path: 'f:\\movie app\\vidlink_snap.png'});
    console.log("Snapped");
    
    // click center of page
    await page.mouse.click(640, 360);
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({path: 'f:\\movie app\\vidlink_snap2.png'});
    console.log("Snapped after click");

  } catch(e) {
    console.error(e);
  } finally {
    if (browser) await browser.close();
  }
}
snap();
