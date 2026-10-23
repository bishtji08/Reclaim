const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const env = require('./env');

const isLocalDatabase = (connectionString) => {
  try {
    const host = new URL(connectionString).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
};

const getSslConfig = (connectionString) => {
  if (env.databaseSsl === 'false' || isLocalDatabase(connectionString)) {
    return false;
  }

  const certificatePath = env.databaseSslCaPath;
  if (!certificatePath) {
    if (!env.databaseSslRejectUnauthorized) {
      return { rejectUnauthorized: false };
    }
    return { rejectUnauthorized: true };
  }

  const resolvedCertificatePath = path.isAbsolute(certificatePath)
    ? certificatePath
    : path.resolve(__dirname, '../../', certificatePath);
  if (!fs.existsSync(resolvedCertificatePath)) {
    throw new Error(`DATABASE_SSL_CA_PATH does not exist: ${resolvedCertificatePath}`);
  }

  return {
    rejectUnauthorized: true,
    ca: fs.readFileSync(resolvedCertificatePath, 'utf8'),
  };
};

const connectionConfig = env.databaseUrl
  ? {
      connectionString: env.databaseUrl,
      ssl: getSslConfig(env.databaseUrl),
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'lost_found_db',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const pool = new Pool({
  ...connectionConfig,
  options: '-c search_path=public,extensions',
  max: isServerless ? 2 : Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: isServerless ? 5000 : 30000,
  connectionTimeoutMillis: 20000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
});

module.exports = pool;
