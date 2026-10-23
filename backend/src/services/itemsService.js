const pool = require('../config/database');
const itemRepository = require('../repositories/itemRepository');

const itemsService = {
  async getMatches(itemId) {
    return itemRepository.findMatches(itemId);
  }
};

module.exports = itemsService;
