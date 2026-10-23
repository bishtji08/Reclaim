const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateClaim, validateId, validatePagination } = require('../validators/itemValidator');
const upload = require('../utils/upload');
const notificationService = require('../services/notificationService');
const storageService = require('../services/storageService');
const cloudinaryService = require('../services/cloudinaryService');

const router = express.Router();

// Get all claims (admin only)
router.get('/', authenticateToken, requireRole(['admin']), validatePagination, async (req, res) => {
  try {
    const { status, item_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereConditions.push(`c.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (item_id) {
      paramCount++;
      whereConditions.push(`c.item_id = $${paramCount}`);
      queryParams.push(item_id);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const query = `
      SELECT 
        c.*,
        i.title as item_title,
        i.type as item_type,
        i.description as item_description,
        u.name as claimer_name_user,
        reviewer.name as reviewer_name,
        COALESCE(
          json_agg(
            CASE WHEN ci.id IS NOT NULL THEN
              json_build_object(
                'id', ci.id,
                'url', ci.image_url,
                'public_id', ci.public_id,
                'description', ci.description
              )
            END
          ) FILTER (WHERE ci.id IS NOT NULL), 
          '[]'
        ) as proof_images
      FROM claims c
      LEFT JOIN items i ON c.item_id = i.id
      LEFT JOIN users u ON c.claimer_id = u.id
      LEFT JOIN users reviewer ON c.reviewed_by = reviewer.id
      LEFT JOIN claim_images ci ON c.id = ci.claim_id
      ${whereClause}
      GROUP BY c.id, i.title, i.type, i.description, u.name, reviewer.name
      ORDER BY c.submitted_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM claims c
      LEFT JOIN items i ON c.item_id = i.id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        claims: result.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Claims fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch claims'
    });
  }
});

// Get user's claims
router.get('/my-claims', authenticateToken, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        c.*,
        i.title as item_title,
        i.type as item_type,
        i.description as item_description,
        reviewer.name as reviewer_name,
        COALESCE(
          json_agg(
            CASE WHEN ci.id IS NOT NULL THEN
              json_build_object(
                'id', ci.id,
                'url', ci.image_url,
                'public_id', ci.public_id,
                'description', ci.description
              )
            END
          ) FILTER (WHERE ci.id IS NOT NULL), 
          '[]'
        ) as proof_images
      FROM claims c
      LEFT JOIN items i ON c.item_id = i.id
      LEFT JOIN users reviewer ON c.reviewed_by = reviewer.id
      LEFT JOIN claim_images ci ON c.id = ci.claim_id
      WHERE c.claimer_id = $1
      GROUP BY c.id, i.title, i.type, i.description, reviewer.name
      ORDER BY c.submitted_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [req.user.id, limit, offset]);

    res.json({
      success: true,
      data: { claims: result.rows }
    });
  } catch (error) {
    console.error('User claims fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your claims'
    });
  }
});

// Get single claim
router.get('/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        c.*,
        i.title as item_title,
        i.type as item_type,
        i.description as item_description,
        i.reported_by as item_owner_id,
        u.name as claimer_name_user,
        reviewer.name as reviewer_name,
        COALESCE(
          json_agg(
            CASE WHEN ci.id IS NOT NULL THEN
              json_build_object(
                'id', ci.id,
                'url', ci.image_url,
                'public_id', ci.public_id,
                'description', ci.description
              )
            END
          ) FILTER (WHERE ci.id IS NOT NULL), 
          '[]'
        ) as proof_images
      FROM claims c
      LEFT JOIN items i ON c.item_id = i.id
      LEFT JOIN users u ON c.claimer_id = u.id
      LEFT JOIN users reviewer ON c.reviewed_by = reviewer.id
      LEFT JOIN claim_images ci ON c.id = ci.claim_id
      WHERE c.id = $1
      GROUP BY c.id, i.title, i.type, i.description, i.reported_by, u.name, reviewer.name
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    const claim = result.rows[0];

    // Check permissions
    if (req.user.role !== 'admin' && 
        req.user.role !== 'finder' && 
        req.user.id !== claim.claimer_id &&
        req.user.id !== claim.item_owner_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this claim'
      });
    }

    res.json({
      success: true,
      data: { claim }
    });
  } catch (error) {
    console.error('Claim fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch claim'
    });
  }
});

