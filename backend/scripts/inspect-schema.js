const pool = require('../src/config/database');

const queries = {
  relations: `
    select
      n.nspname as schema_name,
      c.relname as relation_name,
      c.relkind as relation_kind,
      c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as rls_forced
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'auth')
      and c.relkind in ('r', 'p', 'v', 'm')
    order by n.nspname, c.relname;
  `,
  columns: `
    select
      table_schema,
      table_name,
      ordinal_position,
      column_name,
      data_type,
      is_nullable,
      column_default
    from information_schema.columns
    where table_schema = 'public'
       or (table_schema = 'auth' and table_name = 'users')
    order by table_schema, table_name, ordinal_position;
  `,
  triggers: `
    select
      n.nspname as schema_name,
      c.relname as table_name,
      t.tgname as trigger_name,
      pg_get_triggerdef(t.oid, true) as definition
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and not t.tgisinternal
    order by c.relname, t.tgname;
  `,
  policies: `
    select
      schemaname as schema_name,
      tablename as table_name,
      policyname as policy_name,
      roles,
      cmd,
      qual as using_expression
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname;
  `
};

async function inspect() {
  const inventory = {};
  for (const [name, query] of Object.entries(queries)) {
    inventory[name] = (await pool.query(query)).rows;
  }
  console.log(JSON.stringify(inventory, null, 2));
}

inspect()
  .catch((error) => {
    console.error('Inspection failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
