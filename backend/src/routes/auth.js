const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const pool = require('../config/database');
const { 
  validateRegister, 
  validateLogin, 
  validateResendConfirmation, 
  validateVerifyEmail,
  validateForgotPassword,
  validateResetPassword
} = require('../validators/authValidator');
const { authenticateToken } = require('../middleware/auth');
const { clearSessionCookie, createAccessToken, setSessionCookie } = require('../utils/session');
const notificationService = require('../services/notificationService');
const env = require('../config/env');

const router = express.Router();

// Rate limiter for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || (process.env.NODE_ENV === 'development' ? 100 : 15)),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in a few minutes.'
  }
});

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.PASSWORD_CHANGE_RATE_LIMIT_MAX || 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password change attempts. Please try again later.'
  }
});

// 1. REGISTER - Respects Supabase email confirmation: creates unconfirmed user, dispatches verification email
router.post('/register', authLimiter, validateRegister, async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, name, phone } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists in auth.users
    const existingUser = await client.query(
      'SELECT id, email_confirmed_at, confirmed_at FROM auth.users WHERE lower(email) = lower($1)',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      const isConfirmed = !!(existingUser.rows[0].email_confirmed_at || existingUser.rows[0].confirmed_at);
      return res.status(400).json({
        success: false,
        requiresVerification: !isConfirmed,
        message: isConfirmed 
          ? 'An account with this email address already exists. Please sign in.' 
          : 'An account with this email exists but is pending email confirmation. Please check your inbox or request a new confirmation link.'
      });
    }

    // Generate secure confirmation token
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const userId = crypto.randomUUID();

    await client.query('BEGIN');

    // Create user in auth.users with email_confirmed_at = NULL (respects email confirmation)
    await client.query(
      `INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_token,
        confirmation_sent_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        role,
        aud,
        is_super_admin
      )
      VALUES (
        $1::uuid,
        '00000000-0000-0000-0000-000000000000',
        $2::text,
        $3::text,
        NULL,
        $4::text,
        now(),
        '{"provider":"email","providers":["email"],"role":"user"}'::jsonb,
        $5::jsonb,
        now(),
        now(),
        'authenticated',
        'authenticated',
        false
      )`,
      [
        userId,
        normalizedEmail,
        hashedPassword,
        confirmationToken,
        JSON.stringify({ name: name.trim(), phone: phone?.trim() || null })
      ]
    );

    // Create profile in public.users with is_verified = false
    const profileResult = await client.query(
      `INSERT INTO public.users (id, email, name, role, phone, is_verified, is_active)
       VALUES ($1::uuid, $2::text, $3::text, 'user', $4::text, false, true)
       ON CONFLICT (id) DO UPDATE SET
         name = excluded.name,
         phone = excluded.phone,
         updated_at = now()
       RETURNING id, email, name, role, is_verified, is_active, auth_version, created_at`,
      [userId, normalizedEmail, name.trim(), phone?.trim() || null]
    );

    const user = profileResult.rows[0];

    // Log registration in audit trail
    await client.query(
      `INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
       VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::jsonb, $6::inet)`,
      [
        user.id,
        'REGISTER_PENDING_CONFIRMATION',
        'users',
        user.id,
        JSON.stringify({ email: normalizedEmail, name: user.name, role: user.role }),
        req.ip && (req.ip.includes('.') || req.ip.includes(':')) ? req.ip : '127.0.0.1'
      ]
    );

    await client.query('COMMIT');

    // Dispatch email confirmation notification
    await notificationService.sendVerificationEmail({
      email: normalizedEmail,
      name: user.name,
      token: confirmationToken,
      frontendUrl: env.frontendUrl
    });

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message: 'Account registered successfully! A confirmation link has been sent to your university email. Please verify your address before signing in.',
      data: {
        email: user.email,
        requiresVerification: true
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please check your information and try again.'
    });
  } finally {
    client.release();
  }
});

