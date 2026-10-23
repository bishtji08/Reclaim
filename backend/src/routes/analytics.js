const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/database');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');
const { notifyNewVisitorSession, parseCoarseDevice } = require('../services/visitorNotificationService');

const router = express.Router();

// Strict UUID format validation for privacy-friendly session IDs
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Rate limiter for visitor tracking pings (max 120 requests/min per IP)
const visitorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many analytics pings, please slow down.' }
});

// Get dashboard analytics (admin only)
router.get('/dashboard', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Get basic statistics
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE type = 'lost') as total_lost_items,
        COUNT(*) FILTER (WHERE type = 'found') as total_found_items,
        COUNT(*) FILTER (WHERE status = 'matched') as matched_items,
        COUNT(*) FILTER (WHERE status = 'returned') as returned_items,
        COUNT(*) FILTER (WHERE status = 'claimed') as claimed_items,
        COUNT(*) FILTER (WHERE is_urgent = true) as urgent_items,
        COUNT(*) FILTER (WHERE is_suspicious = true) as suspicious_items
      FROM items
    `;

    // Get user statistics
    const userStatsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
        COUNT(*) FILTER (WHERE role = 'finder') as finder_users,
        COUNT(*) FILTER (WHERE role = 'user') as regular_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE is_blacklisted = true) as blacklisted_users
      FROM users
    `;

    // Get top categories
    const topCategoriesQuery = `
      SELECT 
        c.name as category,
        COUNT(i.id) as count
      FROM categories c
      LEFT JOIN items i ON c.id = i.category_id
      GROUP BY c.id, c.name
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get top locations
    const topLocationsQuery = `
      SELECT 
        l.name as location,
        COUNT(i.id) as count
      FROM locations l
      LEFT JOIN items i ON l.id = i.location_id
      GROUP BY l.id, l.name
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get monthly statistics for the last 12 months
    const monthlyStatsQuery = `
      SELECT 
        DATE_TRUNC('month', reported_at) as month,
        COUNT(*) FILTER (WHERE type = 'lost') as lost,
        COUNT(*) FILTER (WHERE type = 'found') as found,
        COUNT(*) FILTER (WHERE status = 'returned') as returned
      FROM items
      WHERE reported_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', reported_at)
      ORDER BY month
    `;

    // Get resolution rate
    const resolutionRateQuery = `
      SELECT 
        ROUND(
          (COUNT(*) FILTER (WHERE status IN ('returned', 'claimed'))::DECIMAL / 
           NULLIF(COUNT(*), 0)) * 100, 2
        ) as resolution_rate
      FROM items
      WHERE reported_at >= CURRENT_DATE - INTERVAL '30 days'
    `;

    const moderationStatsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM item_flags WHERE status = 'pending') as pending_flags,
        (SELECT COUNT(*) FROM reviews) as total_feedback,
        (SELECT ROUND(AVG(rating), 1) FROM reviews) as avg_rating
    `;

    const visitorStatsQuery = `
      SELECT 
        COUNT(*)::int as total_visitor_sessions,
        COUNT(*) FILTER (WHERE is_active = true AND last_heartbeat_at >= CURRENT_TIMESTAMP - INTERVAL '5 minutes')::int as live_active_visitors,
        COUNT(*) FILTER (WHERE visitor_type = 'guest')::int as guest_visitors,
        COUNT(*) FILTER (WHERE visitor_type = 'authenticated')::int as authenticated_visitors
      FROM public.visitor_sessions
    `;

    const [
      statsResult,
      userStatsResult,
      topCategoriesResult,
      topLocationsResult,
      monthlyStatsResult,
      resolutionRateResult,
      moderationStatsResult,
      visitorStatsResult
    ] = await Promise.all([
      pool.query(statsQuery),
      pool.query(userStatsQuery),
      pool.query(topCategoriesQuery),
      pool.query(topLocationsQuery),
      pool.query(monthlyStatsQuery),
      pool.query(resolutionRateQuery),
      pool.query(moderationStatsQuery),
      pool.query(visitorStatsQuery)
    ]);

    const analytics = {
      ...statsResult.rows[0],
      ...userStatsResult.rows[0],
      ...moderationStatsResult.rows[0],
      ...visitorStatsResult.rows[0],
      top_categories: topCategoriesResult.rows,
      top_locations: topLocationsResult.rows,
      monthly_stats: monthlyStatsResult.rows,
      resolution_rate: resolutionRateResult.rows[0]?.resolution_rate || 0
    };

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
});

// Get detailed reports (admin only)
router.get('/reports', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      type,
      category_id,
      location_id,
      status
    } = req.query;

    let whereConditions = ['1=1'];
    let queryParams = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      whereConditions.push(`i.reported_at >= $${paramCount}`);
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereConditions.push(`i.reported_at <= $${paramCount}`);
      queryParams.push(end_date);
    }

    if (type) {
      paramCount++;
      whereConditions.push(`i.type = $${paramCount}`);
      queryParams.push(type);
    }

    if (category_id) {
      paramCount++;
      whereConditions.push(`i.category_id = $${paramCount}`);
      queryParams.push(category_id);
    }

    if (location_id) {
      paramCount++;
      whereConditions.push(`i.location_id = $${paramCount}`);
      queryParams.push(location_id);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`i.status = $${paramCount}`);
      queryParams.push(status);
    }

    const whereClause = whereConditions.join(' AND ');

    const reportQuery = `
      SELECT 
        i.id,
        i.title,
        i.description,
        i.type,
        i.status,
        i.reported_at,
        i.is_urgent,
        c.name as category_name,
        sc.name as subcategory_name,
        l.name as location_name,
        u.name as reported_by_name,
        u.email as reported_by_email,
        CASE 
          WHEN i.claimed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (i.claimed_at - i.reported_at)) / 86400
          WHEN i.returned_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (i.returned_at - i.reported_at)) / 86400
          ELSE NULL
        END as resolution_days
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN subcategories sc ON i.subcategory_id = sc.id
      LEFT JOIN locations l ON i.location_id = l.id
      LEFT JOIN users u ON i.reported_by = u.id
      WHERE ${whereClause}
      ORDER BY i.reported_at DESC
    `;

    const result = await pool.query(reportQuery, queryParams);

    // Calculate summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE type = 'lost') as lost_items,
        COUNT(*) FILTER (WHERE type = 'found') as found_items,
        COUNT(*) FILTER (WHERE status = 'returned') as returned_items,
        COUNT(*) FILTER (WHERE status = 'claimed') as claimed_items,
        COUNT(*) FILTER (WHERE status = 'matched') as matched_items,
        COUNT(*) FILTER (WHERE is_urgent = true) as urgent_items,
        AVG(
          CASE 
            WHEN claimed_at IS NOT NULL THEN 
              EXTRACT(EPOCH FROM (claimed_at - reported_at)) / 86400
            WHEN returned_at IS NOT NULL THEN 
              EXTRACT(EPOCH FROM (returned_at - reported_at)) / 86400
            ELSE NULL
          END
        ) as avg_resolution_days
      FROM items i
      WHERE ${whereClause}
    `;

    const summaryResult = await pool.query(summaryQuery, queryParams);

    res.json({
      success: true,
      data: {
        items: result.rows,
        summary: summaryResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Reports fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports'
    });
  }
});

