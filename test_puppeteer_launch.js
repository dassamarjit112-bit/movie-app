const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  console.log("Launching...");
  try {
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log("Launched! Waiting 2 seconds...");
    await new Promise(r => setTimeout(r, 2000));
    console.log("Getting default page...");
    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    console.log("Page retrieved! Navigating...");
    await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
    console.log("Navigated!");
    await browser.close();
    console.log("Closed!");
  } catch(e) {
    console.error(e);
  }
})();
