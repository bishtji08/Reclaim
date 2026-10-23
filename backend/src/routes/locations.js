const express = require('express');
const pool = require('../config/database');
const { validateCoordinates, validateId } = require('../validators/itemValidator');

const router = express.Router();

// Get all locations
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        description,
        building,
        floor,
        room,
        ST_X(coordinates) as longitude,
        ST_Y(coordinates) as latitude,
        is_active,
        created_at
      FROM locations
      WHERE is_active = true
      ORDER BY name
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: {
        locations: result.rows
      }
    });
  } catch (error) {
    console.error('Locations fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch locations'
    });
  }
});

// Get single location
router.get('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        id,
        name,
        description,
        building,
        floor,
        room,
        ST_X(coordinates) as longitude,
        ST_Y(coordinates) as latitude,
        is_active,
        created_at
      FROM locations
      WHERE id = $1 AND is_active = true
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      data: {
        location: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Location fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location'
    });
  }
});

// Get nearby locations
router.get('/nearby/:lat/:lng', validateCoordinates, async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const { radius = 5 } = req.query; // Default 5km radius

    const query = `
      SELECT 
        id,
        name,
        description,
        building,
        floor,
        room,
        ST_X(coordinates) as longitude,
        ST_Y(coordinates) as latitude,
        ST_Distance(
          coordinates::geography,
          ST_GeogFromText('POINT(' || $2 || ' ' || $1 || ')')
        ) / 1000 as distance_km
      FROM locations
      WHERE is_active = true
        AND ST_DWithin(
          coordinates::geography,
          ST_GeogFromText('POINT(' || $2 || ' ' || $1 || ')'),
          $3 * 1000
        )
      ORDER BY distance_km
    `;

    const result = await pool.query(query, [lat, lng, radius]);

    res.json({
      success: true,
      data: {
        locations: result.rows
      }
    });
  } catch (error) {
    console.error('Nearby locations fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby locations'
    });
  }
});

module.exports = router;
