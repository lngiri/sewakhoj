import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmptjdwhpgvoyeocccsg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcHRqZHdocGd2b3llb2NjY3NnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYwNTUwMSwiZXhwIjoyMDkzMTgxNTAxfQ.YkxP7cw80ZdOnnKCQYbX47slE3BvglcJT3qY1vQMUik';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, slug')
    .order('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total services: ${data.length}`);
  console.log('');
  console.log('id | name | slug');
  console.log('-'.repeat(80));
  for (const row of data) {
    console.log(`${row.id} | ${row.name} | ${row.slug}`);
  }

  // Check for duplicates
  const slugs = data.map(r => r.slug);
  const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dupes.length > 0) {
    console.log(`\n⚠️  WARNING: Duplicate slugs found: ${[...new Set(dupes)].join(', ')}`);
  } else {
    console.log('\n✅ All slugs are unique');
  }

  // Check for UUID suffixes
  const hasSuffix = data.filter(r => /-[a-f0-9]{6}$/.test(r.slug));
  if (hasSuffix.length > 0) {
    console.log(`⚠️  ${hasSuffix.length} rows still have UUID suffixes:`);
    hasSuffix.forEach(r => console.log(`   ${r.name} → ${r.slug}`));
  } else {
    console.log('✅ No UUID suffixes — all slugs are clean');
  }
}

main();