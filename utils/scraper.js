// utils/scraper.js
// Shared scraper instance for both Express and Next.js backends
require('dotenv').config();

let CineProScraper;
try {
  // Try to load the real package if it exists
  const pkg = '@cinepro/core';
  ({ CineProScraper } = require(pkg));
  console.info('[scraper] Loaded real @cinepro/core');
} catch (e) {
  // Fallback to mock implementation bundled with the repo
  console.warn('[scraper] @cinepro/core not found, using mock implementation');
  ({ CineProScraper } = require('./mockCinePro'));
}

const scraper = new CineProScraper({
  tmdbApiKey: process.env.TMDB_API_KEY,
  timeout: 10000,
});

module.exports = scraper;
