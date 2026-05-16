import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmptjdwhpgvoyeocccsg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcHRqZHdocGd2b3llb2NjY3NnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYwNTUwMSwiZXhwIjoyMDkzMTgxNTAxfQ.YkxP7cw80ZdOnnKCQYbX47slE3BvglcJT3qY1vQMUik';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verify() {
  const { data, error } = await supabase.from('services').select('id, name, slug');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Services with slugs:');
  console.table(data);
}

verify().catch(console.error);