// Get item trends (admin only)
router.get('/trends', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { period = 'month' } = req.query; // day, week, month, year

    let dateFormat;
    let interval;

    switch (period) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        interval = '30 days';
        break;
      case 'week':
        dateFormat = 'YYYY-"W"WW';
        interval = '12 weeks';
        break;
      case 'year':
        dateFormat = 'YYYY';
        interval = '5 years';
        break;
      default: // month
        dateFormat = 'YYYY-MM';
        interval = '12 months';
    }

    const trendsQuery = `
      SELECT 
        TO_CHAR(reported_at, '${dateFormat}') as period,
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE type = 'lost') as lost_items,
        COUNT(*) FILTER (WHERE type = 'found') as found_items,
        COUNT(*) FILTER (WHERE status = 'returned') as returned_items,
        COUNT(*) FILTER (WHERE status = 'claimed') as claimed_items
      FROM items
      WHERE reported_at >= CURRENT_DATE - INTERVAL '${interval}'
      GROUP BY TO_CHAR(reported_at, '${dateFormat}')
      ORDER BY period
    `;

    const result = await pool.query(trendsQuery);

    res.json({
      success: true,
      data: {
        trends: result.rows,
        period: period
      }
    });
  } catch (error) {
    console.error('Trends fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trends'
    });
  }
});

