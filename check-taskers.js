import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmptjdwhpgvoyeocccsg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcHRqZHdocGd2b3llb2NjY3NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MDU1MDEsImV4cCI6MjA5MzE4MTUwMX0.ErUPR11phoIXor_yWx1X__EG_SnBM84q03XccMBWRU4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTaskers() {
  const { data, error } = await supabase
    .from('taskers')
    .select(`
      id,
      status,
      is_featured,
      hourly_rate,
      city,
      rating,
      users!inner (
        full_name
      )
    `)
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Taskers found:', data.length);
  data.forEach((t, i) => {
    console.log(`${i+1}. ${t.users?.full_name || 'No name'} | Status: ${t.status} | Featured: ${t.is_featured} | Rate: ${t.hourly_rate} | City: ${t.city} | Rating: ${t.rating}`);
  });
}

checkTaskers();
