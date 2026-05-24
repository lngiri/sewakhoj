
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
  const tables = ['users', 'taskers', 'bookings', 'notifications', 'staff_roles', 'support_tickets', 'messages'];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table ${table}: NOT FOUND or ERROR: ${error.message}`);
    } else {
      console.log(`Table ${table}: FOUND`);
    }
  }
}

checkSchema();
