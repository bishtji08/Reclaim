const https = require('https');

https.get('https://fsiivcxqpltaxowncvfv.supabase.co/storage/v1/object/public/item-images/test.txt', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Public bucket GET status:', res.statusCode);
    console.log('Public bucket GET response:', body);
  });
});
