const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all categories with subcategories
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.icon,
        COALESCE(
          json_agg(
            CASE WHEN sc.id IS NOT NULL THEN
              json_build_object(
                'id', sc.id,
                'name', sc.name,
                'description', sc.description
              )
            END
          ) FILTER (WHERE sc.id IS NOT NULL), 
          '[]'
        ) as subcategories
      FROM categories c
      LEFT JOIN subcategories sc ON c.id = sc.category_id
      GROUP BY c.id, c.name, c.description, c.icon
      ORDER BY c.name
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: {
        categories: result.rows
      }
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Get subcategories for a specific category
router.get('/:id/subcategories', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, description FROM subcategories WHERE category_id = $1 ORDER BY name',
      [id]
    );

    res.json({
      success: true,
      data: {
        subcategories: result.rows
      }
    });
  } catch (error) {
    console.error('Subcategories fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcategories'
    });
  }
});

// Get single category with subcategories
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.icon,
        COALESCE(
          json_agg(
            CASE WHEN sc.id IS NOT NULL THEN
              json_build_object(
                'id', sc.id,
                'name', sc.name,
                'description', sc.description
              )
            END
          ) FILTER (WHERE sc.id IS NOT NULL), 
          '[]'
        ) as subcategories
      FROM categories c
      LEFT JOIN subcategories sc ON c.id = sc.category_id
      WHERE c.id = $1
      GROUP BY c.id, c.name, c.description, c.icon
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: {
        category: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Category fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category'
    });
  }
});

// Create new category (admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    if (!name || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Category name must be between 2 and 100 characters'
      });
    }

    const trimmedName = name.trim();
    const result = await pool.query(`
      INSERT INTO categories (name, description, icon)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [trimmedName, description?.trim() || null, icon?.trim() || 'box']);

    const category = result.rows[0];

    // Log the category creation
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'CREATE_CATEGORY',
      'categories',
      String(category.id),
      JSON.stringify({ name: category.name }),
      req.ip
    ]);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Category creation error:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
});

// Update category (admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon } = req.body;

    const existing = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const result = await pool.query(`
      UPDATE categories SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        icon = COALESCE($3, icon)
      WHERE id = $4
      RETURNING *
    `, [name?.trim() || null, description?.trim() || null, icon?.trim() || null, id]);

    const category = result.rows[0];

    // Log the category update
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      req.user.id,
      'UPDATE_CATEGORY',
      'categories',
      String(id),
      JSON.stringify(existing.rows[0]),
      JSON.stringify(category),
      req.ip
    ]);

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Category update error:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has associated items
    const itemCount = await pool.query('SELECT COUNT(*) FROM items WHERE category_id = $1', [id]);
    if (parseInt(itemCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${itemCount.rows[0].count} item(s) are currently categorized under it.`
      });
    }

    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Log the deletion
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'DELETE_CATEGORY',
      'categories',
      String(id),
      JSON.stringify(result.rows[0]),
      req.ip
    ]);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Category delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
});

// Add subcategory to category (admin only)
router.post('/:id/subcategories', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory name must be between 2 and 100 characters'
      });
    }

    const result = await pool.query(`
      INSERT INTO subcategories (category_id, name, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, name.trim(), description?.trim() || null]);

    res.status(201).json({
      success: true,
      message: 'Subcategory created successfully',
      data: { subcategory: result.rows[0] }
    });
  } catch (error) {
    console.error('Subcategory creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subcategory'
    });
  }
});

// Delete subcategory (admin only)
router.delete('/subcategories/:subId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { subId } = req.params;
    const result = await pool.query('DELETE FROM subcategories WHERE id = $1 RETURNING *', [subId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Subcategory not found' });
    }

    res.json({
      success: true,
      message: 'Subcategory deleted successfully'
    });
  } catch (error) {
    console.error('Subcategory delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subcategory'
    });
  }
});

module.exports = router;
