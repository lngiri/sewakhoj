
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'messages' });
  if (error) {
    // If RPC doesn't exist, try a direct query to information_schema
    const { data: cols, error: colError } = await supabase.from('_columns_info').select('*').limit(1); // Wait I don't have this
    
    // Let's just use raw SQL if possible, but we can't from client.
    // Let's just try to select one row and look at keys.
    const { data: rows } = await supabase.from('messages').select('*').limit(1);
    if (rows && rows.length > 0) {
        console.log('Columns found:', Object.keys(rows[0]));
    } else {
        console.log('No rows found to determine columns');
    }
  } else {
    console.log('Columns:', data);
  }
}

checkColumns();
