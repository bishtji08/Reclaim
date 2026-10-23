const pool = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const analyticsController = {
  async getDashboard(req, res) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE type = 'lost') as total_lost_items,
          COUNT(*) FILTER (WHERE type = 'found') as total_found_items,
          COUNT(*) FILTER (WHERE status = 'matched') as matched_items,
          COUNT(*) FILTER (WHERE status = 'returned') as returned_items,
          COUNT(*) FILTER (WHERE status = 'claimed') as claimed_items,
          COUNT(*) FILTER (WHERE is_urgent = true) as urgent_items
        FROM items
      `;

      const userStatsQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
          COUNT(*) FILTER (WHERE role = 'finder') as finder_users,
          COUNT(*) FILTER (WHERE role = 'user') as regular_users,
          COUNT(*) FILTER (WHERE is_active = true) as active_users
        FROM users
      `;

      const [statsResult, userStatsResult] = await Promise.all([
        pool.query(statsQuery),
        pool.query(userStatsQuery)
      ]);

      return successResponse(res, {
        analytics: {
          ...statsResult.rows[0],
          ...userStatsResult.rows[0]
        }
      });
    } catch (error) {
      return errorResponse(res, 'Failed to fetch analytics', 500);
    }
  }
};

module.exports = analyticsController;
