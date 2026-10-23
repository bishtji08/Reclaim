const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get recent reviews for campus trust display
router.get('/recent', async (req, res) => {
  try {
    const query = `
      SELECT 
        r.*,
        u.name as reviewer_name,
        u.avatar_url as reviewer_avatar,
        i.title as item_title,
        i.type as item_type
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      JOIN items i ON r.item_id = i.id
      ORDER BY r.created_at DESC
      LIMIT 10
    `;

    const result = await pool.query(query);

    // Compute aggregate rating stats
    const statsRes = await pool.query(`
      SELECT 
        COUNT(*) as total_reviews,
        ROUND(AVG(rating), 1) as average_rating,
        COUNT(*) FILTER (WHERE was_returned = true) as returned_count
      FROM reviews
    `);

    res.json({
      success: true,
      data: {
        reviews: result.rows,
        stats: statsRes.rows[0]
      }
    });
  } catch (error) {
    console.error('Recent reviews fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

// Get reviews for a specific item
router.get('/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    const query = `
      SELECT 
        r.*,
        u.name as reviewer_name
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.item_id = $1
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(query, [itemId]);

    res.json({
      success: true,
      data: {
        reviews: result.rows
      }
    });
  } catch (error) {
    console.error('Item reviews fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews for item' });
  }
});

// Submit a review (authenticated)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { item_id, claim_id, rating, comment, was_returned = true } = req.body;

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5 stars'
      });
    }

    // Verify item exists
    const itemCheck = await pool.query(
      'SELECT id, title, reported_by, status FROM items WHERE id = $1',
      [item_id]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const item = itemCheck.rows[0];

    // Check if user was involved with the item (reporter or claimer)
    const isReporter = item.reported_by === req.user.id;
    let isClaimer = false;

    if (!isReporter) {
      const claimCheck = await pool.query(
        'SELECT id FROM claims WHERE item_id = $1 AND claimer_id = $2',
        [item_id, req.user.id]
      );
      isClaimer = claimCheck.rows.length > 0;
    }

    if (!isReporter && !isClaimer && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only leave feedback on items you reported or claimed'
      });
    }

    const result = await pool.query(`
      INSERT INTO reviews (
        item_id, claim_id, reviewer_id, rating, comment, was_returned
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (item_id, reviewer_id) DO UPDATE SET
        rating = EXCLUDED.rating,
        comment = EXCLUDED.comment,
        was_returned = EXCLUDED.was_returned,
        created_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      item_id,
      claim_id || null,
      req.user.id,
      numRating,
      comment?.trim() || null,
      Boolean(was_returned)
    ]);

    const review = result.rows[0];

    // Log the review
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'SUBMIT_REVIEW',
      'reviews',
      String(review.id),
      JSON.stringify({ item_id, rating: numRating }),
      req.ip
    ]);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully. Thank you for supporting campus trust!',
      data: { review }
    });
  } catch (error) {
    console.error('Review submit error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
});

module.exports = router;
