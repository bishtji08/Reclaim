const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL,
  databaseSslCaPath: process.env.DATABASE_SSL_CA_PATH,
  databaseSslRejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  trustProxy: process.env.TRUST_PROXY === 'true',
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 100),
  apiRateLimitMax: Number(process.env.API_RATE_LIMIT_MAX || 1000),
  passwordChangeRateLimitMax: Number(process.env.PASSWORD_CHANGE_RATE_LIMIT_MAX || 5),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  cloudinaryItemPreset: process.env.CLOUDINARY_ITEM_PRESET || 'reclaim_items',
  cloudinaryProofPreset: process.env.CLOUDINARY_PROOF_PRESET || 'reclaim_proof',

};
