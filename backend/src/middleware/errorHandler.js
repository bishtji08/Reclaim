const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Handle CORS errors gracefully
  if (err.message && err.message.includes('CORS')) {
    console.warn(`[CORS Blocked] ${err.message}`);
    return res.status(403).json({
      success: false,
      message: err.message
    });
  }

  // Handle 404 and missing file errors gracefully
  if (err.code === 'ENOENT' || err.statusCode === 404) {
    return res.status(404).json({
      success: false,
      message: err.message || 'Resource not found'
    });
  }

  console.error('Error:', err);

  // Default error
  let error = { ...err };
  error.message = err.message;

  // PostgreSQL errors
  if (err.code === '23505') {
    // Duplicate key error
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  if (err.code === '23503') {
    // Foreign key constraint error
    const message = 'Referenced resource not found';
    error = { message, statusCode: 400 };
  }

  if (err.code === '23502') {
    // Not null constraint error
    const message = 'Required field is missing';
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Too many files uploaded';
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;