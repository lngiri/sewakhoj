
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkColumns() {
  const common = ['recipient_id', 'target_id', 'is_admin', 'payload', 'role', 'channel_id'];
  for(const c of common) {
      const { error } = await supabase.from('messages').select(c).limit(1);
      if (!error) console.log(`Column ${c}: FOUND`);
  }
}

checkColumns();
