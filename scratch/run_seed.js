
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
  const sql = fs.readFileSync('supabase/migrations/006_seed_taskers.sql', 'utf8');
  // Supabase JS doesn't have a direct 'sql' execution method for arbitrary SQL
  // But we can parse the INSERTs and run them
  
  // For this specific seed, I'll just run them manually via the client for safety
  
  // Insert Users
  const users = [
    { id: '337f575f-8f54-4f74-b762-3b22810d4239', full_name: 'Ram Bahadur', phone: '+9779763650737', role: 'tasker', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ram' },
    { id: '337f575f-8f54-4f74-b762-3b22810d4240', full_name: 'Sita Sharma', phone: '+9779763650738', role: 'tasker', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sita' },
    { id: '337f575f-8f54-4f74-b762-3b22810d4241', full_name: 'Hari Prasad', phone: '+9779763650739', role: 'tasker', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hari' },
    { id: '337f575f-8f54-4f74-b762-3b22810d4242', full_name: 'Krishna Thapa', phone: '+9779763650740', role: 'tasker', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Krishna' }
  ];

  for (const u of users) {
    const { error } = await supabase.from('users').upsert(u);
    if (error) console.error(`Error inserting user ${u.full_name}:`, error);
  }

  // Insert Taskers
  const taskers = [
    { user_id: '337f575f-8f54-4f74-b762-3b22810d4239', status: 'active', city: 'kathmandu', skills: ['plumbing', 'electrical'], hourly_rate: 500, bio: 'Professional plumber with 10 years of experience.', rating: 4.9, total_tasks: 120, transportation_mode: 'motorcycle' },
    { user_id: '337f575f-8f54-4f74-b762-3b22810d4240', status: 'active', city: 'pokhara', skills: ['cleaning'], hourly_rate: 400, bio: 'Expert in deep cleaning and home organization.', rating: 4.8, total_tasks: 85, transportation_mode: 'car' },
    { user_id: '337f575f-8f54-4f74-b762-3b22810d4241', status: 'active', city: 'lalitpur', skills: ['tutoring'], hourly_rate: 600, bio: 'Math and Science tutor for high school students.', rating: 4.7, total_tasks: 50, transportation_mode: 'public_transit' },
    { user_id: '337f575f-8f54-4f74-b762-3b22810d4242', status: 'active', city: 'bhaktapur', skills: ['cooking'], hourly_rate: 550, bio: 'Specialized in Nepali and Indian cuisine.', rating: 4.9, total_tasks: 200, transportation_mode: 'bicycle' }
  ];

  for (const t of taskers) {
    const { error } = await supabase.from('taskers').upsert(t, { onConflict: 'user_id' });
    if (error) console.error(`Error inserting tasker for ${t.user_id}:`, error);
  }

  console.log("Seed completed!");
}

runSeed();
