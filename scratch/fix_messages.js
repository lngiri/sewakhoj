
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMessagesTable() {
  console.log('Applying column fixes to messages table...');
  
  const sql = `
    ALTER TABLE public.messages 
    ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    ALTER TABLE public.messages 
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

    -- Also ensure RLS is updated to allow reading by receiver
    DROP POLICY IF EXISTS "Users can read messages of their bookings" ON public.messages;
    CREATE POLICY "Users can read messages of their bookings" ON public.messages
      FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
      );
  `;

  const { error } = await supabase.rpc('sql', { query: sql });
  
  if (error) {
    console.error('Error fixing messages table:', error);
  } else {
    console.log('Messages table fixed successfully!');
  }
}

fixMessagesTable();
