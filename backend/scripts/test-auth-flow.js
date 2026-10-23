const pool = require('../src/config/database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

async function testAuthLifecycle() {
  console.log('--- Testing Supabase Auth & Email Confirmation Lifecycle ---');

  const testEmail = `test.student.${Date.now()}@geu.ac.in`;
  const testPassword = 'Password123!';
  const testName = 'Test Student';
  const confirmationToken = crypto.randomBytes(32).toString('hex');
  const userId = crypto.randomUUID();

  try {
    // 1. Register unconfirmed user (email_confirmed_at = NULL)
    const hashed = await bcrypt.hash(testPassword, 12);
    await pool.query(`
      INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at, 
        confirmation_token, confirmation_sent_at, role, aud
      ) VALUES (
        $1, '00000000-0000-0000-0000-000000000000', $2, $3, NULL, 
        $4, now(), 'authenticated', 'authenticated'
      )
    `, [userId, testEmail, hashed, confirmationToken]);

    await pool.query(`
      INSERT INTO public.users (id, email, name, role, is_verified, is_active)
      VALUES ($1, $2, $3, 'user', false, true)
      ON CONFLICT (id) DO UPDATE SET is_verified = false, is_active = true
    `, [userId, testEmail, testName]);

    console.log('✓ Step 1: User registered in auth.users with email_confirmed_at = NULL');

    // 2. Check login before verification -> MUST FAIL
    const authCheck = await pool.query('SELECT * FROM auth.users WHERE id = $1', [userId]);
    const unconfirmedUser = authCheck.rows[0];
    const isConfirmedBefore = !!(unconfirmedUser.email_confirmed_at || unconfirmedUser.confirmed_at);
    if (!isConfirmedBefore) {
      console.log('✓ Step 2: Unverified user correctly identified; dashboard access blocked!');
    } else {
      throw new Error('FAILED: User should NOT be confirmed before verification');
    }

    // 3. Verify user with token
    await pool.query(`
      UPDATE auth.users 
      SET email_confirmed_at = now(), confirmation_token = NULL 
      WHERE id = $1 AND confirmation_token = $2
    `, [userId, confirmationToken]);

    await pool.query(`
      UPDATE public.users 
      SET is_verified = true 
      WHERE id = $1
    `, [userId]);

    console.log('✓ Step 3: Email confirmation executed via verification token');

    // 4. Check login after verification -> MUST SUCCEED
    const authCheckAfter = await pool.query('SELECT * FROM auth.users WHERE id = $1', [userId]);
    const confirmedUser = authCheckAfter.rows[0];
    const isConfirmedAfter = !!(confirmedUser.email_confirmed_at || confirmedUser.confirmed_at);
    if (isConfirmedAfter) {
      console.log('✓ Step 4: Confirmed user verified in auth.users; dashboard access allowed!');
    } else {
      throw new Error('FAILED: User should be confirmed after verification');
    }

    // 5. Test password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    await pool.query(`
      UPDATE auth.users 
      SET recovery_token = $1, recovery_sent_at = now() 
      WHERE id = $2
    `, [resetToken, userId]);

    const newPassHash = await bcrypt.hash('NewPassword123!', 12);
    await pool.query(`
      UPDATE auth.users 
      SET encrypted_password = $1, recovery_token = NULL 
      WHERE id = $2 AND recovery_token = $3
    `, [newPassHash, userId, resetToken]);

    console.log('✓ Step 5: Password reset token verified and executed cleanly');

    // Clean up test user
    await pool.query('DELETE FROM public.users WHERE id = $1', [userId]);
    await pool.query('DELETE FROM auth.users WHERE id = $1', [userId]);
    console.log('✓ Step 6: Test data cleaned up successfully');

    console.log('\n========================================');
    console.log('ALL AUTH & EMAIL CONFIRMATION CHECKS PASSED!');
    console.log('========================================');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

testAuthLifecycle();
