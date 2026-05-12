
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkColumns() {
  const { data, error } = await supabase.from('messages').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    console.log('No data in messages table. Cannot determine columns via select *');
    // Try to insert a dummy record and rollback? No, just try to query common columns
    const common = ['id', 'sender_id', 'receiver_id', 'content', 'created_at', 'booking_id'];
    for(const c of common) {
        const { error } = await supabase.from('messages').select(c).limit(1);
        console.log(`Column ${c}: ${error ? 'NOT FOUND' : 'FOUND'}`);
    }
  }
}

checkColumns();
