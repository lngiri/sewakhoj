const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkTaskers() {
  const { count: activeCount } = await supabase.from('taskers').select('*', { count: 'exact', head: true }).eq('status', 'active');
  const { count: pendingCount } = await supabase.from('taskers').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
  
  console.log('Active Taskers:', activeCount);
  console.log('Pending Taskers:', pendingCount);
  console.log('Total Users:', totalUsers);
}

checkTaskers();
