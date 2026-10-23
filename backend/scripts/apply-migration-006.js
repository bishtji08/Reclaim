const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

async function applyMigration() {
  const sqlPath = path.resolve(__dirname, '../../supabase/migrations/006_storage_setup.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying Migration 006: Storage Setup...');
  try {
    await pool.query(sql);
    console.log('✓ Migration 006 applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
  process.exit(0);
}

applyMigration();
