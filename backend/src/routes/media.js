const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();
const primaryUploadsDir = path.resolve(__dirname, '../../uploads');
const fallbackUploadsDir = path.resolve(__dirname, '../uploads');
const safeFilename = /^[a-zA-Z0-9_-]+-\d+-\d+\.(?:jpe?g|png|webp|gif)$/i;

router.get('/:filename', optionalAuth, async (req, res, next) => {
  const { filename } = req.params;

  if (!safeFilename.test(filename)) {
    return res.status(404).json({ success: false, message: 'Media not found' });
  }

  const mediaPath = `/api/media/${filename}`;
  const legacyPath = `/uploads/${filename}`;

  try {
    // Check if there is an item_image matching this filename (direct or migrated to Cloudinary)
    const itemImage = await pool.query(
      `SELECT image_url FROM item_images 
       WHERE image_url in ($1, $2) OR image_url ILIKE $3 
       LIMIT 1`,
      [mediaPath, legacyPath, `%${filename}%`]
    );

    if (itemImage.rowCount > 0 && itemImage.rows[0].image_url.startsWith('https://res.cloudinary.com/')) {
      return res.redirect(301, itemImage.rows[0].image_url);
    }

    if (itemImage.rowCount === 0) {
      const claimImage = await pool.query(
        `select c.claimer_id, i.reported_by, ci.image_url
         from claim_images ci
         join claims c on c.id = ci.claim_id
         join items i on i.id = c.item_id
         where ci.image_url in ($1, $2) or ci.image_url ILIKE $3
         limit 1`,
        [mediaPath, legacyPath, `%${filename}%`]
      );

      const claim = claimImage.rows[0];
      const canViewClaimImage = claim && req.user && (
        req.user.role === 'admin' ||
        req.user.role === 'finder' ||
        claim.claimer_id === req.user.id ||
        claim.reported_by === req.user.id
      );

      if (!canViewClaimImage) {
        return res.status(404).json({ success: false, message: 'Media not found' });
      }

      if (claim && claim.image_url && claim.image_url.startsWith('https://res.cloudinary.com/')) {
        return res.redirect(301, claim.image_url);
      }
    }

    let targetDir = primaryUploadsDir;
    if (!fs.existsSync(path.join(primaryUploadsDir, filename))) {
      if (fs.existsSync(path.join(fallbackUploadsDir, filename))) {
        targetDir = fallbackUploadsDir;
      } else {
        return res.status(404).json({ success: false, message: 'File not found on disk' });
      }
    }

    res.set({
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.sendFile(filename, { root: targetDir }, (error) => {
      if (error && !res.headersSent) {
        return res.status(404).json({ success: false, message: 'File not found on disk' });
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
