const pool = require('../config/database');

const claimRepository = {
  async findById(id) {
    const res = await pool.query('SELECT * FROM public.claims WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
};

module.exports = claimRepository;
