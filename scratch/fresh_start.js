const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manual .env.local parsing
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase URL or Service Role Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function freshStart() {
  console.log("🚀 Starting Smart Wipe for SewaKhoj...");

  try {
    // 1. Clear Transactional Tables
    console.log("🧹 Clearing bookings, logs, and notifications...");
    await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('system_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('favorites').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('commission_ledger').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Clear Tasker Profiles
    console.log("🧹 Clearing Tasker profiles...");
    await supabase.from('taskers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 3. Handle Users (Keep Admins, delete test customers)
    console.log("👤 Cleaning up non-admin users...");
    const { data: users, error: uErr } = await supabase.from('users').select('id, role, email');
    
    if (uErr) throw uErr;

    for (const user of users) {
      if (user.role === 'admin' || user.role === 'super_admin') {
        console.log(`✅ Keeping Admin: ${user.email}`);
        continue;
      }
      
      console.log(`🗑️ Deleting test user: ${user.email}`);
      const { error: authDelErr } = await supabase.auth.admin.deleteUser(user.id);
      if (authDelErr) console.error(`Failed to delete ${user.email} from auth:`, authDelErr.message);
    }

    console.log("\n✨ SewaKhoj is now FRESH and ready for testing!");
    console.log("Next Steps:");
    console.log("1. Sign up as a fresh user.");
    console.log("2. Use the 'Become a Tasker' button to test the new flow.");

  } catch (err) {
    console.error("❌ Smart Wipe failed:", err.message);
  }
}

freshStart();
