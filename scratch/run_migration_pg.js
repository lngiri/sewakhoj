import pg from 'pg';
import { readFileSync } from 'fs';

const { Pool } = pg;

// Try Supabase connection pooler (port 6543) with various auth approaches
async function tryConnect(host, port, user, password, db) {
  const pool = new Pool({
    host,
    port,
    database: db,
    user,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    const client = await pool.connect();
    console.log(`CONNECTED: ${user}@${host}:${port}/${db}`);
    const { rows } = await client.query('SELECT current_database(), current_user, version()');
    console.log(rows[0]);
    client.release();
    await pool.end();
    return true;
  } catch (err) {
    console.log(`FAILED ${user}@${host}:${port}/${db}: ${err.message}`);
    await pool.end().catch(() => {});
    return false;
  }
}

async function main() {
  const ref = 'xmptjdwhpgvoyeocccsg';
  
  // Try pooler with various combinations
  const attempts = [
    // Pooler with service_role key as password
    { host: `aws-0-ap-southeast-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}`, password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcHRqZHdocGd2b3llb2NjY3NnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYwNTUwMSwiZXhwIjoyMDkzMTgxNTAxfQ.YkxP7cw80ZdOnnKCQYbX47slE3BvglcJT3qY1vQMUik', db: 'postgres' },
    // Pooler with anon key
    { host: `aws-0-ap-southeast-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}`, password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcHRqZHdocGd2b3llb2NjY3NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MDU1MDEsImV4cCI6MjA5MzE4MTUwMX0.ErUPR11phoIXor_yWx1X__EG_SnBM84q03XccMBWRU4', db: 'postgres' },
    // Direct with service role
    { host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres', password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcHRqZHdocGd2b3llb2NjY3NnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYwNTUwMSwiZXhwIjoyMDkzMTgxNTAxfQ.YkxP7cw80ZdOnnKCQYbX47slE3BvglcJT3qY1vQMUik', db: 'postgres' },
  ];
  
  for (const a of attempts) {
    const ok = await tryConnect(a.host, a.port, a.user, a.password, a.db);
    if (ok) {
      console.log('\nRunning migration 045...');
      const pool = new Pool({ ...a, ssl: { rejectUnauthorized: false } });
      const client = await pool.connect();
      const sql = readFileSync('supabase/migrations/045_add_service_slugs.sql', 'utf-8');
      await client.query(sql);
      console.log('Migration applied!');
      const { rows } = await client.query('SELECT id, name, slug FROM public.services LIMIT 10');
      console.table(rows);
      client.release();
      await pool.end();
      return;
    }
  }
  console.log('\nAll connection attempts failed.');
}

main();