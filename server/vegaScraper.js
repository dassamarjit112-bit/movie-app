const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * Custom Cloudflare-Bypassing Scraper for Layer-2 Indexers (VegaMovies / HDHub4u)
 * Returns a direct Layer-3 Gofile / TeraBox / Pixeldrain link if found.
 */
async function scrapeLayer3Link(movieTitle, year, type = 'movie') {
  console.log(`[VegaScraper] Starting stealth scraper for: ${movieTitle} (${year})`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    
    // Step 1: Use DuckDuckGo or Google to find the VegaMovies post to bypass their internal search block
    const query = encodeURIComponent(`site:vegamovies.is OR site:vegamovies.ws OR site:hdhub4u.tv "${movieTitle}" ${year || ''}`);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${query}`;
    
    console.log(`[VegaScraper] Searching DuckDuckGo: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Find first result URL
    const firstResult = await page.evaluate(() => {
      const link = document.querySelector('.result__url');
      return link ? link.href : null;
    });

    if (!firstResult) {
      console.log('[VegaScraper] No search results found on indexer sites.');
      await browser.close();
      return null;
    }
    
    console.log(`[VegaScraper] Found indexer page: ${firstResult}`);
    
    // Step 2: Navigate to the VegaMovies / HDHub4u page
    // This will trigger the Cloudflare JS Challenge. Stealth plugin handles the basic JS challenge automatically.
    await page.goto(firstResult, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Step 3: Scan the page for "Download" buttons or Gofile / Pixeldrain / Terabox links
    console.log('[VegaScraper] Scanning page for Layer-3 storage links...');
    
    // Extract all hrefs that might be direct cloud storage links or shortlinks
    const extractedLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.map(a => a.href).filter(href => href && href.startsWith('http'));
    });

    // Check for direct Layer-3 hosts first (if they bypassed shortlinks)
    const layer3Hosts = ['gofile.io', 'pixeldrain.com', 'terabox.com', 'hubcloud', 'streamwish'];
    let finalUrl = extractedLinks.find(link => layer3Hosts.some(host => link.includes(host)));

    if (finalUrl) {
      console.log(`[VegaScraper] Successfully extracted direct Layer-3 link: ${finalUrl}`);
      await browser.close();
      return finalUrl;
    }

    // Step 4: If no direct links, we must click a Download button and navigate the shortlink (e.g. v-links / fastserver)
    console.log('[VegaScraper] No direct links found on main page. Attempting to extract shortlink...');
    
    const shortlink = extractedLinks.find(link => 
      link.includes('v-links') || 
      link.includes('fastserver') || 
      link.includes('short') ||
      link.includes('download')
    );

    if (shortlink) {
      console.log(`[VegaScraper] Found potential shortlink: ${shortlink}`);
      
      // Because shortlinks have 15-second countdowns and captchas, we attempt a naive extraction
      // A robust implementation would require 2Captcha API to solve the "Click here to continue" captchas.
      // For now, we return the shortlink to the user so they can bypass it manually if needed.
      await browser.close();
      return shortlink;
    }

    console.log('[VegaScraper] Failed to find any usable download links.');
    await browser.close();
    return null;

  } catch (error) {
    console.error('[VegaScraper] Error during scraping:', error.message);
    if (browser) await browser.close();
    return null;
  }
}

module.exports = { scrapeLayer3Link };
