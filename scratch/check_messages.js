
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMessages() {
  const { data, error } = await supabase.from('messages').select('*').limit(1);
  if (error) {
    console.error('Error fetching messages:', error);
  } else {
    console.log('Messages table exists. Data:', data);
  }
}

checkMessages();
