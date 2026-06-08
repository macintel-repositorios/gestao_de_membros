const https = require('https');

const url = 'https://pjxcizyknlpmdwlgaxof.supabase.co/rest/v1/usuarios';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqeGNpenlrbmxwbWR3bGdheG9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTU0MDMsImV4cCI6MjA5NjQzMTQwM30.ea_enIgMMohXKJ7qQe7qCxyq8fJuE_hJzSQ0TfmsAO0';

const options = {
  headers: {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log('Users:', json);
    } catch (e) {
      console.log('Error:', e);
      console.log('Raw:', data);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err);
});
