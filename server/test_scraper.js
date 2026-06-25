const axios = require('axios');
const cheerio = require('cheerio');

async function testVidlink() {
  try {
    const res = await axios.get('https://vidlink.pro/movie/550');
    console.log("Vidlink HTML length:", res.data.length);
    const m3u8Matches = res.data.match(/https:\/\/[^"']+\.m3u8/g);
    console.log("Vidlink m3u8 direct match:", m3u8Matches);
    const apiMatches = res.data.match(/api\/(.*?)\/sources/g);
    console.log("Vidlink API match:", apiMatches);
  } catch (e) { console.log('Vidlink error:', e.message); }
}
testVidlink();
