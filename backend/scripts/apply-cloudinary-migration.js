const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../src/config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Applying Cloudinary schema migration...');
    await client.query('BEGIN');

    // Drop check constraints on image_url that enforced /api/media/%
    await client.query(`
      ALTER TABLE public.item_images DROP CONSTRAINT IF EXISTS item_images_image_url_check;
    `);
    console.log('✓ Dropped item_images_image_url_check');

    await client.query(`
      ALTER TABLE public.claim_images DROP CONSTRAINT IF EXISTS claim_images_image_url_check;
    `);
    console.log('✓ Dropped claim_images_image_url_check');

    // Add public_id columns if they do not exist
    await client.query(`
      ALTER TABLE public.item_images ADD COLUMN IF NOT EXISTS public_id text;
    `);
    console.log('✓ Added public_id to item_images');

    await client.query(`
      ALTER TABLE public.claim_images ADD COLUMN IF NOT EXISTS public_id text;
    `);
    console.log('✓ Added public_id to claim_images');

    await client.query('COMMIT');
    console.log('Cloudinary schema migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
