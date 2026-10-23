const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const logger = require('../utils/logger');

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: env.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: env.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY,
  api_secret: env.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const ITEM_PRESET = env.cloudinaryItemPreset || process.env.CLOUDINARY_ITEM_PRESET || 'reclaim_items';
const PROOF_PRESET = env.cloudinaryProofPreset || process.env.CLOUDINARY_PROOF_PRESET || 'reclaim_proof';

const ALLOWED_ITEM_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_PROOF_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

const MAX_ITEM_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PROOF_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates file buffer or path against mime types and size limits
 */
function validateUploadFile(file, allowedMimes, maxSizeBytes) {
  if (!file) {
    throw new Error('No file provided for upload');
  }

  const mime = file.mimetype;
  if (mime && !allowedMimes.includes(mime)) {
    throw new Error(`Invalid file type (${mime}). Permitted types: ${allowedMimes.join(', ')}`);
  }

  const size = file.size || (file.buffer ? file.buffer.length : 0);
  if (size > maxSizeBytes) {
    throw new Error(`File size (${(size / (1024 * 1024)).toFixed(2)} MB) exceeds allowed limit of ${(maxSizeBytes / (1024 * 1024))} MB`);
  }
}

/**
 * Uploads a buffer or file to Cloudinary using upload_stream
 * @param {Buffer|string} source - Buffer or file path
 * @param {object} options - Cloudinary upload options
 * @returns {Promise<object>} Cloudinary upload result
 */
function uploadToCloudinary(source, options = {}) {
  return new Promise((resolve, reject) => {
    // If source is a string representing a file path
    if (typeof source === 'string') {
      cloudinary.uploader.upload(source, options, (error, result) => {
        if (error) {
          logger.error('Cloudinary file upload failed:', error);
          return reject(error);
        }
        resolve(result);
      });
      return;
    }

    // Source is a Buffer
    const buffer = Buffer.isBuffer(source) ? source : source.buffer;
    if (!buffer) {
      return reject(new Error('Invalid buffer or file path provided for Cloudinary upload'));
    }

    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        logger.error('Cloudinary stream upload failed:', error);
        return reject(error);
      }
      resolve(result);
    });

    uploadStream.end(buffer);
  });
}

/**
 * Upload an item image using the `reclaim_items` preset
 * @param {object|Buffer|string} file - Multer file object or Buffer or local path
 * @param {string|number} [itemId] - Optional item ID
 * @param {string} [userId] - Optional user ID
 * @returns {Promise<{public_id: string, secure_url: string, format: string, width: number, height: number}>}
 */
async function uploadItemImage(file, itemId = null, userId = null) {
  if (file && typeof file === 'object' && file.mimetype) {
    validateUploadFile(file, ALLOWED_ITEM_MIMES, MAX_ITEM_FILE_SIZE);
  }

  const uniqueId = `item_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const publicId = userId ? `items/user_${userId}/${uniqueId}` : `items/${uniqueId}`;

  const uploadOptions = {
    upload_preset: ITEM_PRESET,
    public_id: publicId,
    resource_type: 'image',
    tags: ['reclaim', 'item_image', itemId ? `item_${itemId}` : 'item_new']
  };

  const bufferOrPath = file.buffer || (file.path ? file.path : file);
  const result = await uploadToCloudinary(bufferOrPath, uploadOptions);

  return {
    public_id: result.public_id,
    secure_url: result.secure_url,
    url: result.secure_url,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes
  };
}

/**
 * Upload a claim proof document or image using the `reclaim_proof` preset
 * @param {object|Buffer|string} file - Multer file object or Buffer or local path
 * @param {string} claimerId - Claimer user ID
 * @param {string|number} [claimId] - Claim ID
 * @returns {Promise<{public_id: string, secure_url: string, format: string}>}
 */
async function uploadClaimProof(file, claimerId, claimId = 'pending') {
  if (file && typeof file === 'object' && file.mimetype) {
    validateUploadFile(file, ALLOWED_PROOF_MIMES, MAX_PROOF_FILE_SIZE);
  }

  const uniqueId = `proof_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const publicId = claimerId ? `proofs/claim_${claimId}/${uniqueId}` : `proofs/${uniqueId}`;

  const uploadOptions = {
    upload_preset: PROOF_PRESET,
    public_id: publicId,
    resource_type: 'auto',
    tags: ['reclaim', 'claim_proof', `claim_${claimId}`]
  };

  const bufferOrPath = file.buffer || (file.path ? file.path : file);
  const result = await uploadToCloudinary(bufferOrPath, uploadOptions);

  return {
    public_id: result.public_id,
    secure_url: result.secure_url,
    url: result.secure_url,
    format: result.format,
    bytes: result.bytes,
    resource_type: result.resource_type
  };
}

/**
 * Delete an image/file from Cloudinary by its public_id
 * @param {string} publicId - Cloudinary public ID
 * @param {string} [resourceType='image'] - 'image', 'raw', 'video', or 'auto'
 * @returns {Promise<object>} Result
 */
async function deleteImage(publicId, resourceType = 'image') {
  if (!publicId) return { result: 'not_found' };

  let targetType = resourceType === 'auto' ? 'image' : resourceType;
  const validTypes = ['image', 'raw', 'video'];
  if (!validTypes.includes(targetType)) {
    targetType = 'image';
  }

  try {
    let result = await cloudinary.uploader.destroy(publicId, {
      resource_type: targetType,
      invalidate: true
    });

    // If resource wasn't found under target type, and auto was specified, try 'raw'
    if (result.result === 'not found' && resourceType === 'auto') {
      const rawResult = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw',
        invalidate: true
      });
      if (rawResult.result === 'ok') {
        result = rawResult;
      }
    }

    logger.info(`Cloudinary asset deleted: ${publicId} (result: ${result.result})`);
    return result;
  } catch (error) {
    logger.warn(`Failed to delete Cloudinary asset ${publicId}:`, error.message);
    return { result: 'error', error: error.message };
  }
}

/**
 * Extract Cloudinary public_id from a Cloudinary URL if stored directly
 * @param {string} url - Cloudinary URL
 * @returns {string|null} public_id
 */
function extractPublicId(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('cloudinary.com')) return null;

  try {
    // URL pattern: https://res.cloudinary.com/<cloud_name>/image/upload/(v<version>/)?<public_id>.<ext>
    const matches = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
    if (matches && matches[1]) {
      return matches[1];
    }
  } catch (e) {
    logger.warn('Failed to parse public_id from Cloudinary URL:', url);
  }
  return null;
}

module.exports = {
  cloudinary,
  uploadItemImage,
  uploadClaimProof,
  deleteImage,
  extractPublicId,
  validateUploadFile,
  ITEM_PRESET,
  PROOF_PRESET,
  ALLOWED_ITEM_MIMES,
  ALLOWED_PROOF_MIMES,
  MAX_ITEM_FILE_SIZE,
  MAX_PROOF_FILE_SIZE
};
