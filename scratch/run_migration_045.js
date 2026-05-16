import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmptjdwhpgvoyeocccsg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcHRqZHdocGd2b3llb2NjY3NnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYwNTUwMSwiZXhwIjoyMDkzMTgxNTAxfQ.YkxP7cw80ZdOnnKCQYbX47slE3BvglcJT3qY1vQMUik';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  // Step 1: Create the sql RPC function so future migrations work
  console.log('Creating sql() RPC function...');
  const { error: fnErr } = await supabase.sql`
    CREATE OR REPLACE FUNCTION public.sql(query text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    BEGIN
      EXECUTE query;
    END;
    $func$;
  `;
  if (fnErr) {
    console.error('Failed to create sql function:', fnErr);
    return;
  }
  console.log('sql() function created.');

  // Step 2: Run migration 045
  console.log('\nRunning migration 045...');
  
  // Add slug column
  console.log('  1. Adding slug column...');
  let { error } = await supabase.sql`ALTER TABLE public.services ADD COLUMN IF NOT EXISTS slug TEXT;`;
  if (error) console.error('    ERROR:', error.message);
  else console.log('    OK');

  // Backfill slugs
  console.log('  2. Backfilling slugs...');
  ({ error } = await supabase.sql`
    UPDATE public.services 
    SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\\s-]', '', 'g'), '\\s+', '-', 'g'))
    WHERE slug IS NULL;
  `);
  if (error) console.error('    ERROR:', error.message);
  else console.log('    OK');

  // Handle duplicates
  console.log('  3. Handling duplicate slugs...');
  ({ error } = await supabase.sql`
    UPDATE public.services s1
    SET slug = s1.slug || '-' || SUBSTRING(s1.id::text, 1, 6)
    WHERE EXISTS (
      SELECT 1 FROM public.services s2 
      WHERE s2.slug = s1.slug AND s2.id != s1.id
    );
  `);
  if (error) console.error('    ERROR:', error.message);
  else console.log('    OK');

  // Add unique constraint
  console.log('  4. Adding unique constraint...');
  ({ error } = await supabase.sql`ALTER TABLE public.services ADD CONSTRAINT services_slug_unique UNIQUE (slug);`);
  if (error) console.error('    ERROR:', error.message);
  else console.log('    OK');

  // Add index
  console.log('  5. Adding index...');
  ({ error } = await supabase.sql`CREATE INDEX IF NOT EXISTS idx_services_slug ON public.services(slug);`);
  if (error) console.error('    ERROR:', error.message);
  else console.log('    OK');

  // Make NOT NULL
  console.log('  6. Setting slug NOT NULL...');
  ({ error } = await supabase.sql`ALTER TABLE public.services ALTER COLUMN slug SET NOT NULL;`);
  if (error) console.error('    ERROR:', error.message);
  else console.log('    OK');

  // Step 3: Verify
  console.log('\nVerifying...');
  const { data, error: verifyErr } = await supabase.from('services').select('id, name, slug');
  if (verifyErr) {
    console.error('Verify error:', verifyErr);
  } else {
    console.table(data);
  }

  console.log('\nMigration 045 complete!');
}

main().catch(console.error);