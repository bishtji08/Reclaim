const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateUserId } = require('../validators/itemValidator');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, is_active } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      whereConditions.push(`role = $${paramCount}`);
      queryParams.push(role);
    }

    if (is_active !== undefined) {
      paramCount++;
      whereConditions.push(`is_active = $${paramCount}`);
      queryParams.push(is_active === 'true');
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const query = `
      SELECT 
        id, email, name, role, phone, avatar_url, 
        is_verified, is_active, is_blacklisted, blacklist_reason, blacklisted_at,
        created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get single user (admin only or own profile)
router.get('/:id', authenticateToken, validateUserId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin or requesting own profile
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this user'
      });
    }

    const query = `
      SELECT 
        id, email, name, role, phone, avatar_url, 
        is_verified, is_active, is_blacklisted, blacklist_reason, blacklisted_at,
        created_at, updated_at
      FROM users
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE type = 'lost') as lost_items,
        COUNT(*) FILTER (WHERE type = 'found') as found_items,
        COUNT(*) FILTER (WHERE status = 'returned') as returned_items
      FROM items
      WHERE reported_by = $1
    `;

    const statsResult = await pool.query(statsQuery, [id]);

    res.json({
      success: true,
      data: {
        user: result.rows[0],
        statistics: statsResult.rows[0]
      }
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// Update user (admin only or own profile)
router.put('/:id', authenticateToken, validateUserId, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, is_active } = req.body;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }

    // Non-admin users can only update their own name and phone
    let updateFields = [];
    let queryParams = [];
    let paramCount = 0;

    if (name) {
      paramCount++;
      updateFields.push(`name = $${paramCount}`);
      queryParams.push(name);
    }

    if (phone !== undefined) {
      paramCount++;
      updateFields.push(`phone = $${paramCount}`);
      queryParams.push(phone);
    }

    // Only admin can update role and is_active
    if (req.user.role === 'admin') {
      if (role) {
        paramCount++;
        updateFields.push(`role = $${paramCount}`);
        queryParams.push(role);
      }

      if (is_active !== undefined) {
        paramCount++;
        updateFields.push(`is_active = $${paramCount}`);
        queryParams.push(is_active);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    paramCount++;
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    queryParams.push(id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, name, role, phone, avatar_url, is_verified, is_active, updated_at
    `;

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log the update
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'UPDATE_USER',
      'users',
      String(id),
      JSON.stringify(req.body),
      req.ip
    ]);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Deactivate user (admin only)
router.patch('/:id/deactivate', authenticateToken, requireRole(['admin']), validateUserId, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, is_active
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log the deactivation
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'DEACTIVATE_USER',
      'users',
      String(id),
      JSON.stringify({ is_active: false }),
      req.ip
    ]);

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('User deactivation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user'
    });
  }
});

// Activate user (admin only)
router.patch('/:id/activate', authenticateToken, requireRole(['admin']), validateUserId, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE users 
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, is_active
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log the activation
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'ACTIVATE_USER',
      'users',
      String(id),
      JSON.stringify({ is_active: true }),
      req.ip
    ]);

    res.json({
      success: true,
      message: 'User activated successfully',
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('User activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate user'
    });
  }
});

// Blacklist user under moderation rules (admin only)
router.patch('/:id/blacklist', authenticateToken, requireRole(['admin']), validateUserId, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'A specific moderation reason is required to blacklist a user'
      });
    }

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot blacklist their own account'
      });
    }

    const trimmedReason = reason.trim();
    const result = await pool.query(`
      UPDATE users SET
        is_blacklisted = true,
        blacklist_reason = $1,
        blacklisted_at = CURRENT_TIMESTAMP,
        blacklisted_by = $2,
        is_active = false,
        auth_version = auth_version + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, email, name, role, is_active, is_blacklisted, blacklist_reason, blacklisted_at
    `, [trimmedReason, req.user.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log the blacklisting in audit trail
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'BLACKLIST_USER',
      'users',
      String(id),
      JSON.stringify({ is_blacklisted: true, reason: trimmedReason }),
      req.ip
    ]);

    res.json({
      success: true,
      message: 'User has been blacklisted',
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('User blacklist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to blacklist user'
    });
  }
});

// Unblacklist user (admin only)
router.patch('/:id/unblacklist', authenticateToken, requireRole(['admin']), validateUserId, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE users SET
        is_blacklisted = false,
        blacklist_reason = null,
        blacklisted_at = null,
        blacklisted_by = null,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, role, is_active, is_blacklisted
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log in audit trail
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'UNBLACKLIST_USER',
      'users',
      String(id),
      JSON.stringify({ is_blacklisted: false }),
      req.ip
    ]);

    res.json({
      success: true,
      message: 'User removed from blacklist',
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('User unblacklist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unblacklist user'
    });
  }
});

module.exports = router;