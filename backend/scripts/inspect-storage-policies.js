const pool = require('../src/config/database');

async function checkStoragePolicies() {
  try {
    const res = await pool.query(`
      SELECT policyname, cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'storage'
    `);
    console.log('Current storage policies:', res.rows);
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

checkStoragePolicies();