// Submit new claim
router.post('/', authenticateToken, upload.array('proof_images', 3), validateClaim, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      item_id,
      claimer_phone,
      description
    } = req.body;

    // Check if item exists and is claimable
    const itemCheck = await client.query(`
      SELECT id, title, type, status, reported_by 
      FROM items 
      WHERE id = $1 AND status IN ('reported', 'matched')
    `, [item_id]);

    if (itemCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Item not found or not available for claiming'
      });
    }

    const item = itemCheck.rows[0];

    if (item.reported_by === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'You cannot claim an item you reported'
      });
    }

    // Check if user already has a pending claim for this item
    const existingClaim = await client.query(`
      SELECT id FROM claims 
      WHERE item_id = $1 AND claimer_id = $2 AND status = 'pending'
    `, [item_id, req.user.id]);

    if (existingClaim.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'You already have a pending claim for this item'
      });
    }

    // Create claim
    const claimResult = await client.query(`
      INSERT INTO claims (
        item_id, claimer_id, claimer_name, claimer_email, claimer_phone,
        description
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      item_id, req.user.id, req.user.name, req.user.email, claimer_phone || null,
      description
    ]);

    const claim = claimResult.rows[0];

    // Handle proof images via Cloudinary
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await cloudinaryService.uploadClaimProof(file, req.user.id, claim.id);
        const imageUrl = uploadResult.secure_url;
        const publicId = uploadResult.public_id;
        
        await client.query(`
          INSERT INTO claim_images (claim_id, image_url, public_id, description)
          VALUES ($1, $2, $3, $4)
        `, [claim.id, imageUrl, publicId, file.originalname]);
      }
    }

    // Create notifications
    // Notify item owner
    await client.query(`
      INSERT INTO notifications (user_id, title, message, type, related_item_id, related_claim_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      item.reported_by,
      'New Claim Submitted',
      `Someone has claimed your ${item.type} item: ${item.title}`,
      'claim',
      item_id,
      claim.id
    ]);

    // Notify admins/finders
    const adminUsers = await client.query(`
      SELECT id FROM users WHERE role IN ('admin', 'finder') AND is_active = true
    `);

    for (const admin of adminUsers.rows) {
      await client.query(`
        INSERT INTO notifications (user_id, title, message, type, related_item_id, related_claim_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        admin.id,
        'New Claim to Review',
        `A new claim has been submitted for item: ${item.title}`,
        'claim',
        item_id,
        claim.id
      ]);
    }

    // Log the claim submission
    await client.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'SUBMIT_CLAIM',
      'claims',
      claim.id,
      JSON.stringify({ item_id }),
      req.ip
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Claim submitted successfully',
      data: { claim }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Claim submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit claim'
    });
  } finally {
    client.release();
  }
});

// Review claim (admin only)
router.patch('/:id/review', authenticateToken, requireRole(['admin']), validateId, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { status, review_notes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Status must be either approved or rejected'
      });
    }

    // Get claim details
    const claimResult = await client.query(`
      SELECT c.*, i.title as item_title, i.reported_by as item_owner_id
      FROM claims c
      LEFT JOIN items i ON c.item_id = i.id
      WHERE c.id = $1 AND c.status = 'pending'
    `, [id]);

    if (claimResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Claim not found or already reviewed'
      });
    }

    const claim = claimResult.rows[0];

    // Update claim
    const updateResult = await client.query(`
      UPDATE claims SET
        status = $1,
        reviewed_by = $2,
        reviewed_at = CURRENT_TIMESTAMP,
        review_notes = $3
      WHERE id = $4
      RETURNING *
    `, [status, req.user.id, review_notes, id]);

    // If approved, update item status
    if (status === 'approved') {
      await client.query(`
        UPDATE items SET
          status = 'claimed',
          claimed_by = $1,
          claimed_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [claim.claimer_id, claim.item_id]);
    }

    // Create notifications
    // Notify claimer
    await client.query(`
      INSERT INTO notifications (user_id, title, message, type, related_claim_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      claim.claimer_id,
      `Claim ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      `Your claim for "${claim.item_title}" has been ${status}`,
      'claim',
      claim.id
    ]);

    // Notify item owner
    await client.query(`
      INSERT INTO notifications (user_id, title, message, type, related_claim_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      claim.item_owner_id,
      `Claim ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      `A claim for your item "${claim.item_title}" has been ${status}`,
      'claim',
      claim.id
    ]);

    // Log the review
    await client.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'REVIEW_CLAIM',
      'claims',
      id,
      JSON.stringify({ status, review_notes }),
      req.ip
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Claim ${status} successfully`,
      data: { claim: updateResult.rows[0] }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Claim review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review claim'
    });
  } finally {
    client.release();
  }
});

// Withdraw claim
router.patch('/:id/withdraw', authenticateToken, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns the claim
    const claimCheck = await pool.query(`
      SELECT claimer_id, status FROM claims WHERE id = $1
    `, [id]);

    if (claimCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    if (claimCheck.rows[0].claimer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to withdraw this claim'
      });
    }

    if (claimCheck.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only withdraw pending claims'
      });
    }

    // Update claim status
    const result = await pool.query(`
      UPDATE claims SET
        status = 'withdrawn',
        reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    // Log the withdrawal
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'WITHDRAW_CLAIM',
      'claims',
      id,
      JSON.stringify({ status: 'withdrawn' }),
      req.ip
    ]);

    res.json({
      success: true,
      message: 'Claim withdrawn successfully',
      data: { claim: result.rows[0] }
    });
  } catch (error) {
    console.error('Claim withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw claim'
    });
  }
});

// Delete claim proof (admin or owner of pending claim)
router.delete('/:id/proofs/:proofId', authenticateToken, validateId, async (req, res) => {
  try {
    const { id, proofId } = req.params;
    const claimCheck = await pool.query('SELECT claimer_id, status FROM claims WHERE id = $1', [id]);
    if (claimCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }
    if (claimCheck.rows[0].claimer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this claim' });
    }

    const imgRes = await pool.query(
      'SELECT id, image_url, public_id FROM claim_images WHERE id = $1 AND claim_id = $2',
      [proofId, id]
    );
    if (imgRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Proof document not found' });
    }

    const img = imgRes.rows[0];
    const publicId = img.public_id || cloudinaryService.extractPublicId(img.image_url);
    if (publicId) {
      try {
        await cloudinaryService.deleteImage(publicId, 'auto');
      } catch (delErr) {
        console.warn(`Failed to destroy Cloudinary claim proof ${publicId}:`, delErr.message);
      }
    }

    await pool.query('DELETE FROM claim_images WHERE id = $1', [proofId]);
    res.json({ success: true, message: 'Proof document deleted successfully' });
  } catch (error) {
    console.error('Delete claim proof error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete proof document' });
  }
});

module.exports = router;
