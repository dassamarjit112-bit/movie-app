const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://embed.su/embed/movie/550', { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const matches = res.data.match(/https:\/\/[^\s"']+\.m3u8/g);
    console.log(matches ? matches : 'No m3u8 found directly');
  } catch(e) { console.error(e.message); }
}
test();
