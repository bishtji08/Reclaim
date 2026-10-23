const claimRepository = require('../repositories/claimRepository');

const claimsService = {
  async getClaim(id) {
    return claimRepository.findById(id);
  }
};

module.exports = claimsService;
