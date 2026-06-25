const puppeteer = require('puppeteer');

async function test() {
  console.log("Starting...");
  try {
    console.log("Launching...");
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log("Launched!");
    await browser.close();
    console.log("Closed.");
  } catch(e) {
    console.log("Error:", e);
  }
}
test();
