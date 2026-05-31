/* ============================================================
   CineStream OTT App — Unit Tests
   Tests utility functions in ui.js and ai-recommender.js
   ============================================================ */

const fs = require('fs');
const path = require('path');

// ── Mock Browser Globals ──
global.window = {};
global.document = {
  getElementById: () => ({
    appendChild: () => {},
    style: {},
    classList: { add: () => {}, remove: () => {} },
    innerHTML: ''
  }),
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
  body: { appendChild: () => {} }
};

// ── Load Source Files into Context ──
function loadScript(filePath) {
  const code = fs.readFileSync(path.resolve(__dirname, filePath), 'utf8');
  eval(code);
}

console.log('\n=============================================');
console.log('🧪 CineStream Unit Test Runner');
console.log('=============================================\n');

// Load files
try {
  loadScript('./js/ui.js');
  loadScript('./js/ai-recommender.js');
  console.log('✅ Loaded source files successfully.\n');
} catch (e) {
  console.error('❌ Failed to load source files:', e);
  process.exit(1);
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  🟢 PASSED: ${message}`);
  } else {
    failed++;
    console.log(`  🔴 FAILED: ${message}`);
  }
}

// ── Test UI.formatDuration ──
console.log('--- Testing UI.formatDuration ---');
try {
  const formatDuration = global.window.UI.formatDuration;
  assert(formatDuration(45) === '45m', '45 minutes should format to "45m"');
  assert(formatDuration(60) === '1h', '60 minutes should format to "1h"');
  assert(formatDuration(120) === '2h', '120 minutes should format to "2h"');
  assert(formatDuration(135) === '2h 15m', '135 minutes should format to "2h 15m"');
} catch (e) {
  failed++;
  console.log('  🔴 Exception in formatDuration tests:', e.message);
}

// ── Test UI.formatDate ──
console.log('\n--- Testing UI.formatDate ---');
try {
  const formatDate = global.window.UI.formatDate;
  const sampleDate = '2026-05-31';
  const formatted = formatDate(sampleDate);
  assert(formatted.includes('2026'), 'Formatted date should contain the year 2026');
  assert(formatted.includes('May') || formatted.includes('5'), 'Formatted date should contain the month');
} catch (e) {
  failed++;
  console.log('  🔴 Exception in formatDate tests:', e.message);
}

// ── Test AIRecommender.calculateSimilarity ──
console.log('\n--- Testing AIRecommender.calculateSimilarity ---');
try {
  const calcSim = global.window.AIRecommender.calculateSimilarity;
  
  const movieA = {
    id: '1',
    title: 'The Matrix',
    genre: 'Sci-Fi, Action',
    type: 'movie',
    imdb: '8.7',
    year: '1999'
  };

  const movieB = {
    id: '2',
    title: 'The Matrix Reloaded',
    genre: 'Sci-Fi, Action',
    type: 'movie',
    imdb: '7.2',
    year: '2003'
  };

  const movieC = {
    id: '3',
    title: 'Inception',
    genre: 'Sci-Fi, Thriller',
    type: 'movie',
    imdb: '8.8',
    year: '2010'
  };

  const showD = {
    id: '4',
    title: 'Stranger Things',
    genre: 'Sci-Fi, Horror',
    type: 'series',
    imdb: '8.7',
    year: '2016'
  };

  // Same ID should result in 0 similarity
  assert(calcSim(movieA, movieA) === 0, 'Same item should have 0 similarity');

  // Matrix and Matrix Reloaded should have very high similarity
  const simAB = calcSim(movieA, movieB);
  assert(simAB > 60, `High similarity between sequels: ${simAB}%`);

  // Matrix and Inception should have moderate similarity
  const simAC = calcSim(movieA, movieC);
  assert(simAC > 40 && simAC < simAB, `Moderate similarity between Sci-Fi movies: ${simAC}%`);

  // Movie vs Show should be penalised slightly by type match weight (15 points)
  const simAD = calcSim(movieA, showD);
  assert(simAD < simAC, `Lower similarity between movie and series: ${simAD}%`);

} catch (e) {
  failed++;
  console.log('  🔴 Exception in similarity tests:', e.message);
}

console.log('\n=============================================');
console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
console.log('=============================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
