const axios = require('axios');
const cheerio = require('cheerio');

async function testFetch() {
  const url = 'https://vidlink.pro/movie/533535';
  console.log("Fetching raw HTML from:", url);
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });
    
    console.log("Status:", res.status);
    const html = res.data;
    console.log("HTML length:", html.length);
    
    // Check if the HTML contains .mp4 or .m3u8 or bcdn.hakunaymatata.com
    const hasMp4 = html.includes('.mp4');
    const hasM3u8 = html.includes('.m3u8');
    const hasCDN = html.includes('hakunaymatata.com');
    
    console.log("Contains .mp4:", hasMp4);
    console.log("Contains .m3u8:", hasM3u8);
    console.log("Contains hakunaymatata.com:", hasCDN);
    
    // Check for iframes or video tags
    const $ = cheerio.load(html);
    console.log("Iframes found:", $('iframe').length);
    $('iframe').each((i, el) => {
      console.log(`Iframe ${i} src:`, $(el).attr('src'));
    });
    
    console.log("Video tags found:", $('video').length);
    
    // Let's print the first 1000 characters of the body
    console.log("First 1000 chars of body:");
    console.log(html.substring(0, 1000));
    
  } catch (e) {
    console.error("Fetch failed:", e.message);
    if (e.response) {
      console.error("Response Status:", e.response.status);
    }
  }
}

testFetch();
