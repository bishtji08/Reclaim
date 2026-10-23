const cloudinaryService = require('./cloudinaryService');
const logger = require('../utils/logger');

/**
 * Storage Service delegating directly to Cloudinary
 * with upload presets `reclaim_items` and `reclaim_proof`.
 */

async function uploadItemImage(file, userId = null, itemId = null) {
  try {
    const result = await cloudinaryService.uploadItemImage(file, itemId, userId);
    return {
      public_id: result.public_id,
      publicUrl: result.secure_url,
      secure_url: result.secure_url,
      storageType: 'cloudinary'
    };
  } catch (error) {
    logger.error('Error in storageService.uploadItemImage:', error);
    throw error;
  }
}

async function uploadClaimProof(file, claimerId, claimId = 'pending') {
  try {
    const result = await cloudinaryService.uploadClaimProof(file, claimerId, claimId);
    return {
      public_id: result.public_id,
      publicUrl: result.secure_url,
      secure_url: result.secure_url,
      storageType: 'cloudinary',
      resource_type: result.resource_type
    };
  } catch (error) {
    logger.error('Error in storageService.uploadClaimProof:', error);
    throw error;
  }
}

async function deleteImage(publicId, resourceType = 'image') {
  return cloudinaryService.deleteImage(publicId, resourceType);
}

module.exports = {
  uploadItemImage,
  uploadClaimProof,
  deleteImage,
  extractPublicId: cloudinaryService.extractPublicId,
  validateFile: cloudinaryService.validateUploadFile,
  ALLOWED_ITEM_MIMES: cloudinaryService.ALLOWED_ITEM_MIMES,
  ALLOWED_CLAIM_MIMES: cloudinaryService.ALLOWED_PROOF_MIMES,
  MAX_ITEM_FILE_SIZE: cloudinaryService.MAX_ITEM_FILE_SIZE,
  MAX_CLAIM_FILE_SIZE: cloudinaryService.MAX_PROOF_FILE_SIZE,
  cloudinary: cloudinaryService.cloudinary
};
