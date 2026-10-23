-- test-connection.sql
-- Verifies database connection, extensions, and schema availability

SELECT
  current_database() AS db_name,
  current_user AS db_user,
  version() AS pg_version;

SELECT extname, extversion, extnamespace::regnamespace::text AS schema
FROM pg_extension
WHERE extname IN ('postgis', 'pgcrypto', 'uuid-ossp');

SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
