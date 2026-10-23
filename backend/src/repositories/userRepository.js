const pool = require('../config/database');

const userRepository = {
  async findAuthUserByEmail(email) {
    const res = await pool.query(
      'SELECT id, email, encrypted_password, banned_until FROM auth.users WHERE lower(email) = lower($1)',
      [email]
    );
    return res.rows[0] || null;
  },

  async findAuthUserById(id) {
    const res = await pool.query(
      'SELECT id, email, encrypted_password FROM auth.users WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  },

  async findProfileById(id) {
    const res = await pool.query(
      `SELECT id, email, name, role, phone, avatar_url, is_verified, is_active, auth_version, created_at, updated_at
       FROM public.users WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async createAuthUser(client, { id, email, passwordHash, name, phone }) {
    return client.query(
      `INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        role, aud, is_super_admin
      )
      VALUES (
        $1::uuid, '00000000-0000-0000-0000-000000000000', $2::text, $3::text, now(),
        '{"provider":"email","providers":["email"],"role":"user"}'::jsonb,
        $4::jsonb, now(), now(), 'authenticated', 'authenticated', false
      )`,
      [id, email, passwordHash, JSON.stringify({ name, phone: phone || null })]
    );
  },

  async createProfile(client, { id, email, name, role, phone }) {
    const res = await client.query(
      `INSERT INTO public.users (id, email, name, role, phone, is_verified, is_active)
       VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text, true, true)
       ON CONFLICT (id) DO UPDATE SET
         name = excluded.name,
         phone = excluded.phone,
         updated_at = now()
       RETURNING id, email, name, role, auth_version, created_at`,
      [id, email, name, role || 'user', phone || null]
    );
    return res.rows[0];
  },

  async updateProfile(id, { name, phone }) {
    const res = await pool.query(
      `UPDATE public.users
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, email, name, role, phone, avatar_url, updated_at`,
      [name, phone, id]
    );
    return res.rows[0] || null;
  },

  async updatePassword(id, hashedPassword) {
    await pool.query(
      'UPDATE auth.users SET encrypted_password = $1, updated_at = now() WHERE id = $2',
      [hashedPassword, id]
    );
    const res = await pool.query(
      `UPDATE public.users
       SET auth_version = auth_version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, name, role, auth_version`,
      [id]
    );
    return res.rows[0];
  },

  async logAudit(clientOrPool, { userId, action, tableName, recordId, newValues, ipAddress }) {
    return clientOrPool.query(
      `INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
       VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::jsonb, $6::inet)`,
      [
        userId,
        action,
        tableName,
        recordId,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress && (ipAddress.includes('.') || ipAddress.includes(':')) ? ipAddress : '127.0.0.1'
      ]
    );
  }
};

module.exports = userRepository;
