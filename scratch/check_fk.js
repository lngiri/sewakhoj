import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmptjdwhpgvoyeocccsg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcHRqZHdocGd2b3llb2NjY3NnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYwNTUwMSwiZXhwIjoyMDkzMTgxNTAxfQ.YkxP7cw80ZdOnnKCQYbX47slE3BvglcJT3qY1vQMUik';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  // Check if any taskers reference service IDs
  const { data: taskers, error } = await supabase
    .from('taskers')
    .select('id, skills')
    .not('skills', 'is', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total taskers with skills: ${taskers.length}`);

  // Get all service IDs
  const { data: services } = await supabase.from('services').select('id, name');
  const serviceIds = new Set(services.map(s => s.id));

  let refsFound = 0;
  for (const t of taskers) {
    if (t.skills && t.skills.length > 0) {
      for (const skillId of t.skills) {
        if (serviceIds.has(skillId)) {
          refsFound++;
          const svc = services.find(s => s.id === skillId);
          console.log(`Tasker ${t.id} references service ${skillId} (${svc?.name})`);
        }
      }
    }
  }

  if (refsFound === 0) {
    console.log('\nNo taskers reference any service IDs. FK constraint may be the issue.');
  } else {
    console.log(`\n${refsFound} references found.`);
  }

  // Check FK constraints on services table
  console.log('\n--- Checking for FK constraints ---');
  // Try to delete one duplicate to see the error
  const dupes = services.filter(s => s.name === 'Plumbing');
  if (dupes.length > 1) {
    const toDelete = dupes[1].id;
    console.log(`Trying to delete duplicate Plumbing: ${toDelete}...`);
    const { error: delErr } = await supabase.from('services').delete().eq('id', toDelete);
    if (delErr) {
      console.log(`Delete error: ${delErr.message}`);
      console.log(`Details: ${JSON.stringify(delErr)}`);
    } else {
      console.log('Delete succeeded!');
    }
  }
}

main();
