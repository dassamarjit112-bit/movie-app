const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

async function test() {
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

    page.on('response', async response => {
      const u = response.url();
      if (u.includes('vidlink.pro/api/') || u.includes('hakunaymatata.com')) {
        try {
          // If it is a media or image request, don't dump the text body
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('json') || contentType.includes('text') || contentType.includes('javascript')) {
            const text = await response.text();
            console.log(`[RESP] ${u}\n[BODY] ${text.substring(0, 1000)}\n---`);
          } else {
            console.log(`[RESP-NONTEXT] ${u} (Content-Type: ${contentType})`);
          }
        } catch (e) {
          console.log(`[RESP-ERR] ${u} (${e.message})`);
        }
      }
    });

    console.log("Navigating...");
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(()=>{});
    await new Promise(r => setTimeout(r, 6000));
    
    console.log("Clicking center...");
    await page.mouse.click(640, 360);
    await new Promise(r => setTimeout(r, 10000));
    
    console.log("Done");
  } catch(e) {
    console.error(e);
  } finally {
    if (browser) await browser.close();
  }
}
test();
