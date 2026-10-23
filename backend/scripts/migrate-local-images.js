const path = require('path');
const fs = require('fs');
const pool = require('../src/config/database');
const storageService = require('../src/services/storageService');
const logger = require('../src/utils/logger');

async function migrateImages() {
  console.log('--- Starting Image Migration to Supabase Cloud Storage ---');
  const uploadsDir = path.resolve(__dirname, '../uploads');
  const fallbackDir = path.resolve(__dirname, '../../uploads');

  const resolvedDir = fs.existsSync(fallbackDir) ? fallbackDir : uploadsDir;
  console.log('Reading from local uploads directory:', resolvedDir);

  try {
    const { rows: itemImages } = await pool.query(`
      SELECT id, item_id, image_url 
      FROM item_images 
      WHERE image_url LIKE '/api/media/%' OR image_url LIKE '/uploads/%'
    `);

    console.log(`Found ${itemImages.length} item images to review for cloud migration`);

    let migratedCount = 0;
    for (const record of itemImages) {
      const filename = path.basename(record.image_url);
      const localFilePath = path.join(resolvedDir, filename);

      if (fs.existsSync(localFilePath)) {
        console.log(`Processing ${filename} for item #${record.item_id}...`);
        
        // If Supabase client is connected, upload to Supabase Cloud bucket
        if (storageService.supabaseClient) {
          try {
            const buffer = fs.readFileSync(localFilePath);
            const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
            const uploadResult = await storageService.uploadItemImage({
              buffer,
              originalname: filename,
              mimetype: mimeType,
              size: buffer.length
            });

            await pool.query(`
              UPDATE item_images 
              SET image_url = $1 
              WHERE id = $2
            `, [uploadResult.publicUrl, record.id]);

            console.log(`✓ Migrated ${filename} -> ${uploadResult.publicUrl}`);
            migratedCount++;
          } catch (uploadErr) {
            console.warn(`Could not upload to cloud for ${filename}:`, uploadErr.message);
          }
        } else {
          // If no cloud credentials, ensure cloud public URL is documented
          const cloudUrl = storageService.getPublicUrl(storageService.ITEM_IMAGES_BUCKET, filename);
          console.log(`Cloud target URL for ${filename}: ${cloudUrl}`);
        }
      } else {
        console.log(`File ${filename} not found on disk, skipping.`);
      }
    }

    console.log(`Migration review finished. ${migratedCount} images updated.`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrateImages();
