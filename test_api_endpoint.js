const axios = require('axios');

async function testEndpoint() {
  console.log("Calling /api/extract_stream endpoint...");
  try {
    const res = await axios.get('http://localhost:4000/api/extract_stream', {
      params: {
        id: '533535',
        type: 'movie',
        season: '1',
        episode: '1',
        title: 'Deadpool'
      },
      timeout: 60000 // up to 60 seconds
    });

    console.log("Status:", res.status);
    console.log("Headers:", res.headers);
  } catch (e) {
    console.error("API Call failed:", e.message);
    if (e.response) {
      console.error("Response Status:", e.response.status);
      console.error("Response Data:", e.response.data);
    }
  }
}

// Wait a bit for server to boot, then run
setTimeout(testEndpoint, 2000);