// 2. RESEND CONFIRMATION EMAIL
router.post('/resend-confirmation', authLimiter, validateResendConfirmation, async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const authResult = await pool.query(
      `SELECT a.id, a.email, a.email_confirmed_at, a.confirmed_at, u.name 
       FROM auth.users a
       LEFT JOIN public.users u ON u.id = a.id
       WHERE lower(a.email) = lower($1)`,
      [normalizedEmail]
    );

    if (authResult.rows.length === 0) {
      // Do not reveal email absence for security
      return res.json({
        success: true,
        message: 'If an account exists with this email address, a verification link has been sent.'
      });
    }

    const authUser = authResult.rows[0];

    // Check if already confirmed
    if (authUser.email_confirmed_at || authUser.confirmed_at) {
      return res.json({
        success: true,
        alreadyVerified: true,
        message: 'Your email address is already verified. You can sign in directly.'
      });
    }

    // Generate fresh confirmation token
    const freshToken = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `UPDATE auth.users 
       SET confirmation_token = $1, confirmation_sent_at = now(), updated_at = now()
       WHERE id = $2`,
      [freshToken, authUser.id]
    );

    await notificationService.sendVerificationEmail({
      email: normalizedEmail,
      name: authUser.name,
      token: freshToken,
      frontendUrl: env.frontendUrl
    });

    res.json({
      success: true,
      message: 'A fresh confirmation link has been dispatched to your email address.'
    });
  } catch (error) {
    console.error('Resend confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend confirmation email. Please try again in a few moments.'
    });
  }
});

// 3. VERIFY EMAIL (POST JSON)
router.post('/verify-email', authLimiter, validateVerifyEmail, async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, token } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const authResult = await client.query(
      `SELECT id, email, confirmation_token, confirmation_sent_at, email_confirmed_at, confirmed_at
       FROM auth.users
       WHERE lower(email) = lower($1)`,
      [normalizedEmail]
    );

    if (authResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Verification failed. No matching account found.'
      });
    }

    const authUser = authResult.rows[0];

    // Already confirmed?
    if (authUser.email_confirmed_at || authUser.confirmed_at) {
      return res.json({
        success: true,
        alreadyVerified: true,
        message: 'Your email is already verified. You can proceed to sign in.'
      });
    }

    // Validate confirmation token
    if (!authUser.confirmation_token || authUser.confirmation_token !== token.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired confirmation token. Please request a new verification email.'
      });
    }

    await client.query('BEGIN');

    // Mark confirmed in auth.users
    await client.query(
      `UPDATE auth.users 
       SET email_confirmed_at = now(),
           confirmation_token = NULL,
           updated_at = now()
       WHERE id = $1`,
      [authUser.id]
    );

    // Mark verified in public.users
    await client.query(
      `UPDATE public.users 
       SET is_verified = true, updated_at = now()
       WHERE id = $1`,
      [authUser.id]
    );

    // Audit log
    await client.query(
      `INSERT INTO public.audit_logs (user_id, action, table_name, record_id, ip_address)
       VALUES ($1, 'EMAIL_VERIFIED', 'users', $1, $2)`,
      [authUser.id, req.ip && (req.ip.includes('.') || req.ip.includes(':')) ? req.ip : '127.0.0.1']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Email verified successfully! You may now sign in to your Graphic Era account.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed. Please try again.'
    });
  } finally {
    client.release();
  }
});

// 4. VERIFY EMAIL (GET via browser link)
router.get('/verify-email', async (req, res) => {
  const { token, email } = req.query;
  const baseUrl = (env.frontendUrl || 'http://localhost:5173').replace(/\/$/, '');

  if (!token || !email) {
    return res.redirect(`${baseUrl}?verification_error=missing_parameters`);
  }

  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const authResult = await pool.query(
      `SELECT id, confirmation_token, email_confirmed_at, confirmed_at 
       FROM auth.users 
       WHERE lower(email) = lower($1)`,
      [normalizedEmail]
    );

    if (authResult.rows.length === 0) {
      return res.redirect(`${baseUrl}?verification_error=user_not_found`);
    }

    const authUser = authResult.rows[0];

    if (authUser.email_confirmed_at || authUser.confirmed_at) {
      return res.redirect(`${baseUrl}?verified=true&already=true`);
    }

    if (!authUser.confirmation_token || authUser.confirmation_token !== String(token).trim()) {
      return res.redirect(`${baseUrl}?verification_error=invalid_token`);
    }

    await pool.query(
      `UPDATE auth.users 
       SET email_confirmed_at = now(), confirmation_token = NULL, updated_at = now()
       WHERE id = $1`,
      [authUser.id]
    );

    await pool.query(
      `UPDATE public.users 
       SET is_verified = true, updated_at = now()
       WHERE id = $1`,
      [authUser.id]
    );

    return res.redirect(`${baseUrl}?verified=true`);
  } catch (err) {
    console.error('GET verify-email error:', err);
    return res.redirect(`${baseUrl}?verification_error=server_error`);
  }
});

