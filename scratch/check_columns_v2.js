
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkColumns() {
  const common = ['id', 'user_id', 'sender_id', 'recipient_id', 'message', 'text', 'body', 'type', 'booking_id', 'is_admin'];
  for(const c of common) {
      const { error } = await supabase.from('messages').select(c).limit(1);
      if (!error) console.log(`Column ${c}: FOUND`);
  }
}

checkColumns();
