const pool = require('../src/config/database');

async function main() {
  try {
    const cols = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('item_images', 'claim_images')
      ORDER BY table_name, ordinal_position
    `);
    console.log('Columns:');
    console.table(cols.rows);

    const cons = await pool.query(`
      SELECT conrelid::regclass AS table_name, conname, contype, pg_get_constraintdef(oid) AS def 
      FROM pg_constraint 
      WHERE conrelid IN ('item_images'::regclass, 'claim_images'::regclass)
    `);
    console.log('Constraints:');
    console.table(cons.rows);

    const itemCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'items'
      ORDER BY ordinal_position
    `);
    console.log('Items Columns:');
    console.table(itemCols.rows);

    const claimImgs = await pool.query('SELECT * FROM claim_images');
    console.log('Claim Images rows:', claimImgs.rows);

    const itemImgs = await pool.query('SELECT * FROM item_images');
    console.log('Item Images rows:', itemImgs.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