// =========================================================================
// VISITOR ANALYTICS & PRIVACY-FRIENDLY TELEMETRY
// =========================================================================

// Get comprehensive visitor analytics telemetry (admin only)
router.get('/visitors', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // 1. Mark stale sessions inactive before compiling metrics (5-min heartbeat timeout)
    await pool.query('SELECT public.mark_inactive_visitor_sessions(5)').catch((err) => {
      console.warn('Failed to mark inactive sessions:', err.message);
    });

    // 2. Summary KPI Metrics
    const summaryQuery = `
      SELECT
        COUNT(*)::int as total_visits,
        COUNT(*) FILTER (WHERE is_active = true AND last_heartbeat_at >= CURRENT_TIMESTAMP - INTERVAL '5 minutes')::int as live_active_visitors,
        COUNT(*) FILTER (WHERE visitor_type = 'guest')::int as guest_visits,
        COUNT(*) FILTER (WHERE visitor_type = 'authenticated')::int as authenticated_visits,
        COUNT(*) FILTER (WHERE started_at >= CURRENT_DATE)::int as today_visits,
        COUNT(*) FILTER (WHERE started_at >= CURRENT_DATE - INTERVAL '7 days')::int as week_visits,
        ROUND(COALESCE(AVG(page_view_count), 1), 1)::numeric as avg_pages_per_session,
        ROUND(COALESCE(AVG(heartbeat_count), 1), 1)::numeric as avg_heartbeats_per_session
      FROM public.visitor_sessions;
    `;

    // 3. Daily trends (past 14 days)
    const dailyTrendsQuery = `
      SELECT
        TO_CHAR(d.day, 'YYYY-MM-DD') as date,
        TO_CHAR(d.day, 'Dy, Mon DD') as formatted_date,
        COALESCE(COUNT(s.session_id), 0)::int as total_visits,
        COALESCE(COUNT(s.session_id) FILTER (WHERE s.visitor_type = 'guest'), 0)::int as guest_visits,
        COALESCE(COUNT(s.session_id) FILTER (WHERE s.visitor_type = 'authenticated'), 0)::int as authenticated_visits
      FROM generate_series(
        CURRENT_DATE - INTERVAL '13 days',
        CURRENT_DATE,
        '1 day'::interval
      ) d(day)
      LEFT JOIN public.visitor_sessions s ON DATE_TRUNC('day', s.started_at) = d.day
      GROUP BY d.day
      ORDER BY d.day ASC;
    `;

    // 4. Weekly trends (past 8 weeks)
    const weeklyTrendsQuery = `
      SELECT
        TO_CHAR(d.week, 'YYYY-"W"WW') as week_label,
        TO_CHAR(d.week, 'Mon DD') as week_start,
        COALESCE(COUNT(s.session_id), 0)::int as total_visits,
        COALESCE(COUNT(s.session_id) FILTER (WHERE s.visitor_type = 'guest'), 0)::int as guest_visits,
        COALESCE(COUNT(s.session_id) FILTER (WHERE s.visitor_type = 'authenticated'), 0)::int as authenticated_visits
      FROM generate_series(
        DATE_TRUNC('week', CURRENT_DATE - INTERVAL '7 weeks'),
        DATE_TRUNC('week', CURRENT_DATE),
        '1 week'::interval
      ) d(week)
      LEFT JOIN public.visitor_sessions s ON DATE_TRUNC('week', s.started_at) = d.week
      GROUP BY d.week
      ORDER BY d.week ASC;
    `;

    // 5. Recent session activity (Privacy-friendly: masked session id, no IP, no names/emails)
    const recentSessionsQuery = `
      SELECT
        session_id,
        visitor_type,
        landing_path,
        last_path,
        device_type,
        browser_name,
        started_at,
        last_heartbeat_at,
        page_view_count,
        heartbeat_count,
        (is_active = true AND last_heartbeat_at >= CURRENT_TIMESTAMP - INTERVAL '5 minutes') as is_active,
        ROUND(EXTRACT(EPOCH FROM (last_heartbeat_at - started_at)))::int as duration_seconds
      FROM public.visitor_sessions
      ORDER BY last_heartbeat_at DESC
      LIMIT 25;
    `;

    // 6. Device breakdown
    const devicesQuery = `
      SELECT
        device_type,
        COUNT(*)::int as count
      FROM public.visitor_sessions
      GROUP BY device_type
      ORDER BY count DESC;
    `;

    const [summaryRes, dailyRes, weeklyRes, recentRes, devicesRes] = await Promise.all([
      pool.query(summaryQuery),
      pool.query(dailyTrendsQuery),
      pool.query(weeklyTrendsQuery),
      pool.query(recentSessionsQuery),
      pool.query(devicesQuery),
    ]);

    // Mask session IDs before returning to ensure privacy compliance
    const maskedSessions = recentRes.rows.map(s => ({
      ...s,
      session_id_masked: `sess_${s.session_id.substring(0, 8)}***`,
    }));

    res.json({
      success: true,
      data: {
        summary: summaryRes.rows[0],
        daily_trends: dailyRes.rows,
        weekly_trends: weeklyRes.rows,
        recent_sessions: maskedSessions,
        devices: devicesRes.rows,
      }
    });
  } catch (error) {
    console.error('Visitor analytics fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visitor telemetry'
    });
  }
});

