const pool = require('../config/database');

const itemRepository = {
  async findById(id) {
    const res = await pool.query('SELECT * FROM public.items WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  async findMatches(itemId) {
    const res = await pool.query('SELECT * FROM public.find_potential_matches($1)', [itemId]);
    return res.rows;
  }
};

module.exports = itemRepository;
