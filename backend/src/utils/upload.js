const multer = require('multer');

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

// Use memory storage for direct cloud upload to Supabase Storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type (${file.mimetype}). Only JPG, PNG, WEBP, GIF, and PDF files are permitted.`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5
  },
  fileFilter: fileFilter
});

module.exports = upload;
