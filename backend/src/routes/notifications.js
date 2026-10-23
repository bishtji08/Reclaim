const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateId, validatePagination } = require('../validators/itemValidator');

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, is_read } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['user_id = $1'];
    let queryParams = [req.user.id];
    let paramCount = 1;

    if (is_read !== undefined) {
      paramCount++;
      whereConditions.push(`is_read = $${paramCount}`);
      queryParams.push(is_read === 'true');
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        n.*,
        i.title as item_title,
        c.claimer_name
      FROM notifications n
      LEFT JOIN items i ON n.related_item_id = i.id
      LEFT JOIN claims c ON n.related_claim_id = c.id
      WHERE ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Get unread count
    const unreadCountQuery = `
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `;

    const unreadResult = await pool.query(unreadCountQuery, [req.user.id]);

    res.json({
      success: true,
      data: {
        notifications: result.rows,
        unread_count: parseInt(unreadResult.rows[0].unread_count)
      }
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE notifications 
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification: result.rows[0] }
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await pool.query(`
      UPDATE notifications 
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_read = false
    `, [req.user.id]);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM notifications 
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

module.exports = router;
