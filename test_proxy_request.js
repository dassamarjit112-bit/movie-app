const axios = require('axios');

async function testProxy() {
  const m3u8Url = 'https://bcdn.hakunaymatata.com/tran-audio/20250608/19f931175ca6330d4bdfb4ed4a609d43.mp4?sign=41b32aa2e08f1c2d395811396a15b032&t=1782747224';
  
  console.log("Testing Axios GET on stream URL...");
  try {
    const streamRes = await axios({
      method: 'get',
      url: m3u8Url,
      responseType: 'stream',
      headers: {
        'Referer': 'https://vidlink.pro/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://vidlink.pro'
      }
    });

    console.log("Status:", streamRes.status);
    console.log("Headers:", streamRes.headers);
    
    // Read first chunk to verify
    streamRes.data.on('data', chunk => {
      console.log(`Received chunk of size: ${chunk.length}`);
      streamRes.data.destroy(); // stop streaming
    });

  } catch(e) {
    console.error("Axios Error:", e.message);
    if (e.response) {
      console.error("Response Status:", e.response.status);
      console.error("Response Headers:", e.response.headers);
    }
  }
}

testProxy();
