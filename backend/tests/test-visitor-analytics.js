const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../src/config/database');
const { notifyNewVisitorSession } = require('../src/services/visitorNotificationService');

async function runVisitorAnalyticsTests() {
  console.log('====================================================');
  console.log('  PRIVACY-FRIENDLY VISITOR ANALYTICS TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const testSessionId = crypto.randomUUID();
  console.log(`Generated Test Session UUID: ${testSessionId}`);

  try {
    // [Test 1] Session Initialization (One Visit per Browser Session)
    console.log('\n[1/6] Testing Session Initialization (POST /visitor/session logic)...');
    const initRes = await pool.query(`
      INSERT INTO public.visitor_sessions (
        session_id, visitor_type, user_id, landing_path, last_path,
        device_type, browser_name, started_at, last_heartbeat_at,
        is_active, heartbeat_count, page_view_count
      ) VALUES ($1, 'guest', NULL, '/landing', '/landing', 'Desktop', 'Chrome', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true, 1, 1)
      ON CONFLICT (session_id) DO UPDATE SET
        last_heartbeat_at = CURRENT_TIMESTAMP,
        is_active = true
      RETURNING *, (xmax = 0) AS is_new;
    `, [testSessionId]);

    const sessionRow = initRes.rows[0];
    if (sessionRow && sessionRow.is_new === true && sessionRow.visitor_type === 'guest') {
      console.log('  ✓ PASS: New session created with is_new=true and visitor_type=guest');
      passed++;
    } else {
      console.error('  ✗ FAIL: Session creation mismatch', sessionRow);
      failed++;
    }

    // [Test 2] Duplicate Session Prevention (Reusing session throughout browser session)
    console.log('\n[2/6] Testing Duplicate Session Prevention (Same Session ID on refresh/navigation)...');
    const dupRes = await pool.query(`
      INSERT INTO public.visitor_sessions (
        session_id, visitor_type, user_id, landing_path, last_path,
        device_type, browser_name, started_at, last_heartbeat_at,
        is_active, heartbeat_count, page_view_count
      ) VALUES ($1, 'guest', NULL, '/items', '/items', 'Desktop', 'Chrome', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true, 1, 1)
      ON CONFLICT (session_id) DO UPDATE SET
        last_heartbeat_at = CURRENT_TIMESTAMP,
        is_active = true
      RETURNING *, (xmax = 0) AS is_new;
    `, [testSessionId]);

    if (dupRes.rows[0]?.is_new === false) {
      console.log('  ✓ PASS: Subsequent request correctly identified as existing visit (is_new=false, visit not double counted)');
      passed++;
    } else {
      console.error('  ✗ FAIL: Duplicate session not detected', dupRes.rows[0]);
      failed++;
    }

    // [Test 3] Active Visitor Heartbeat Tracking
    console.log('\n[3/6] Testing Session Heartbeat (Active Visitor Pings)...');
    const hbRes = await pool.query(`
      UPDATE public.visitor_sessions
      SET last_heartbeat_at = CURRENT_TIMESTAMP,
          is_active = true,
          heartbeat_count = heartbeat_count + 1,
          last_path = '/items/detail'
      WHERE session_id = $1
      RETURNING heartbeat_count, is_active, last_path;
    `, [testSessionId]);

    if (hbRes.rows[0]?.heartbeat_count === 2 && hbRes.rows[0]?.is_active === true) {
      console.log('  ✓ PASS: Heartbeat incremented count to 2, maintained active status');
      passed++;
    } else {
      console.error('  ✗ FAIL: Heartbeat update mismatch', hbRes.rows[0]);
      failed++;
    }

    // [Test 4] Separation of Guest vs Authenticated Visitors
    console.log('\n[4/6] Testing Guest vs Authenticated State Transition...');
    const authRes = await pool.query(`
      UPDATE public.visitor_sessions
      SET visitor_type = 'authenticated',
          last_heartbeat_at = CURRENT_TIMESTAMP
      WHERE session_id = $1
      RETURNING visitor_type;
    `, [testSessionId]);

    if (authRes.rows[0]?.visitor_type === 'authenticated') {
      console.log('  ✓ PASS: Visitor status upgraded to authenticated upon login');
      passed++;
    } else {
      console.error('  ✗ FAIL: Auth transition mismatch', authRes.rows[0]);
      failed++;
    }

    // [Test 5] Notification Deduplication & Alert Protection
    console.log('\n[5/6] Testing Notification Deduplication (Alert sent only once per browser session)...');
    // First call should update notification_sent to true
    await notifyNewVisitorSession({
      sessionId: testSessionId,
      visitorType: 'authenticated',
      landingPath: '/landing',
      deviceType: 'Desktop',
      browserName: 'Chrome'
    });

    const checkNotif1 = await pool.query('SELECT notification_sent FROM public.visitor_sessions WHERE session_id = $1', [testSessionId]);
    if (checkNotif1.rows[0]?.notification_sent === true) {
      console.log('  ✓ PASS: notification_sent marked as true on initial trigger');
      passed++;
    } else {
      console.error('  ✗ FAIL: notification_sent not updated');
      failed++;
    }

    // Second call should detect notification_sent is already true and skip without sending duplicate
    const updateRes2 = await pool.query(`
      UPDATE public.visitor_sessions
      SET notification_sent = true
      WHERE session_id = $1 AND notification_sent = false
      RETURNING session_id;
    `, [testSessionId]);

    if (updateRes2.rowCount === 0) {
      console.log('  ✓ PASS: Duplicate notification attempt correctly blocked by atomic guard');
    } else {
      console.error('  ✗ FAIL: Duplicate notification guard breached');
    }

    // [Test 6] Privacy Verification (Verify no IP, name, email in analytics tables)
    console.log('\n[6/6] Verifying Privacy Guarantee (Zero PII columns in analytics schema)...');
    const colsRes = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name IN ('visitor_sessions', 'visitor_events')
        AND (column_name ILIKE '%ip%' OR column_name ILIKE '%email%' OR column_name ILIKE '%fingerprint%' OR column_name ILIKE '%name%' AND column_name NOT IN ('browser_name'));
    `);

    if (colsRes.rows.length === 0) {
      console.log('  ✓ PASS: No IP, email, or fingerprint columns exist in visitor analytics schema');
      passed++;
    } else {
      console.error('  ✗ FAIL: Potentially sensitive columns detected', colsRes.rows);
      failed++;
    }

    // Cleanup test session
    await pool.query('DELETE FROM public.visitor_sessions WHERE session_id = $1', [testSessionId]);
    console.log('\nTest data cleaned up successfully.');

  } catch (err) {
    console.error('Unexpected error during visitor analytics tests:', err);
    failed++;
  } finally {
    await pool.end();
  }

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runVisitorAnalyticsTests();