// POST /api/analytics/visitor/session
// Initializes or syncs a browser session (One visit per browser session)
router.post('/visitor/session', visitorLimiter, optionalAuth, async (req, res) => {
  try {
    const { sessionId, landingPath } = req.body;
    if (!sessionId || !uuidRegex.test(sessionId)) {
      return res.status(400).json({ success: false, message: 'Valid UUID session identifier required' });
    }

    const cleanPath = typeof landingPath === 'string' && landingPath.trim() 
      ? landingPath.trim().slice(0, 100) 
      : '/';

    const { deviceType, browserName } = parseCoarseDevice(req.headers['user-agent']);
    const isAuth = !!req.user;
    const visitorType = isAuth ? 'authenticated' : 'guest';
    const userId = isAuth ? req.user.id : null;

    // Insert or update on conflict (reusing session throughout the browser session)
    const result = await pool.query(`
      INSERT INTO public.visitor_sessions (
        session_id, visitor_type, user_id, landing_path, last_path,
        device_type, browser_name, started_at, last_heartbeat_at,
        is_active, heartbeat_count, page_view_count
      ) VALUES ($1, $2, $3, $4, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true, 1, 1)
      ON CONFLICT (session_id) DO UPDATE SET
        last_heartbeat_at = CURRENT_TIMESTAMP,
        is_active = true,
        visitor_type = CASE WHEN $2 = 'authenticated' THEN 'authenticated' ELSE visitor_sessions.visitor_type END,
        user_id = COALESCE($3, visitor_sessions.user_id)
      RETURNING *, (xmax = 0) AS is_new;
    `, [sessionId, visitorType, userId, cleanPath, deviceType, browserName]);

    const session = result.rows[0];
    const isNew = session.is_new;

    if (isNew) {
      // Record initial session_start event
      await pool.query(`
        INSERT INTO public.visitor_events (session_id, event_type, path, visitor_type)
        VALUES ($1, 'session_start', $2, $3)
      `, [sessionId, cleanPath, visitorType]);

      // Fire owner notification asynchronously (deduplicated)
      notifyNewVisitorSession({
        sessionId,
        visitorType,
        landingPath: cleanPath,
        deviceType,
        browserName,
        startedAt: session.started_at
      }).catch(err => console.warn('Visitor notification error:', err.message));
    }

    res.json({
      success: true,
      data: {
        sessionId,
        isNew,
        visitorType: session.visitor_type,
        recordedAt: session.started_at
      }
    });
  } catch (error) {
    console.error('Visitor session recording error:', error);
    res.status(500).json({ success: false, message: 'Failed to record visitor session' });
  }
});

