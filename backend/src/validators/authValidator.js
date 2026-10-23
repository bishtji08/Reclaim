const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validate');

const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isStrongPassword({ minLength: 10, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
    .withMessage('Password must be at least 10 characters with uppercase, lowercase, and a number'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 32 })
    .withMessage('Phone number must be at most 32 characters'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateResendConfirmation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];

const validateVerifyEmail = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Verification token is required'),
  handleValidationErrors
];

const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors
];

const validateResetPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isStrongPassword({ minLength: 10, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
    .withMessage('Password must be at least 10 characters with uppercase, lowercase, and a number'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateResendConfirmation,
  validateVerifyEmail,
  validateForgotPassword,
  validateResetPassword,
  handleValidationErrors
};
