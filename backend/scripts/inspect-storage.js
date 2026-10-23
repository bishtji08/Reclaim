const pool = require('../src/config/database');

async function inspect() {
  try {
    const schemas = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('storage', 'auth') 
      ORDER BY table_schema, table_name
    `);
    console.log('--- Storage & Auth Tables ---');
    console.log(schemas.rows);

    const buckets = await pool.query(`
      SELECT * FROM storage.buckets
    `);
    console.log('--- Existing Storage Buckets ---');
    console.log(buckets.rows);

    const objects = await pool.query(`
      SELECT id, bucket_id, name, created_at FROM storage.objects LIMIT 10
    `);
    console.log('--- Existing Storage Objects ---');
    console.log(objects.rows);

    // Check auth.users columns
    const authColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'auth' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('--- auth.users columns ---');
    console.log(authColumns.rows.map(c => `${c.column_name} (${c.data_type})`));

    // Check sample auth.users
    const users = await pool.query(`
      SELECT id, email, email_confirmed_at, confirmed_at, created_at, last_sign_in_at 
      FROM auth.users LIMIT 5
    `);
    console.log('--- Sample auth.users ---');
    console.log(users.rows);

    process.exit(0);
  } catch (err) {
    console.error('Inspection failed:', err);
    process.exit(1);
  }
}

inspect();
