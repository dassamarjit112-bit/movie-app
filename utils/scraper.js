// utils/scraper.js
// Shared scraper instance for both Express and Next.js backends
require('dotenv').config();
const { CineProScraper } = require('@cinepro/core');

const scraper = new CineProScraper({
  tmdbApiKey: process.env.TMDB_API_KEY,
  timeout: 10000,
});

module.exports = scraper;
