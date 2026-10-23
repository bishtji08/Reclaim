const pool = require('../src/config/database');

async function checkSettings() {
  try {
    const res = await pool.query(`
      SELECT name, setting FROM pg_settings 
      WHERE name ILIKE '%jwt%' OR name ILIKE '%secret%' OR name ILIKE '%supabase%' OR name ILIKE '%auth%'
    `);
    console.log('PG Settings:', res.rows);
  } catch (e) {
    console.log('Error:', e.message);
  }
  process.exit(0);
}

checkSettings();
