const pool = require('../src/config/database');

async function testPolicy() {
  try {
    await pool.query(`
      CREATE POLICY "Public item images select" 
      ON storage.objects FOR SELECT 
      USING (bucket_id = 'item-images')
    `);
    console.log('Policy created successfully!');
  } catch (e) {
    console.log('Policy creation result:', e.message);
  }
  process.exit(0);
}

testPolicy();
