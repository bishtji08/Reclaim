const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const userRepository = require('../repositories/userRepository');

const authService = {
  async register({ email, password, name, phone, ipAddress }) {
    const client = await pool.connect();
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await userRepository.findAuthUserByEmail(normalizedEmail);
      if (existing) {
        throw new Error('User already exists with this email');
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const userId = crypto.randomUUID();

      await client.query('BEGIN');

      await userRepository.createAuthUser(client, {
        id: userId,
        email: normalizedEmail,
        passwordHash: hashedPassword,
        name: name.trim(),
        phone: phone?.trim() || null
      });

      const user = await userRepository.createProfile(client, {
        id: userId,
        email: normalizedEmail,
        name: name.trim(),
        role: 'user',
        phone: phone?.trim() || null
      });

      await userRepository.logAudit(client, {
        userId: user.id,
        action: 'REGISTER',
        tableName: 'users',
        recordId: user.id,
        newValues: { email: normalizedEmail, name: user.name, role: user.role },
        ipAddress
      });

      await client.query('COMMIT');
      return user;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async login({ email, password, ipAddress }) {
    const normalizedEmail = email.toLowerCase().trim();
    const authUser = await userRepository.findAuthUserByEmail(normalizedEmail);
    if (!authUser) {
      throw new Error('Invalid credentials');
    }

    if (authUser.banned_until && new Date(authUser.banned_until) > new Date()) {
      throw new Error('Account is suspended');
    }

    const isValid = await bcrypt.compare(password, authUser.encrypted_password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    let user = await userRepository.findProfileById(authUser.id);
    if (!user) {
      user = await userRepository.createProfile(pool, {
        id: authUser.id,
        email: authUser.email,
        name: authUser.email.split('@')[0],
        role: 'user'
      });
    }

    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    await pool.query('UPDATE auth.users SET last_sign_in_at = now() WHERE id = $1', [authUser.id]);
    await userRepository.logAudit(pool, {
      userId: user.id,
      action: 'LOGIN',
      tableName: 'users',
      recordId: user.id,
      ipAddress
    });

    return user;
  },

  async changePassword({ userId, currentPassword, newPassword, ipAddress }) {
    const authUser = await userRepository.findAuthUserById(userId);
    if (!authUser) {
      throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, authUser.encrypted_password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const updatedUser = await userRepository.updatePassword(userId, hashedPassword);

    await userRepository.logAudit(pool, {
      userId,
      action: 'CHANGE_PASSWORD',
      tableName: 'users',
      recordId: userId,
      ipAddress
    });

    return updatedUser;
  }
};

module.exports = authService;
