import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmptjdwhpgvoyeocccsg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcHRqZHdocGd2b3llb2NjY3NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MDU1MDEsImV4cCI6MjA5MzE4MTUwMX0.ErUPR11phoIXor_yWx1X__EG_SnBM84q03XccMBWRU4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSiteSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Site settings found:', data.length);
  data.forEach((s, i) => {
    console.log(`${i + 1}. ${s.id}: ${s.value}`);
  });
}

checkSiteSettings();
