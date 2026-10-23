const pool = require('../src/config/database');

async function checkVault() {
  try {
    const res = await pool.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'vault'
    `);
    console.log('Vault tables:', res.rows);
    if (res.rows.length > 0) {
      const secrets = await pool.query(`SELECT * FROM vault.secrets LIMIT 5`);
      console.log('Vault secrets:', secrets.rows);
    }
  } catch (e) {
    console.log('Vault check:', e.message);
  }

  // Check storage policies
  try {
    const policies = await pool.query(`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname IN ('storage', 'public')
    `);
    console.log('Policies:', policies.rows);
  } catch (e) {
    console.log('Policies check:', e.message);
  }

  process.exit(0);
}

checkVault();
