const jwt = require('jsonwebtoken');
const https = require('https');

const secret = 'super-secret-jwt-token-key-with-sufficient-length-lost-and-found-2026-auth';
const token = jwt.sign({ role: 'anon', iss: 'supabase', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 365 }, secret);

console.log('Testing token:', token);

const req = https.request('https://fsiivcxqpltaxowncvfv.supabase.co/storage/v1/bucket', {
  headers: {
    'apikey': token,
    'Authorization': `Bearer ${token}`
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
});
req.on('error', (e) => console.error(e));
req.end();
