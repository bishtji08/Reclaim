const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../src/config/database');
const cloudinaryService = require('../src/services/cloudinaryService');

const uploadsDirs = [
  path.resolve(__dirname, '../../uploads'),
  path.resolve(__dirname, '../uploads')
];

function findLocalFile(filename) {
  for (const dir of uploadsDirs) {
    const fullPath = path.join(dir, filename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

async function migrateImages() {
  console.log('--- Starting Cloudinary Migration ---');

  const client = await pool.connect();
  try {
    // 1. Migrate item_images
    console.log('\nScanning item_images...');
    const itemImages = await client.query(`
      SELECT id, item_id, image_url, public_id 
      FROM item_images 
      WHERE image_url NOT LIKE 'https://res.cloudinary.com/%'
    `);

    console.log(`Found ${itemImages.rows.length} item images to migrate.`);

    for (const row of itemImages.rows) {
      const filename = path.basename(row.image_url);
      const filePath = findLocalFile(filename);

      if (!filePath) {
        console.warn(`[WARN] File not found on disk for item_images id ${row.id} (${row.image_url})`);
        continue;
      }

      console.log(`Uploading item image id ${row.id}: ${filename}...`);
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      const mimeMap = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
      };

      const uploadResult = await cloudinaryService.uploadItemImage(
        {
          buffer: fileBuffer,
          mimetype: mimeMap[ext] || 'image/jpeg',
          originalname: filename
        },
        row.item_id
      );

      await client.query(`
        UPDATE item_images 
        SET image_url = $1, public_id = $2 
        WHERE id = $3
      `, [uploadResult.secure_url, uploadResult.public_id, row.id]);

      console.log(`✓ Item image id ${row.id} migrated -> ${uploadResult.secure_url} (public_id: ${uploadResult.public_id})`);
    }

    // 2. Migrate claim_images
    console.log('\nScanning claim_images...');
    const claimImages = await client.query(`
      SELECT id, claim_id, image_url, public_id 
      FROM claim_images 
      WHERE image_url NOT LIKE 'https://res.cloudinary.com/%'
    `);

    console.log(`Found ${claimImages.rows.length} claim images to migrate.`);

    for (const row of claimImages.rows) {
      const filename = path.basename(row.image_url);
      const filePath = findLocalFile(filename);

      if (!filePath) {
        console.warn(`[WARN] File not found on disk for claim_images id ${row.id} (${row.image_url})`);
        continue;
      }

      console.log(`Uploading claim image id ${row.id}: ${filename}...`);
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      const mimeMap = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf'
      };

      // Get claimer id
      const claimRes = await client.query('SELECT claimer_id FROM claims WHERE id = $1', [row.claim_id]);
      const claimerId = claimRes.rows[0]?.claimer_id || 'system';

      const uploadResult = await cloudinaryService.uploadClaimProof(
        {
          buffer: fileBuffer,
          mimetype: mimeMap[ext] || 'image/jpeg',
          originalname: filename
        },
        claimerId,
        row.claim_id
      );

      await client.query(`
        UPDATE claim_images 
        SET image_url = $1, public_id = $2 
        WHERE id = $3
      `, [uploadResult.secure_url, uploadResult.public_id, row.id]);

      console.log(`✓ Claim image id ${row.id} migrated -> ${uploadResult.secure_url} (public_id: ${uploadResult.public_id})`);
    }

    console.log('\n--- Migration Completed Successfully! ---');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateImages();
