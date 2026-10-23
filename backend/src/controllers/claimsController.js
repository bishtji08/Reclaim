const claimsService = require('../services/claimsService');
const { successResponse, errorResponse } = require('../utils/response');

const claimsController = {
  async getClaim(req, res) {
    try {
      const { id } = req.params;
      const claim = await claimsService.getClaim(id);
      if (!claim) return errorResponse(res, 'Claim not found', 404);
      return successResponse(res, { claim });
    } catch (error) {
      return errorResponse(res, 'Failed to get claim', 500);
    }
  }
};

module.exports = claimsController;
