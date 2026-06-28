const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// puppeteer.use(StealthPlugin());

/**
 * CineStream — Headless Stream Extractor
 * Uses Puppeteer network interception to snatch the raw .m3u8 HLS master playlist URL.
 */
async function extractMasterPlaylistUrl(tmdbId, type = 'movie', season = 1, episode = 1) {
  console.log(`[Extractor] Puppeteer extraction disabled on Windows host to prevent hangs. Falling back to next layer.`);
  return null;
}
    
module.exports = { extractMasterPlaylistUrl };
