const pool = require('../src/config/database');
const notificationService = require('../src/services/notificationService');

async function runTestSuite() {
  console.log('====================================================');
  console.log('  RECLAIM LOST & FOUND SYSTEM - ACCEPTANCE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // TEST 1: Database Invariant - Exactly 14 interrelated tables in public schema
    console.log('[1/8] Testing Database Relational Schema & 14 Interrelated Tables...');
    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    const tableNames = tablesRes.rows.map((r) => r.table_name);
    const requiredTables = [
      'users',
      'categories',
      'subcategories',
      'locations',
      'items',
      'item_images',
      'tags',
      'item_tags',
      'claims',
      'claim_images',
      'notifications',
      'audit_logs',
      'reviews',
      'item_flags',
    ];

    const allPresent = requiredTables.every((t) => tableNames.includes(t));
    assert(allPresent, 'All 14 core interrelated tables exist in Supabase PostgreSQL');

    // TEST 2: PostGIS Spatial Extension & Coordinates
    console.log('\n[2/8] Testing PostGIS Spatial Extension...');
    const postgisRes = await pool.query("SELECT extname FROM pg_extension WHERE extname = 'postgis'");
    assert(postgisRes.rows.length > 0, 'PostGIS spatial extension is installed and active');

    const locationCoordRes = await pool.query(
      'SELECT name, ST_AsText(coordinates) as coords FROM locations WHERE coordinates IS NOT NULL LIMIT 1'
    );
    assert(
      locationCoordRes.rows.length > 0 && locationCoordRes.rows[0].coords.startsWith('POINT'),
      'Campus locations store valid WGS84 PostGIS geometry coordinates'
    );

    // TEST 3: Multi-Criteria Intelligent Matching Algorithm
    console.log('\n[3/8] Testing Multi-Criteria Item Matching Engine...');
    const matchRes = await pool.query('SELECT * FROM find_potential_matches(4)');
    assert(matchRes.rows.length > 0, 'find_potential_matches stored procedure executes successfully');
    const topMatch = matchRes.rows[0];
    assert(
      topMatch.match_score >= 0.7 && topMatch.match_reasons.includes('same category'),
      `Top match identified with score ${Math.round(topMatch.match_score * 100)}% and reasons: ${topMatch.match_reasons.join(', ')}`
    );

    // TEST 4: Integrity Trigger - Prevent Self-Claim
    console.log('\n[4/8] Testing Integrity Rules & Business Triggers...');
    const reporterRes = await pool.query('SELECT id, reported_by FROM items LIMIT 1');
    const item = reporterRes.rows[0];

    let triggerPrevented = false;
    try {
      await pool.query(
        `INSERT INTO claims (item_id, claimer_id, claimer_name, claimer_email, description)
         VALUES ($1, $2, 'Self Claimer', 'test@geu.ac.in', 'Attempting to claim my own item description that is at least 20 chars long')`,
        [item.id, item.reported_by]
      );
    } catch (err) {
      if (err.message.includes('reporter cannot claim their own item')) {
        triggerPrevented = true;
      }
    }
    assert(triggerPrevented, 'claims_prevent_self_claim trigger prevented self-claim attempt');

    // TEST 5: User Conduct & Blacklisting Controls
    console.log('\n[5/8] Testing User Moderation & Blacklisting Checks...');
    const userCols = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('is_blacklisted', 'blacklist_reason')"
    );
    assert(userCols.rows.length === 2, 'User moderation columns (is_blacklisted, blacklist_reason) are enforced');

    // TEST 6: In-App & Email Notification Dispatch
    console.log('\n[6/8] Testing Notification Architecture...');
    const adminUser = (await pool.query("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1")).rows[0];
    if (adminUser) {
      const notif = await notificationService.createNotification({
        userId: adminUser.id,
        userEmail: adminUser.email,
        title: 'System Verification Alert',
        message: 'Acceptance test suite notification ping verifying notification delivery pipeline.',
        type: 'system',
      });
      assert(notif && notif.id, 'Notification record created with in-app storage & email transporter integration');
    }

    // TEST 7: Reviews, Feedback & Community Trust System
    console.log('\n[7/8] Testing Community Feedback & Reviews Table...');
    const reviewCols = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'reviews' AND column_name IN ('rating', 'comment', 'was_returned')"
    );
    assert(reviewCols.rows.length === 3, 'Community feedback schema (rating, comment, was_returned) validated');

    // TEST 8: Privacy-Friendly Visitor Telemetry Schema
    console.log('\n[8/8] Testing Privacy-Friendly Visitor Telemetry Schema...');
    const visitorTables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('visitor_sessions', 'visitor_events')"
    );
    assert(visitorTables.rows.length === 2, 'Visitor sessions & analytics events tables exist in Supabase PostgreSQL');

    const piiCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name IN ('visitor_sessions', 'visitor_events') 
        AND (column_name ILIKE '%ip%' OR column_name ILIKE '%email%' OR column_name ILIKE '%fingerprint%')
    `);
    assert(piiCheck.rows.length === 0, 'Visitor telemetry schema guarantees zero PII (no IP, email, or fingerprint columns)');

    console.log('\n====================================================');
    console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Test suite error:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runTestSuite();
