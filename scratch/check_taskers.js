
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTaskers() {
  const { data, error } = await supabase.from('taskers').select('id, status, city, skills, hourly_rate');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

checkTaskers();
