const { exec } = require('child_process');

async function extractMasterPlaylistUrl(tmdbId, type = 'movie', season = 1, episode = 1) {
  return new Promise((resolve) => {
    exec(`node server/puppeteerStandalone.js ${tmdbId} ${type} ${season} ${episode}`, { timeout: 45000 }, (error, stdout) => {
      if (error || !stdout) {
        console.error('[Extractor] Extraction failed:', error?.message);
        resolve(null);
      } else {
        const url = stdout.trim();
        resolve(url.startsWith('http') ? url : null);
      }
    });
  });
}

module.exports = { extractMasterPlaylistUrl };
