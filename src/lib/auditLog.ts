import { supabase } from "./supabase-browser";

export async function auditLog(action: string, details: Record<string, unknown>, userId: string) {
  const { error } = await supabase.from('system_logs').insert({
    action_type: action,
    admin_id: userId,
    details: details
  });

  if (error) {
    console.error('Audit log failed:', error);
  }
}
