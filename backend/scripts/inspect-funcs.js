const pool = require('../src/config/database');

async function inspectFuncs() {
  try {
    const res = await pool.query(`
      SELECT routine_schema, routine_name 
      FROM information_schema.routines 
      WHERE routine_schema IN ('auth', 'storage')
      ORDER BY routine_schema, routine_name
    `);
    console.log('Routines:', res.rows);

    // Check if there are any config tables
    const tables = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name ILIKE '%config%' OR table_name ILIKE '%param%' OR table_name ILIKE '%secret%'
    `);
    console.log('Config/Secret tables:', tables.rows);
  } catch (e) {
    console.log('Error:', e.message);
  }
  process.exit(0);
}

inspectFuncs();
