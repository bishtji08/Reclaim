const pool = require('../src/config/database');

async function findKeys() {
  try {
    // Check if pgsodium or vault has any keys
    const tables = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('vault', 'pgsodium', 'supabase_functions', 'pgsodium_masks')
    `);
    console.log('Security tables:', tables.rows);

    for (const t of tables.rows) {
      try {
        const rows = await pool.query(`SELECT * FROM "${t.table_schema}"."${t.table_name}" LIMIT 5`);
        console.log(`Table ${t.table_schema}.${t.table_name}:`, rows.rows);
      } catch (e) {
        console.log(`Table ${t.table_schema}.${t.table_name} error:`, e.message);
      }
    }
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
}

findKeys();
