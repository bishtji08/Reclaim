const express = require('express');
const pool = require('../config/database');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');
const { validateItem, validateSearch, validateId } = require('../validators/itemValidator');
const upload = require('../utils/upload');
const notificationService = require('../services/notificationService');
const storageService = require('../services/storageService');
const cloudinaryService = require('../services/cloudinaryService');

const router = express.Router();

// Get all items with filtering and pagination
router.get('/', optionalAuth, validateSearch, async (req, res) => {
  try {
    const {
      q, // search query
      type,
      category_id,
      location_id,
      status,
      color,
      is_urgent,
      date_from,
      date_to,
      lat,
      lng,
      radius = 10, // km
      page = 1,
      limit = 20,
      sort_by = 'reported_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Build WHERE conditions
    if (q) {
      paramCount++;
      whereConditions.push(`(
        to_tsvector('english', i.title || ' ' || i.description) @@ plainto_tsquery('english', $${paramCount})
        OR i.title ILIKE $${paramCount + 1}
        OR i.description ILIKE $${paramCount + 1}
      )`);
      queryParams.push(q, `%${q}%`);
      paramCount++;
    }

    if (type) {
      paramCount++;
      whereConditions.push(`i.type = $${paramCount}`);
      queryParams.push(type);
    }

    if (category_id) {
      paramCount++;
      whereConditions.push(`i.category_id = $${paramCount}`);
      queryParams.push(category_id);
    }

    if (location_id) {
      paramCount++;
      whereConditions.push(`i.location_id = $${paramCount}`);
      queryParams.push(location_id);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`i.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (color) {
      paramCount++;
      whereConditions.push(`i.color ILIKE $${paramCount}`);
      queryParams.push(`%${color}%`);
    }

    if (is_urgent !== undefined) {
      paramCount++;
      whereConditions.push(`i.is_urgent = $${paramCount}`);
      queryParams.push(is_urgent === 'true');
    }

    if (date_from) {
      paramCount++;
      whereConditions.push(`i.reported_at >= $${paramCount}`);
      queryParams.push(date_from);
    }

    if (date_to) {
      paramCount++;
      whereConditions.push(`i.reported_at <= $${paramCount}`);
      queryParams.push(date_to);
    }

    // Location-based filtering
    if (lat && lng) {
      paramCount++;
      whereConditions.push(`
        ST_DWithin(
          i.coordinates::geography,
          ST_GeogFromText('POINT(' || $${paramCount + 1} || ' ' || $${paramCount} || ')'),
          $${paramCount + 2} * 1000
        )
      `);
      queryParams.push(lat, lng, radius);
      paramCount += 2;
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Validate sort parameters
    const validSortColumns = ['reported_at', 'title', 'status', 'type', 'is_urgent'];
    const validSortOrders = ['ASC', 'DESC'];

    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'reported_at';
    const sortOrderClean = validSortOrders.includes(sort_order.toUpperCase())
      ? sort_order.toUpperCase()
      : 'DESC';

    // Main query
    const query = `
      SELECT 
        i.*,
        u.name as reported_by_name,
        c.name as category_name,
        sc.name as subcategory_name,
        l.name as location_name,
        l.coordinates as location_coordinates,
        COALESCE(
          json_agg(
            CASE WHEN img.id IS NOT NULL THEN
              json_build_object(
                'id', img.id,
                'url', img.image_url,
                'public_id', img.public_id,
                'is_primary', img.is_primary
              )
            END
          ) FILTER (WHERE img.id IS NOT NULL), 
          '[]'
        ) as images,
        COALESCE(
          array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), 
          ARRAY[]::text[]
        ) as tags
      FROM items i
      LEFT JOIN users u ON i.reported_by = u.id
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN subcategories sc ON i.subcategory_id = sc.id
      LEFT JOIN locations l ON i.location_id = l.id
      LEFT JOIN item_images img ON i.id = img.item_id
      LEFT JOIN item_tags it ON i.id = it.item_id
      LEFT JOIN tags t ON it.tag_id = t.id
      ${whereClause}
      GROUP BY i.id, u.name, c.name, sc.name, l.name, l.coordinates
      ORDER BY i.${sortColumn} ${sortOrderClean}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT i.id) as total
      FROM items i
      LEFT JOIN users u ON i.reported_by = u.id
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN subcategories sc ON i.subcategory_id = sc.id
      LEFT JOIN locations l ON i.location_id = l.id
      LEFT JOIN item_tags it ON i.id = it.item_id
      LEFT JOIN tags t ON it.tag_id = t.id
      ${whereClause}
    `;

    const [itemsResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);

    const items = itemsResult.rows.map((item) => {
      // Serial numbers, internal claim data, and private ownership fields are
      // not useful in a public search result and can enable fraudulent claims.
      delete item.serial_number;
      delete item.claimed_by;
      delete item.matched_with;
      return item;
    });
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: parseInt(limit),
          has_next: page < totalPages,
          has_prev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Items fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch items'
    });
  }
});

// Get single item by ID
router.get('/:id', optionalAuth, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        i.*,
        u.name as reported_by_name,
        u.email as reported_by_email,
        u.phone as reported_by_phone,
        c.name as category_name,
        sc.name as subcategory_name,
        l.name as location_name,
        l.coordinates as location_coordinates,
        l.building,
        l.floor,
        l.room,
        COALESCE(
          json_agg(
            CASE WHEN img.id IS NOT NULL THEN
              json_build_object(
                'id', img.id,
                'url', img.image_url,
                'public_id', img.public_id,
                'is_primary', img.is_primary
              )
            END
          ) FILTER (WHERE img.id IS NOT NULL), 
          '[]'
        ) as images,
        COALESCE(
          array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), 
          ARRAY[]::text[]
        ) as tags
      FROM items i
      LEFT JOIN users u ON i.reported_by = u.id
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN subcategories sc ON i.subcategory_id = sc.id
      LEFT JOIN locations l ON i.location_id = l.id
      LEFT JOIN item_images img ON i.id = img.item_id
      LEFT JOIN item_tags it ON i.id = it.item_id
      LEFT JOIN tags t ON it.tag_id = t.id
      WHERE i.id = $1
      GROUP BY i.id, u.name, u.email, u.phone, c.name, sc.name, l.name, l.coordinates, l.building, l.floor, l.room
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    const item = result.rows[0];

    // Keep identifying details visible only to the reporter or staff.
    const canViewPrivateDetails = req.user && (
      req.user.id === item.reported_by ||
      req.user.role === 'admin' ||
      req.user.role === 'finder'
    );
    if (!canViewPrivateDetails) {
      delete item.reported_by_email;
      delete item.reported_by_phone;
      delete item.serial_number;
      delete item.dimensions;
      delete item.claimed_by;
    }

    res.json({
      success: true,
      data: { item }
    });
  } catch (error) {
    console.error('Item fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item'
    });
  }
});

// Create new item
router.post('/', authenticateToken, upload.array('images', 5), validateItem, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      title,
      description,
      type,
      category_id,
      subcategory_id,
      location_id,
      specific_location,
      color,
      brand,
      model,
      serial_number,
      dimensions,
      estimated_value,
      is_urgent = false,
      reward_offered,
      date_lost_found,
      time_lost_found,
      tags = [],
      coordinates
    } = req.body;

    // Parse coordinates if provided
    let coordinatesGeom = null;
    if (coordinates) {
      try {
        const parsed = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
        if (parsed && parsed.lat !== undefined && parsed.lng !== undefined) {
          coordinatesGeom = `POINT(${parsed.lng} ${parsed.lat})`;
        }
      } catch (e) {
        coordinatesGeom = null;
      }
    }

    // Safely parse dimensions
    let dimensionsJson = null;
    if (dimensions) {
      if (typeof dimensions === 'string') {
        try {
          dimensionsJson = JSON.stringify(JSON.parse(dimensions));
        } catch (e) {
          dimensionsJson = null;
        }
      } else if (typeof dimensions === 'object') {
        dimensionsJson = JSON.stringify(dimensions);
      }
    }

    let finalLocationId = (!isNaN(Number(location_id)) && Number(location_id) > 0) ? Number(location_id) : null;
    const manualLocation = (req.body.custom_location || req.body.location_name || '').trim();

    if (!finalLocationId && manualLocation) {
      const locCheck = await client.query(
        'SELECT id FROM locations WHERE lower(name) = lower($1) LIMIT 1',
        [manualLocation]
      );
      if (locCheck.rows.length > 0) {
        finalLocationId = locCheck.rows[0].id;
      } else {
        const newLoc = await client.query(`
          INSERT INTO locations (name, coordinates, is_active)
          VALUES ($1, CASE WHEN $2::text IS NOT NULL THEN ST_GeomFromText($2, 4326) ELSE NULL END, true)
          RETURNING id
        `, [manualLocation, coordinatesGeom]);
        finalLocationId = newLoc.rows[0].id;
      }
    }

    if (!finalLocationId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'A valid location is required'
      });
    }

    const isUrgentBool = Boolean(is_urgent === true || is_urgent === 'true');

    // Insert item
    const itemResult = await client.query(`
      INSERT INTO items (
        title, description, type, category_id, subcategory_id, reported_by,
        location_id, specific_location, coordinates, color, brand, model,
        serial_number, dimensions, estimated_value, is_urgent, reward_offered,
        date_lost_found, time_lost_found
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $9::text IS NOT NULL THEN ST_GeomFromText($9, 4326) ELSE NULL END, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      title, description, type, category_id, subcategory_id || null, req.user.id,
      finalLocationId, specific_location || null, coordinatesGeom, color || null,
      brand || null, model || null, serial_number || null,
      dimensionsJson, estimated_value || null,
      isUrgentBool, reward_offered || null, date_lost_found || null, time_lost_found || null
    ]);

    const item = itemResult.rows[0];

    // Handle image uploads via Cloudinary
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const uploadResult = await cloudinaryService.uploadItemImage(file, item.id, req.user.id);
        const imageUrl = uploadResult.secure_url;
        const publicId = uploadResult.public_id;

        await client.query(`
          INSERT INTO item_images (item_id, image_url, public_id, is_primary)
          VALUES ($1, $2, $3, $4)
        `, [item.id, imageUrl, publicId, i === 0]);
      }
    }

    // Handle tags
    let tagList = [];
    if (Array.isArray(tags)) {
      tagList = tags;
    } else if (typeof tags === 'string' && tags.trim()) {
      try {
        const parsed = JSON.parse(tags);
        tagList = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    if (tagList.length > 0) {
      for (const tagName of tagList) {
        // Insert or get tag
        const tagResult = await client.query(`
          INSERT INTO tags (name) VALUES ($1)
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `, [tagName.toLowerCase().trim()]);

        const tagId = tagResult.rows[0].id;

        // Link tag to item
        await client.query(`
          INSERT INTO item_tags (item_id, tag_id) VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [item.id, tagId]);
      }
    }

    // Log the creation
    await client.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'CREATE_ITEM',
      'items',
      item.id,
      JSON.stringify({ title, type, category_id }),
      req.ip
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: { item }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Item creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create item'
    });
  } finally {
    client.release();
  }
});

// Update item
router.put('/:id', authenticateToken, upload.array('images', 5), validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category_id,
      subcategory_id,
      location_id,
      specific_location,
      color,
      brand,
      model,
      estimated_value,
      is_urgent,
      reward_offered
    } = req.body;

    // Check if user owns the item or is admin
    const ownershipCheck = await pool.query(
      'SELECT reported_by FROM items WHERE id = $1',
      [id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    if (ownershipCheck.rows[0].reported_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
    }

    const result = await pool.query(`
      UPDATE items SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category_id = COALESCE($3, category_id),
        subcategory_id = COALESCE($4, subcategory_id),
        location_id = COALESCE($5, location_id),
        specific_location = COALESCE($6, specific_location),
        color = COALESCE($7, color),
        brand = COALESCE($8, brand),
        model = COALESCE($9, model),
        estimated_value = COALESCE($10, estimated_value),
        is_urgent = COALESCE($11, is_urgent),
        reward_offered = COALESCE($12, reward_offered),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `, [
      title, description, category_id, subcategory_id, location_id,
      specific_location, color, brand, model, estimated_value,
      is_urgent, reward_offered, id
    ]);

    // Handle any newly uploaded images via Cloudinary
    if (req.files && req.files.length > 0) {
      const primaryCheck = await pool.query(
        'SELECT 1 FROM item_images WHERE item_id = $1 AND is_primary = true',
        [id]
      );
      const hasPrimary = primaryCheck.rows.length > 0;

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const uploadResult = await cloudinaryService.uploadItemImage(file, id, req.user.id);
        const imageUrl = uploadResult.secure_url;
        const publicId = uploadResult.public_id;

        await pool.query(`
          INSERT INTO item_images (item_id, image_url, public_id, is_primary)
          VALUES ($1, $2, $3, $4)
        `, [id, imageUrl, publicId, !hasPrimary && i === 0]);
      }
    }

    // Log the update
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'UPDATE_ITEM',
      'items',
      id,
      JSON.stringify(req.body),
      req.ip
    ]);

    res.json({
      success: true,
      message: 'Item updated successfully',
      data: { item: result.rows[0] }
    });
  } catch (error) {
    console.error('Item update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item'
    });
  }
});

// Delete specific item image
router.delete('/:id/images/:imageId', authenticateToken, validateId, async (req, res) => {
  try {
    const { id, imageId } = req.params;

    // Verify item ownership or admin
    const ownershipCheck = await pool.query(
      'SELECT reported_by FROM items WHERE id = $1',
      [id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (ownershipCheck.rows[0].reported_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this item' });
    }

    // Find image record
    const imgRes = await pool.query(
      'SELECT id, image_url, public_id, is_primary FROM item_images WHERE id = $1 AND item_id = $2',
      [imageId, id]
    );

    if (imgRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    const img = imgRes.rows[0];
    const publicId = img.public_id || cloudinaryService.extractPublicId(img.image_url);
    if (publicId) {
      try {
        await cloudinaryService.deleteImage(publicId, 'image');
      } catch (delErr) {
        console.warn(`Failed to destroy Cloudinary image ${publicId}:`, delErr.message);
      }
    }

    await pool.query('DELETE FROM item_images WHERE id = $1', [imageId]);

    // If deleted image was primary, promote the first remaining image
    if (img.is_primary) {
      await pool.query(`
        UPDATE item_images
        SET is_primary = true
        WHERE id = (
          SELECT id FROM item_images WHERE item_id = $1 ORDER BY id ASC LIMIT 1
        )
      `, [id]);
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete item image error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete image' });
  }
});

// Delete item
router.delete('/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns the item or is admin
    const ownershipCheck = await pool.query(
      'SELECT reported_by, title FROM items WHERE id = $1',
      [id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    if (ownershipCheck.rows[0].reported_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this item'
      });
    }

    // Retrieve and destroy associated Cloudinary images
    const imageRecords = await pool.query(
      'SELECT id, image_url, public_id FROM item_images WHERE item_id = $1',
      [id]
    );

    for (const img of imageRecords.rows) {
      const publicId = img.public_id || cloudinaryService.extractPublicId(img.image_url);
      if (publicId) {
        try {
          await cloudinaryService.deleteImage(publicId, 'image');
        } catch (delErr) {
          console.warn(`Failed to destroy Cloudinary image ${publicId}:`, delErr.message);
        }
      }
    }

    // Also clean up any proof images for claims against this item
    const claimImageRecords = await pool.query(
      `SELECT ci.public_id, ci.image_url 
       FROM claim_images ci 
       JOIN claims c ON ci.claim_id = c.id 
       WHERE c.item_id = $1`,
      [id]
    );
    for (const cImg of claimImageRecords.rows) {
      const publicId = cImg.public_id || cloudinaryService.extractPublicId(cImg.image_url);
      if (publicId) {
        try {
          await cloudinaryService.deleteImage(publicId, 'auto');
        } catch (delErr) {
          console.warn(`Failed to destroy Cloudinary claim proof ${publicId}:`, delErr.message);
        }
      }
    }

    await pool.query('DELETE FROM items WHERE id = $1', [id]);

    // Log the deletion
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'DELETE_ITEM',
      'items',
      id,
      JSON.stringify(ownershipCheck.rows[0]),
      req.ip
    ]);

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Item deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete item'
    });
  }
});

// Get potential matches for an item
router.get('/:id/matches', authenticateToken, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    const itemResult = await pool.query('SELECT reported_by FROM items WHERE id = $1', [id]);
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    if (
      itemResult.rows[0].reported_by !== req.user.id &&
      !['admin', 'finder'].includes(req.user.role)
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to view matches for this item' });
    }

    const result = await pool.query('SELECT * FROM find_potential_matches($1)', [id]);

    res.json({
      success: true,
      data: { matches: result.rows }
    });
  } catch (error) {
    console.error('Matches fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch potential matches'
    });
  }
});

// Update item status
router.patch('/:id/status', authenticateToken, requireRole(['admin', 'finder']), validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, matched_with, closure_reason } = req.body;

    const validStatuses = ['reported', 'matched', 'claimed', 'returned', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    if (status === 'matched') {
      const matchId = Number(matched_with);
      if (!Number.isSafeInteger(matchId) || matchId < 1 || String(matchId) === String(id)) {
        return res.status(400).json({ success: false, message: 'A different matching item is required' });
      }

      const matchCheck = await pool.query(
        'SELECT id, type, status FROM items WHERE id = ANY($1::bigint[])',
        [[id, matchId]]
      );
      const sourceItem = matchCheck.rows.find((row) => String(row.id) === String(id));
      const candidateItem = matchCheck.rows.find((row) => String(row.id) === String(matchId));

      if (!sourceItem || !candidateItem || sourceItem.type === candidateItem.type || candidateItem.status !== 'reported') {
        return res.status(400).json({
          success: false,
          message: 'Matches must be an available item of the opposite type'
        });
      }
    }

    if (status === 'closed' && (typeof closure_reason !== 'string' || closure_reason.trim().length < 3)) {
      return res.status(400).json({ success: false, message: 'A closure reason is required' });
    }

    let updateQuery = `
      UPDATE items SET 
        status = $1,
        updated_at = CURRENT_TIMESTAMP
    `;
    let queryParams = [status];
    let paramCount = 1;

    if (status === 'matched' && matched_with) {
      paramCount++;
      updateQuery += `, matched_with = $${paramCount}, matched_at = CURRENT_TIMESTAMP`;
      queryParams.push(matched_with);
    }

    if (status === 'closed' && closure_reason) {
      paramCount++;
      updateQuery += `, closure_reason = $${paramCount}, closed_at = CURRENT_TIMESTAMP`;
      queryParams.push(closure_reason);
    }

    if (status === 'returned') {
      updateQuery += `, returned_at = CURRENT_TIMESTAMP`;
    }

    paramCount++;
    updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
    queryParams.push(id);

    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Create notification for item owner
    const item = result.rows[0];
    await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, related_item_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      item.reported_by,
      'Item Status Updated',
      `Your item "${item.title}" status has been updated to ${status}`,
      'status_update',
      item.id
    ]);

    // Log the status change
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'UPDATE_STATUS',
      'items',
      id,
      JSON.stringify({ status, matched_with, closure_reason }),
      req.ip
    ]);

    res.json({
      success: true,
      message: 'Item status updated successfully',
      data: { item: result.rows[0] }
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item status'
    });
  }
});

// Flag an item as suspicious (any authenticated student/finder/admin)
router.post('/:id/flag', authenticateToken, validateId, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'A description of why this report is suspicious is required'
      });
    }

    const trimmedReason = reason.trim();

    await client.query('BEGIN');

    const itemRes = await client.query('SELECT id, title, reported_by FROM items WHERE id = $1', [id]);
    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Insert into item_flags
    const flagRes = await client.query(`
      INSERT INTO item_flags (item_id, flagged_by, reason)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, req.user.id, trimmedReason]);

    // Mark item as suspicious
    await client.query(`
      UPDATE items SET
        is_suspicious = true,
        flag_reason = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [trimmedReason, id]);

    // Log the flag in audit trail
    await client.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'FLAG_SUSPICIOUS_ITEM',
      'items',
      String(id),
      JSON.stringify({ reason: trimmedReason }),
      req.ip
    ]);

    await client.query('COMMIT');

    // Notify admins asynchronously
    pool.query("SELECT id FROM users WHERE role = 'admin' AND is_active = true").then((admins) => {
      admins.rows.forEach((admin) => {
        notificationService.createNotification({
          userId: admin.id,
          title: 'Suspicious Item Flagged',
          message: `User flagged item "${itemRes.rows[0].title}" as suspicious: "${trimmedReason}"`,
          type: 'system',
          relatedItemId: id,
        });
      });
    }).catch(() => { });

    res.status(201).json({
      success: true,
      message: 'Item has been flagged for administrative review',
      data: { flag: flagRes.rows[0] }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Item flag error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to flag item'
    });
  } finally {
    client.release();
  }
});

// Admin review/update suspicious status
router.patch('/:id/suspicious', authenticateToken, requireRole(['admin']), validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_suspicious, flag_reason } = req.body;

    const result = await pool.query(`
      UPDATE items SET
        is_suspicious = $1,
        flag_reason = CASE WHEN $1 = true THEN COALESCE($2, flag_reason) ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [Boolean(is_suspicious), flag_reason || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      'UPDATE_SUSPICIOUS_STATUS',
      'items',
      String(id),
      JSON.stringify({ is_suspicious, flag_reason }),
      req.ip
    ]);

    res.json({
      success: true,
      message: is_suspicious ? 'Item marked as suspicious' : 'Suspicious flag cleared',
      data: { item: result.rows[0] }
    });
  } catch (error) {
    console.error('Update suspicious error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item suspicious status'
    });
  }
});

module.exports = router;
