const axios = require('axios');

async function testAggregators() {
  const imdbId = 'tt11389872'; // Deadpool & Wolverine IMDB ID
  
  const endpoints = [
    `https://vidsrc.to/api/embed/movie/${imdbId}`,
    `https://embed.su/api/movie/${imdbId}`,
    `https://vidsrc.me/api/embed/movie?imdb=${imdbId}`
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.google.com/'
  };

  for (const url of endpoints) {
    console.log(`\nQuerying endpoint: ${url}`);
    try {
      const res = await axios.get(url, { headers, timeout: 5000 });
      console.log("Status:", res.status);
      console.log("Data:", res.data);
    } catch (e) {
      console.log("Error:", e.message);
      if (e.response) {
        console.log("Response Status:", e.response.status);
        console.log("Response Data:", e.response.data);
      }
    }
  }
}

testAggregators();
