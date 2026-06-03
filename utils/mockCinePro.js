// utils/mockCinePro.js
// Minimal mock that mimics the public API of @cinepro/core.
// Used when the real package is unavailable (e.g., during Vercel builds).

class MockCineProScraper {
  constructor({ tmdbApiKey, timeout }) {
    this.tmdbApiKey = tmdbApiKey;
    this.timeout = timeout;
  }

  /**
   * Pretend to resolve streams. Returns an empty array so the UI can handle
   * "no streams" gracefully. In a real environment you would replace this
   * with the actual library.
   */
  async resolveStreams({ id, type, season, episode }) {
    console.warn('[mockCinePro] resolveStreams called', {
      id,
      type,
      season,
      episode,
    });
    return [];
  }
}

module.exports = { CineProScraper: MockCineProScraper };
