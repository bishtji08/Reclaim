const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../src/config/database');
const cloudinaryService = require('../src/services/cloudinaryService');

async function testCloudinaryFlow() {
  console.log('====================================================');
  console.log('  CLOUDINARY INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // 1x1 test PNG buffer
  const sampleImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const mockFile = {
    buffer: sampleImageBuffer,
    mimetype: 'image/png',
    originalname: 'cloudinary-test.png',
    size: sampleImageBuffer.length
  };

  try {
    // [Test 1] Upload item image with reclaim_items preset
    console.log('[1/5] Testing Item Image Upload with reclaim_items preset...');
    const itemUpload = await cloudinaryService.uploadItemImage(mockFile, 'test_item_999');
    if (itemUpload.secure_url && itemUpload.secure_url.includes('res.cloudinary.com') && itemUpload.public_id) {
      console.log('  ✓ PASS: Uploaded to Cloudinary with secure_url:', itemUpload.secure_url);
      console.log('  ✓ PASS: Public ID generated:', itemUpload.public_id);
      passed++;
    } else {
      console.error('  ✗ FAIL: Missing secure_url or public_id', itemUpload);
      failed++;
    }

    // [Test 2] Database persistence in item_images
    console.log('\n[2/5] Testing Database Persistence in item_images...');
    // Find an existing item to attach to temporarily
    const itemRes = await pool.query('SELECT id FROM items LIMIT 1');
    const testItemId = itemRes.rows[0]?.id;

    if (testItemId) {
      const insertRes = await pool.query(`
        INSERT INTO item_images (item_id, image_url, public_id, is_primary)
        VALUES ($1, $2, $3, false)
        RETURNING *
      `, [testItemId, itemUpload.secure_url, itemUpload.public_id]);

      const insertedRow = insertRes.rows[0];
      if (insertedRow.public_id === itemUpload.public_id && insertedRow.image_url === itemUpload.secure_url) {
        console.log('  ✓ PASS: Saved item_images record with public_id and secure_url');
        passed++;
      } else {
        console.error('  ✗ FAIL: Inserted data mismatch', insertedRow);
        failed++;
      }

      // Cleanup db row
      await pool.query('DELETE FROM item_images WHERE id = $1', [insertedRow.id]);
    } else {
      console.log('  ⚠ SKIP: No item in database to attach test image to');
    }

    // [Test 3] Upload claim proof with reclaim_proof preset
    console.log('\n[3/5] Testing Claim Proof Upload with reclaim_proof preset...');
    const proofUpload = await cloudinaryService.uploadClaimProof(mockFile, 'test_claimer_123', 'test_claim_456');
    if (proofUpload.secure_url && proofUpload.secure_url.includes('res.cloudinary.com') && proofUpload.public_id) {
      console.log('  ✓ PASS: Uploaded proof to Cloudinary with secure_url:', proofUpload.secure_url);
      console.log('  ✓ PASS: Proof Public ID generated:', proofUpload.public_id);
      passed++;
    } else {
      console.error('  ✗ FAIL: Missing proof secure_url or public_id', proofUpload);
      failed++;
    }

    // [Test 4] Database persistence in claim_images
    console.log('\n[4/5] Testing Database Persistence in claim_images...');
    const claimRes = await pool.query('SELECT id FROM claims LIMIT 1');
    const testClaimId = claimRes.rows[0]?.id;

    if (testClaimId) {
      const insertClaimRes = await pool.query(`
        INSERT INTO claim_images (claim_id, image_url, public_id, description)
        VALUES ($1, $2, $3, 'Test document')
        RETURNING *
      `, [testClaimId, proofUpload.secure_url, proofUpload.public_id]);

      const insertedClaimRow = insertClaimRes.rows[0];
      if (insertedClaimRow.public_id === proofUpload.public_id && insertedClaimRow.image_url === proofUpload.secure_url) {
        console.log('  ✓ PASS: Saved claim_images record with public_id and secure_url');
        passed++;
      } else {
        console.error('  ✗ FAIL: Inserted claim data mismatch', insertedClaimRow);
        failed++;
      }

      // Cleanup db row
      await pool.query('DELETE FROM claim_images WHERE id = $1', [insertedClaimRow.id]);
    } else {
      console.log('  ⚠ SKIP: No claim in database to attach test proof to');
    }

    // [Test 5] Destruction / Deletion from Cloudinary
    console.log('\n[5/5] Testing Asset Cleanup / Deletion from Cloudinary...');
    const itemDeleteRes = await cloudinaryService.deleteImage(itemUpload.public_id);
    const proofDeleteRes = await cloudinaryService.deleteImage(proofUpload.public_id, 'auto');

    if (itemDeleteRes.result === 'ok' && proofDeleteRes.result === 'ok') {
      console.log('  ✓ PASS: Item image destroyed in Cloudinary:', itemDeleteRes.result);
      console.log('  ✓ PASS: Proof document destroyed in Cloudinary:', proofDeleteRes.result);
      passed++;
    } else {
      console.error('  ✗ FAIL: Assets deletion mismatch', { itemDeleteRes, proofDeleteRes });
      failed++;
    }

  } catch (error) {
    console.error('Unexpected error during Cloudinary test flow:', error);
    failed++;
  } finally {
    await pool.end();
  }

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  process.exit(failed > 0 ? 1 : 0);
}

testCloudinaryFlow();
