-- 026_announcements_system.sql

-- Create Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- info, success, warning, danger
    is_active BOOLEAN DEFAULT true,
    target_role TEXT DEFAULT 'all', -- all, customer, tasker
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can read active announcements
CREATE POLICY "Public can read active announcements" 
ON announcements FOR SELECT 
USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Policies: Admin can manage all
CREATE POLICY "Admin can manage announcements" 
ON announcements FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'staff')
    )
);
