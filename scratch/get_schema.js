const https = require('https');

const url = 'https://pjxcizyknlpmdwlgaxof.supabase.co/rest/v1/';
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
      if (json.definitions && json.definitions.visitantes) {
        console.log('Properties of visitantes:');
        console.log(Object.keys(json.definitions.visitantes.properties));
      } else {
        console.log('visitantes definition not found. Definitions available:', Object.keys(json.definitions));
      }
    } catch (e) {
      console.log('Error parsing JSON:', e);
      console.log('Raw sample:', data.substring(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('Error:', err);
});
