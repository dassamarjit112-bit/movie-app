const { extractMasterPlaylistUrl } = require('./puppeteerExtractor');

async function test() {
  console.log("Testing extractor on movie 550...");
  const url = await extractMasterPlaylistUrl(550, 'movie', 1, 1);
  console.log("Result:", url);
  process.exit(0);
}

test();
