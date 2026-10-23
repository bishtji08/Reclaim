/*
 * Non-destructive Supabase Migration Runner.
 *
 * Applies reviewed, idempotent migrations from supabase/migrations/
 * without dropping or deleting any tables or existing data.
 */
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Beginning migration run...');
    await client.query('BEGIN');

    // Create migration tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public._migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No supabase/migrations directory found.');
      await client.query('COMMIT');
      return;
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const alreadyApplied = await client.query(
        'SELECT 1 FROM public._migrations WHERE name = $1',
        [file]
      );

      if (alreadyApplied.rows.length > 0) {
        console.log(`Skipping already-applied migration: ${file}`);
        continue;
      }

      console.log(`Applying migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);

      await client.query(
        'INSERT INTO public._migrations (name) VALUES ($1)',
        [file]
      );
      console.log(`Successfully applied: ${file}`);
    }

    await client.query('COMMIT');
    console.log('All migrations applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Migration failed and was rolled back: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .catch(() => {
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { runMigrations };
