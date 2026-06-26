/**
 * Quick test for the updated puppeteerExtractor.
 * Run with: node server/test_extract.js
 */
const { extractMasterPlaylistUrl } = require('./puppeteerExtractor');

// Test with The Dark Knight (TMDB: 155) — a well-indexed movie on all sources
const TMDB_ID = '155';
const TYPE    = 'movie';

console.log(`[Test] Extracting stream for TMDB ID: ${TMDB_ID} (${TYPE})`);
console.time('[Test] Total extraction time');

extractMasterPlaylistUrl(TMDB_ID, TYPE).then(url => {
  console.timeEnd('[Test] Total extraction time');
  if (url) {
    console.log(`\n✅ SUCCESS — Stream URL extracted:\n${url}\n`);
  } else {
    console.log('\n❌ FAILED — No stream URL found across all sources.\n');
  }
  process.exit(0);
}).catch(err => {
  console.error('[Test] Unhandled error:', err);
  process.exit(1);
});
