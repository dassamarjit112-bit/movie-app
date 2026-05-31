const http = require('http');

http.get('http://localhost:3000/api/get-latest-synced-movies?query=Dune', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log("RESPONSE RECEIVED:");
    console.log(data);
  });
}).on('error', (err) => {
  console.error("Error connecting to server:", err);
});
