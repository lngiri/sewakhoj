import pg from 'pg';
import { readFileSync } from 'fs';

const { Pool } = pg;
const ref = 'xmptjdwhpgvoyeocccsg';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcHRqZHdocGd2b3llb2NjY3NnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYwNTUwMSwiZXhwIjoyMDkzMTgxNTAxfQ.YkxP7cw80ZdOnnKCQYbX47slE3BvglcJT3qY1vQMUik';

async function main() {
  const pool = new Pool({
    host: `db.${ref}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: `postgres.${ref}`,
    password: serviceRoleKey,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    const client = await pool.connect();
    console.log('Connected to Supabase!\n');

    const sql = readFileSync('supabase/migrations/050_discovery_matching_engine.sql', 'utf-8');
    
    // Execute the entire SQL file as one statement (pg handles multi-statement)
    console.log('Running migration 050...');
    await client.query(sql);
    console.log('Migration 050 applied successfully!\n');

    // Verify
    console.log('--- Verification ---');
    
    // Check trust scores
    const { rows: scores } = await client.query(
      `SELECT id, trust_score, is_elite, completion_count, average_rating 
       FROM public.taskers WHERE status = 'active' LIMIT 5`
    );
    console.log('Sample tasker trust scores:');
    console.table(scores);

    // Check functions exist
    const { rows: fns } = await client.query(
      `SELECT routine_name FROM information_schema.routines 
       WHERE routine_name IN ('search_taskers_nearby', 'compute_trust_score')
       AND routine_schema = 'public'`
    );
    console.log('Functions created:', fns.map(f => f.routine_name).join(', '));

    client.release();
    console.log('\nDone!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();