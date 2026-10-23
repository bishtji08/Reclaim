const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all flags (admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    const queryParams = [];

    if (status && status !== 'all') {
      whereClause = 'WHERE f.status = $1';
      queryParams.push(status);
    }

    const query = `
      SELECT 
        f.*,
        i.title as item_title,
        i.type as item_type,
        i.status as item_status,
        i.is_suspicious as item_is_suspicious,
        u.name as reporter_name,
        flagger.name as flagger_name,
        flagger.email as flagger_email,
        reviewer.name as reviewer_name
      FROM item_flags f
      LEFT JOIN items i ON f.item_id = i.id
      LEFT JOIN users u ON i.reported_by = u.id
      LEFT JOIN users flagger ON f.flagged_by = flagger.id
      LEFT JOIN users reviewer ON f.reviewed_by = reviewer.id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(Number(limit), offset);

    const countQuery = `SELECT COUNT(*) as total FROM item_flags f ${whereClause}`;
    const [result, countRes] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, whereClause ? [status] : [])
    ]);

    const total = parseInt(countRes.rows[0].total, 10);

    res.json({
      success: true,
      data: {
        flags: result.rows,
        pagination: {
          current_page: Number(page),
          total_pages: Math.ceil(total / Number(limit)),
          total_items: total,
          items_per_page: Number(limit)
        }
      }
    });
  } catch (error) {
    console.error('Flags fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch flags' });
  }
});

// Review / update flag (admin only)
router.patch('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, admin_notes, clear_suspicion } = req.body;

    const validStatuses = ['pending', 'reviewed', 'dismissed', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid flag status' });
    }

    await client.query('BEGIN');

    const flagRes = await client.query(
      `UPDATE item_flags SET
        status = $1,
        admin_notes = COALESCE($2, admin_notes),
        reviewed_by = $3,
        reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *`,
      [status, admin_notes?.trim() || null, req.user.id, id]
    );

    if (flagRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Flag not found' });
    }

    const flag = flagRes.rows[0];

    // If dismissed or clear_suspicion requested, check if we should clear item suspicion
    if (clear_suspicion || status === 'dismissed') {
      const otherFlags = await client.query(
        "SELECT id FROM item_flags WHERE item_id = $1 AND id <> $2 AND status = 'pending'",
        [flag.item_id, id]
      );
      if (otherFlags.rows.length === 0) {
        await client.query(
          "UPDATE items SET is_suspicious = false, flag_reason = null WHERE id = $1",
          [flag.item_id]
        );
      }
    }

    // Log the action
    await client.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        'REVIEW_FLAG',
        'item_flags',
        String(id),
        JSON.stringify({ status, admin_notes }),
        req.ip
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Flag updated successfully',
      data: { flag }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Flag review error:', error);
    res.status(500).json({ success: false, message: 'Failed to update flag' });
  } finally {
    client.release();
  }
});

module.exports = router;
