const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  console.log("Launching puppeteer-core with msedge...");
  let browser;
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  
  const execPath = fs.existsSync(chromePath) ? chromePath : (fs.existsSync(edgePath) ? edgePath : null);
  
  if (!execPath) {
      console.log("No browser found");
      return;
  }
  console.log("Using path:", execPath);
  
  try {
    browser = await puppeteer.launch({ 
        executablePath: execPath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    console.log("Launched! Getting page...");
    const page = await browser.newPage();
    console.log("Page retrieved! Navigating...");
    await page.goto('https://vidlink.pro/movie/533535', { waitUntil: 'networkidle2' });
    console.log("Title:", await page.title());
  } catch(e) {
    console.error(e);
  } finally {
    if (browser) await browser.close();
  }
})();
