import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local manually so we don't need dotenv dependency
const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const PASSWORD = 'Password123!';

const mockTaskers = [
  { name: "Hari Bahadur", email: "hari.tasker@example.com", city: "Kathmandu", service: "plumbing", rate: 500, rating: 4.8 },
  { name: "Sita Sharma", email: "sita.tasker@example.com", city: "Pokhara", service: "cleaning", rate: 400, rating: 5.0 },
  { name: "Ramesh Thapa", email: "ramesh.tasker@example.com", city: "Lalitpur", service: "electrical", rate: 800, rating: 3.5 },
  { name: "Gita Nepal", email: "gita.tasker@example.com", city: "Bhaktapur", service: "tutoring", rate: 1500, rating: 4.2 },
  { name: "Bikash Gurung", email: "bikash.tasker@example.com", city: "Kathmandu", service: "cleaning", rate: 2000, rating: 4.9 },
];

const mockCustomers = [
  { name: "Customer One", email: "customer1@example.com", city: "Kathmandu" },
  { name: "Customer Two", email: "customer2@example.com", city: "Pokhara" },
  { name: "Customer Three", email: "customer3@example.com", city: "Lalitpur" },
];

async function seed() {
  console.log("🌱 Starting Database Seed...");
  
  const createdTaskers = [];
  const createdCustomers = [];

  // 1. Create Taskers
  for (const t of mockTaskers) {
    console.log(`Creating tasker: ${t.name}...`);
    // Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: t.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: t.name, role: 'tasker' }
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log(`Tasker ${t.email} already exists, skipping auth creation.`);
        // Fetch existing user to get ID
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === t.email);
        if(existingUser) {
           // We'll skip re-inserting them for simplicity
           const {data: taskerRecord} = await supabase.from('taskers').select('id, user_id').eq('user_id', existingUser.id).single();
           if(taskerRecord) createdTaskers.push(taskerRecord);
        }
        continue;
      } else {
        console.error("Auth Error:", authError);
        continue;
      }
    }

    const userId = authData.user.id;

    // The database trigger MIGHT automatically create the public.users record. Let's try to upsert to be safe.
    await supabase.from('users').upsert({
      id: userId,
      email: t.email,
      full_name: t.name,
      city: t.city,
      role: 'tasker'
    });

    // Create Tasker Profile
    const { data: taskerData, error: taskerError } = await supabase.from('taskers').insert({
      user_id: userId,
      city: t.city,
      skills: [t.service],
      hourly_rate: t.rate,
      status: 'active',
      rating: t.rating,
      total_reviews: Math.floor(Math.random() * 50) + 1,
      bio: `Professional ${t.service} with years of experience in ${t.city}.`
    }).select('id, user_id').single();

    if (taskerError) console.error("Tasker Insert Error:", taskerError);
    else createdTaskers.push(taskerData);
  }

  // 2. Create Customers
  for (const c of mockCustomers) {
    console.log(`Creating customer: ${c.name}...`);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: c.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: c.name, role: 'customer' }
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log(`Customer ${c.email} already exists.`);
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === c.email);
        if(existingUser) createdCustomers.push({ id: existingUser.id });
        continue;
      } else {
        console.error("Auth Error:", authError);
        continue;
      }
    }

    const userId = authData.user.id;
    await supabase.from('users').upsert({
      id: userId,
      email: c.email,
      full_name: c.name,
      city: c.city,
      role: 'customer'
    });
    
    createdCustomers.push({ id: userId });
  }

  // 3. Create Job Posts
  if (createdCustomers.length > 0) {
    console.log("Creating open job posts...");
    const jobPosts = [
      { customer_id: createdCustomers[0].id, service: 'plumbing', city: 'Kathmandu', description: 'Need pipe fixing asap', budget: 1000, status: 'open' },
      { customer_id: createdCustomers[1].id, service: 'cleaning', city: 'Pokhara', description: 'Deep clean for 3 BHK', budget: 3000, status: 'open' },
      { customer_id: createdCustomers[2].id, service: 'electrical', city: 'Lalitpur', description: 'Install ceiling fan', budget: null, status: 'open' },
    ];
    
    const { error: jobError } = await supabase.from('job_posts').insert(jobPosts);
    if (jobError) console.error("Job Post Error:", jobError);
    else console.log("Job posts created.");
  }

  console.log("✅ Seeding completed successfully!");
  console.log("You can log in with any of these emails and 'Password123!'");
}

seed().catch(console.error);