// POST /api/analytics/visitor/heartbeat
// Periodic heartbeat ping to maintain live active status
router.post('/visitor/heartbeat', visitorLimiter, optionalAuth, async (req, res) => {
  try {
    const { sessionId, currentPath } = req.body;
    if (!sessionId || !uuidRegex.test(sessionId)) {
      return res.status(400).json({ success: false, message: 'Valid UUID session identifier required' });
    }

    const cleanPath = typeof currentPath === 'string' && currentPath.trim() 
      ? currentPath.trim().slice(0, 100) 
      : null;

    const isAuth = !!req.user;
    const userId = isAuth ? req.user.id : null;

    const updateRes = await pool.query(`
      UPDATE public.visitor_sessions
      SET last_heartbeat_at = CURRENT_TIMESTAMP,
          is_active = true,
          heartbeat_count = heartbeat_count + 1,
          last_path = COALESCE($2, last_path),
          visitor_type = CASE WHEN $3 = true THEN 'authenticated' ELSE visitor_type END,
          user_id = COALESCE($4, user_id)
      WHERE session_id = $1
      RETURNING session_id;
    `, [sessionId, cleanPath, isAuth, userId]);

    if (updateRes.rowCount === 0) {
      return res.json({ success: true, expired: true });
    }

    res.json({ success: true, active: true });
  } catch (error) {
    console.error('Visitor heartbeat error:', error);
    res.status(500).json({ success: false, message: 'Failed to process heartbeat' });
  }
});

// POST /api/analytics/visitor/pageview
// Record internal route change within the same browser session
router.post('/visitor/pageview', visitorLimiter, optionalAuth, async (req, res) => {
  try {
    const { sessionId, path } = req.body;
    if (!sessionId || !uuidRegex.test(sessionId)) {
      return res.status(400).json({ success: false, message: 'Valid UUID session identifier required' });
    }

    const cleanPath = typeof path === 'string' && path.trim() 
      ? path.trim().slice(0, 100) 
      : '/';

    const isAuth = !!req.user;
    const visitorType = isAuth ? 'authenticated' : 'guest';
    const userId = isAuth ? req.user.id : null;

    const updateRes = await pool.query(`
      UPDATE public.visitor_sessions
      SET last_heartbeat_at = CURRENT_TIMESTAMP,
          page_view_count = page_view_count + 1,
          last_path = $2,
          is_active = true,
          visitor_type = CASE WHEN $3 = 'authenticated' THEN 'authenticated' ELSE visitor_type END,
          user_id = COALESCE($4, user_id)
      WHERE session_id = $1
      RETURNING session_id;
    `, [sessionId, cleanPath, visitorType, userId]);

    if (updateRes.rowCount > 0) {
      await pool.query(`
        INSERT INTO public.visitor_events (session_id, event_type, path, visitor_type)
        VALUES ($1, 'page_view', $2, $3)
      `, [sessionId, cleanPath, visitorType]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Visitor pageview error:', error);
    res.status(500).json({ success: false, message: 'Failed to record pageview' });
  }
});

// POST /api/analytics/visitor/auth
// Update session when a visitor logs in
router.post('/visitor/auth', visitorLimiter, authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId || !uuidRegex.test(sessionId)) {
      return res.status(400).json({ success: false, message: 'Valid UUID session identifier required' });
    }

    await pool.query(`
      UPDATE public.visitor_sessions
      SET visitor_type = 'authenticated',
          user_id = $2,
          last_heartbeat_at = CURRENT_TIMESTAMP,
          is_active = true
      WHERE session_id = $1;
    `, [sessionId, req.user.id]);

    await pool.query(`
      INSERT INTO public.visitor_events (session_id, event_type, path, visitor_type)
      VALUES ($1, 'auth_change', '/', 'authenticated');
    `, [sessionId]);

    res.json({ success: true, visitorType: 'authenticated' });
  } catch (error) {
    console.error('Visitor auth update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update visitor auth' });
  }
});

module.exports = router;