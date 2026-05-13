import { supabase } from "./supabase-browser";

export async function auditLog(action: string, details: Record<string, unknown>, userId: string) {
  const { error } = await supabase.from('system_logs').insert({
    action_type: action,
    performed_by: userId,
    details: details,
    created_at: new Date().toISOString()
  });
  
  if (error) {
    console.error('Audit log failed:', error);
  }
}