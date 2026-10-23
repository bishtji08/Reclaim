const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validate');

const validateItem = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters'),
  body('description')
    .trim()
    .isLength({ min: 3, max: 2000 })
    .withMessage('Description must be between 3 and 2000 characters'),
  body('type')
    .isIn(['lost', 'found'])
    .withMessage('Type must be either lost or found'),
  body('category_id')
    .isInt({ min: 1 })
    .withMessage('Valid category is required'),
  body('location_id')
    .optional({ checkFalsy: true }),
  body('custom_location')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Custom location must be between 2 and 255 characters'),
  body().custom((value, { req }) => {
    const hasLocationId = req.body.location_id && req.body.location_id !== 'custom' && !isNaN(Number(req.body.location_id)) && Number(req.body.location_id) > 0;
    const hasCustomLocation = (req.body.custom_location && req.body.custom_location.trim().length >= 2) ||
                              (req.body.location_name && req.body.location_name.trim().length >= 2);
    if (!hasLocationId && !hasCustomLocation) {
      throw new Error('Please select a campus location or enter one manually');
    }
    return true;
  }),
  body('subcategory_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Subcategory ID must be a valid integer'),
  body('color')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Color must be less than 50 characters'),
  body('brand')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Brand must be less than 100 characters'),
  body('estimated_value')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Estimated value must be a positive number'),
  body('is_urgent')
    .optional({ checkFalsy: true })
    .customSanitizer(value => value === true || value === 'true')
    .isBoolean()
    .withMessage('is_urgent must be a boolean'),
  body('coordinates')
    .optional({ checkFalsy: true })
    .custom((value) => {
      const coordinates = typeof value === 'string' ? JSON.parse(value) : value;
      const lat = Number(coordinates?.lat);
      const lng = Number(coordinates?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        throw new Error('Coordinates must contain valid latitude and longitude values');
      }
      return true;
    }),
  handleValidationErrors
];

const validateClaim = [
  body('item_id')
    .isInt({ min: 1 })
    .withMessage('Valid item ID is required'),
  body('claimer_phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 32 })
    .withMessage('Phone number must be at most 32 characters'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Description must be between 20 and 1000 characters'),
  handleValidationErrors
];

const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('type')
    .optional()
    .isIn(['lost', 'found'])
    .withMessage('Type must be either lost or found'),
  query('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  query('location_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Location ID must be a positive integer'),
  query('status')
    .optional()
    .isIn(['reported', 'matched', 'claimed', 'returned', 'closed'])
    .withMessage('Invalid status'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors
];

const validateCoordinates = [
  param('lat').isFloat({ min: -90, max: 90 }),
  param('lng').isFloat({ min: -180, max: 180 }),
  query('radius').optional().isFloat({ min: 0.1, max: 100 }),
  handleValidationErrors
];

const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  handleValidationErrors
];

const validateUserId = [
  param('id').isUUID().withMessage('User ID must be a valid UUID'),
  handleValidationErrors
];

module.exports = {
  validateItem,
  validateClaim,
  validateSearch,
  validatePagination,
  validateCoordinates,
  validateId,
  validateUserId,
  handleValidationErrors
};
