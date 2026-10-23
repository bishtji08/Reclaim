const pool = require('../config/database');
const itemsService = require('../services/itemsService');
const { successResponse, errorResponse } = require('../utils/response');

const itemsController = {
  async getMatches(req, res) {
    try {
      const { id } = req.params;
      const matches = await itemsService.getMatches(id);
      return successResponse(res, { matches });
    } catch (error) {
      return errorResponse(res, 'Failed to get matches', 500);
    }
  }
};

module.exports = itemsController;
