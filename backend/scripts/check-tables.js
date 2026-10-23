const pool = require('../src/config/database');

async function main() {
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  console.log('Public tables:', tables.rows.map((r) => r.table_name));

  const userCols = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='users' ORDER BY ordinal_position"
  );
  console.log('Users columns:', userCols.rows.map((r) => `${r.column_name} (${r.data_type})`));

  const itemCols = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='items' ORDER BY ordinal_position"
  );
  console.log('Items columns:', itemCols.rows.map((r) => `${r.column_name} (${r.data_type})`));

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
