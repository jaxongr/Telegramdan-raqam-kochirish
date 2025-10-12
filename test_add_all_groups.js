const http = require('http');

const postData = JSON.stringify({});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/groups/add-all-from-telegram',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n=== NATIJA ===');
    try {
      const result = JSON.parse(data);
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Xato:', error.message);
});

req.write(postData);
req.end();
