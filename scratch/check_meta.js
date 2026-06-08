const https = require('https');

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqeGNpenlrbmxwbWR3bGdheG9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTU0MDMsImV4cCI6MjA5NjQzMTQwM30.ea_enIgMMohXKJ7qQe7qCxyq8fJuE_hJzSQ0TfmsAO0';

const options = {
  headers: {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`
  }
};

function queryTable(table) {
  return new Promise((resolve) => {
    https.get(`https://pjxcizyknlpmdwlgaxof.supabase.co/rest/v1/${table}`, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
  });
}

async function main() {
  const igrejas = await queryTable('igrejas');
  const unidades = await queryTable('unidades');
  console.log('--- Igrejas ---');
  console.log(igrejas);
  console.log('--- Unidades ---');
  console.log(unidades);
}

main();
