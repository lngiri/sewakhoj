
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
  const taskers = [
    { 
      user_id: '337f575f-8f54-4f74-b762-3b22810d4238', 
      status: 'active', 
      city: 'kathmandu', 
      skills: ['plumbing', 'electrical'], 
      hourly_rate: 500, 
      bio: 'Expert plumber and electrician with 10 years experience.', 
      rating: 4.9, 
      total_jobs: 120 
    },
    { 
      user_id: '137ec1a0-6783-40eb-8f13-604aff47a759', 
      status: 'active', 
      city: 'pokhara', 
      skills: ['cleaning', 'cooking'], 
      hourly_rate: 400, 
      bio: 'Professional cleaner and home chef.', 
      rating: 4.8, 
      total_jobs: 85 
    }
  ];

  for (const t of taskers) {
    const { error } = await supabase.from('taskers').upsert(t, { onConflict: 'user_id' });
    if (error) console.error(`Error inserting tasker for ${t.user_id}:`, error);
    else console.log(`Tasker for ${t.user_id} updated successfully.`);
  }

  // Update user roles to 'tasker'
  await supabase.from('users').update({ role: 'tasker' }).in('id', taskers.map(t => t.user_id));

  console.log("Seed completed!");
}

runSeed();
