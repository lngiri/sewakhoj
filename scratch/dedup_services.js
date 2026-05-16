import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmptjdwhpgvoyeocccsg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcHRqZHdocGd2b3llb2NjY3NnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYwNTUwMSwiZXhwIjoyMDkzMTgxNTAxfQ.YkxP7cw80ZdOnnKCQYbX47slE3BvglcJT3qY1vQMUik';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  // Get all services
  const { data: services, error } = await supabase
    .from('services')
    .select('id, name')
    .order('name')
    .order('id');

  if (error) { console.error('Fetch error:', error); return; }

  console.log(`Found ${services.length} services`);

  // Group by name, keep first ID per name
  const seen = new Map();
  const toDelete = [];

  for (const s of services) {
    if (seen.has(s.name)) {
      toDelete.push(s);
    } else {
      seen.set(s.name, s.id);
    }
  }

  console.log(`Keeping ${seen.size} services, deleting ${toDelete.length} duplicates...`);

  // Delete duplicates
  for (const dup of toDelete) {
    const { error: delErr } = await supabase.from('services').delete().eq('id', dup.id);
    if (delErr) {
      console.error(`  FAILED to delete ${dup.name} (${dup.id}): ${delErr.message}`);
    } else {
      console.log(`  Deleted: ${dup.name} (${dup.id})`);
    }
  }

  // Reset all slugs to clean values
  console.log('\nResetting slugs...');
  const keepers = [...seen.entries()];
  for (const [name, id] of keepers) {
    const cleanSlug = name.toLowerCase().replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
    const { error: updErr } = await supabase.from('services').update({ slug: cleanSlug }).eq('id', id);
    if (updErr) {
      console.error(`  FAILED to update slug for ${name}: ${updErr.message}`);
    } else {
      console.log(`  ${name} → ${cleanSlug}`);
    }
  }

  // Verify
  console.log('\n=== FINAL VERIFICATION ===');
  const { data: final } = await supabase.from('services').select('id, name, slug').order('name');
  console.log(`Total: ${final.length} services`);
  for (const row of final) {
    const suffix = /-[a-f0-9]{6}$/.test(row.slug) ? ' ⚠️ HAS SUFFIX' : ' ✅';
    console.log(`  ${row.name} → ${row.slug}${suffix}`);
  }
}

main();