const pool = require('../src/config/database');

async function testBucketCreation() {
  try {
    // Check storage.buckets columns
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'storage' AND table_name = 'buckets'
    `);
    console.log('storage.buckets columns:', cols.rows);

    // Try inserting item-images bucket
    const insertRes = await pool.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('item-images', 'item-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
      ON CONFLICT (id) DO UPDATE SET public = true
      RETURNING *
    `);
    console.log('Inserted item-images bucket:', insertRes.rows[0]);

    // Try inserting claim-proofs bucket (private)
    const insertProofs = await pool.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('claim-proofs', 'claim-proofs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
      ON CONFLICT (id) DO UPDATE SET public = false
      RETURNING *
    `);
    console.log('Inserted claim-proofs bucket:', insertProofs.rows[0]);

    const allBuckets = await pool.query(`SELECT * FROM storage.buckets`);
    console.log('All buckets now:', allBuckets.rows);
  } catch (e) {
    console.error('Bucket test error:', e);
  }
  process.exit(0);
}

testBucketCreation();