// 5. LOGIN - Strictly validates confirmed-email status before granting access
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Verify credentials against Supabase auth.users
    const authResult = await pool.query(
      `SELECT id, email, encrypted_password, banned_until, email_confirmed_at, confirmed_at
       FROM auth.users
       WHERE lower(email) = lower($1)`,
      [normalizedEmail]
    );

    if (authResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.'
      });
    }

    const authUser = authResult.rows[0];

    // Check account suspension
    if (authUser.banned_until && new Date(authUser.banned_until) > new Date()) {
      return res.status(403).json({
        success: false,
        message: 'This account has been suspended by campus administration.'
      });
    }

    // Verify password against auth.users encrypted_password
    const isValidPassword = await bcrypt.compare(password, authUser.encrypted_password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your email and password.'
      });
    }

    // ENFORCE EMAIL CONFIRMATION STATUS
    const isEmailConfirmed = !!(authUser.email_confirmed_at || authUser.confirmed_at);
    if (!isEmailConfirmed) {
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: authUser.email,
        message: 'Your email address has not been confirmed yet. Please verify your email via the link sent to your inbox before logging in.'
      });
    }

    // Fetch application data from public.users linked through UUID
    let profileResult = await pool.query(
      `SELECT id, email, name, role, is_active, is_verified, is_blacklisted, blacklist_reason, auth_version
       FROM public.users
       WHERE id = $1`,
      [authUser.id]
    );

    if (profileResult.rows.length === 0) {
      // Auto-sync profile if not present
      profileResult = await pool.query(
        `INSERT INTO public.users (id, email, name, role, is_active, is_verified)
         VALUES ($1, $2, split_part($2, '@', 1), 'user', true, true)
         ON CONFLICT (id) DO UPDATE SET email = excluded.email, is_verified = true
         RETURNING id, email, name, role, is_active, is_verified, is_blacklisted, blacklist_reason, auth_version`,
        [authUser.id, authUser.email]
      );
    }

    const user = profileResult.rows[0];

    if (user.is_blacklisted) {
      return res.status(403).json({
        success: false,
        message: `Account is blacklisted: ${user.blacklist_reason || 'Violated campus community rules'}`
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact campus security desk.'
      });
    }

    // Update last_sign_in_at in auth.users
    await pool.query(
      'UPDATE auth.users SET last_sign_in_at = now() WHERE id = $1',
      [authUser.id]
    );

    const token = createAccessToken(user);
    setSessionCookie(res, user);

    // Log the login event
    await pool.query(
      `INSERT INTO public.audit_logs (user_id, action, table_name, record_id, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, 'LOGIN', 'users', user.id, req.ip && (req.ip.includes('.') || req.ip.includes(':')) ? req.ip : '127.0.0.1']
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          is_verified: user.is_verified
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

// 6. FORGOT PASSWORD (REQUEST RESET LINK)
router.post('/forgot-password', authLimiter, validateForgotPassword, async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const authResult = await pool.query(
      `SELECT a.id, a.email, u.name 
       FROM auth.users a
       LEFT JOIN public.users u ON u.id = a.id
       WHERE lower(a.email) = lower($1)`,
      [normalizedEmail]
    );

    if (authResult.rows.length > 0) {
      const authUser = authResult.rows[0];
      const recoveryToken = crypto.randomBytes(32).toString('hex');

      await pool.query(
        `UPDATE auth.users 
         SET recovery_token = $1, recovery_sent_at = now(), updated_at = now()
         WHERE id = $2`,
        [recoveryToken, authUser.id]
      );

      await notificationService.sendPasswordResetEmail({
        email: normalizedEmail,
        name: authUser.name,
        token: recoveryToken,
        frontendUrl: env.frontendUrl
      });
    }

    res.json({
      success: true,
      message: 'If an account exists with that email address, a password reset link has been dispatched.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request. Please try again.'
    });
  }
});

// 7. RESET PASSWORD (SUBMIT NEW PASSWORD WITH TOKEN)
router.post('/reset-password', authLimiter, validateResetPassword, async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, token, newPassword } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const authResult = await client.query(
      `SELECT id, email, recovery_token, recovery_sent_at 
       FROM auth.users 
       WHERE lower(email) = lower($1)`,
      [normalizedEmail]
    );

    if (authResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password reset request.'
      });
    }

    const authUser = authResult.rows[0];

    if (!authUser.recovery_token || authUser.recovery_token !== token.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.'
      });
    }

    // Check expiration (1 hour)
    if (authUser.recovery_sent_at) {
      const elapsed = Date.now() - new Date(authUser.recovery_sent_at).getTime();
      if (elapsed > 60 * 60 * 1000) {
        return res.status(400).json({
          success: false,
          message: 'Password reset token has expired. Please request a new reset link.'
        });
      }
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await client.query('BEGIN');

    // Update password in auth.users and clear recovery token
    await client.query(
      `UPDATE auth.users 
       SET encrypted_password = $1, recovery_token = NULL, updated_at = now()
       WHERE id = $2`,
      [hashedPassword, authUser.id]
    );

    // Invalidate existing sessions by incrementing auth_version
    await client.query(
      `UPDATE public.users 
       SET auth_version = auth_version + 1, updated_at = now()
       WHERE id = $1`,
      [authUser.id]
    );

    // Audit log
    await client.query(
      `INSERT INTO public.audit_logs (user_id, action, table_name, record_id, ip_address)
       VALUES ($1, 'PASSWORD_RESET_COMPLETED', 'users', $1, $2)`,
      [authUser.id, req.ip && (req.ip.includes('.') || req.ip.includes(':')) ? req.ip : '127.0.0.1']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Your password has been successfully reset! You may now sign in with your new credentials.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    });
  } finally {
    client.release();
  }
});

// 8. GET CURRENT USER PROFILE
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, role, phone, avatar_url, is_verified, created_at 
       FROM public.users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    res.json({
      success: true,
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// 9. UPDATE USER PROFILE
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user.id;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100)) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 100 characters' });
    }

    if (phone !== undefined && (typeof phone !== 'string' || phone.length > 32)) {
      return res.status(400).json({ success: false, message: 'Phone number is invalid' });
    }

    const result = await pool.query(
      `UPDATE public.users 
       SET name = COALESCE($1, name), 
           phone = COALESCE($2, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 
       RETURNING id, email, name, role, phone, avatar_url, is_verified, updated_at`,
      [name?.trim(), phone?.trim() || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    // Sync metadata to auth.users raw_user_meta_data
    await pool.query(
      `UPDATE auth.users
       SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || $1::jsonb,
           updated_at = now()
       WHERE id = $2::uuid`,
      [JSON.stringify({ name: result.rows[0].name, phone: result.rows[0].phone || null }), userId]
    );

    // Audit log
    await pool.query(
      `INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        'UPDATE_PROFILE',
        'users',
        userId,
        JSON.stringify({ name: result.rows[0].name, phone: result.rows[0].phone }),
        req.ip && (req.ip.includes('.') || req.ip.includes(':')) ? req.ip : '127.0.0.1'
      ]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// 10. CHANGE PASSWORD
router.put('/change-password', authenticateToken, passwordChangeLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 10 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 10 characters with uppercase, lowercase, and a number'
      });
    }

    const authResult = await pool.query(
      'SELECT encrypted_password FROM auth.users WHERE id = $1',
      [userId]
    );

    if (authResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User credentials not found'
      });
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      authResult.rows[0].encrypted_password
    );

    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      `UPDATE auth.users
       SET encrypted_password = $1, updated_at = now()
       WHERE id = $2`,
      [hashedNewPassword, userId]
    );

    const updateResult = await pool.query(
      `UPDATE public.users
       SET auth_version = auth_version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, name, role, auth_version`,
      [userId]
    );

    setSessionCookie(res, updateResult.rows[0]);

    await pool.query(
      `INSERT INTO public.audit_logs (user_id, action, table_name, record_id, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'CHANGE_PASSWORD', 'users', userId, req.ip && (req.ip.includes('.') || req.ip.includes(':')) ? req.ip : '127.0.0.1']
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// 11. LOGOUT
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO public.audit_logs (user_id, action, table_name, record_id, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'LOGOUT', 'users', req.user.id, req.ip && (req.ip.includes('.') || req.ip.includes(':')) ? req.ip : '127.0.0.1']
    );

    clearSessionCookie(res);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

module.exports = router;
