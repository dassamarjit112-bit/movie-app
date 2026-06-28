const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching vanilla puppeteer...");
  let browser;
  try {
    browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    console.log("Launched! Getting page...");
    const page = await browser.newPage();
    console.log("Page retrieved! Navigating to vidlink...");
    await page.goto('https://vidlink.pro/movie/533535', { waitUntil: 'networkidle2' });
    console.log("Navigated! URL:", page.url());
    const title = await page.title();
    console.log("Title:", title);
  } catch(e) {
    console.error(e);
  } finally {
    if (browser) await browser.close();
  }
})();
