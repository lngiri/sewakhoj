import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export function useAdminAuth() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    const role = user.user_metadata?.role;
    if (role === 'admin' || role === 'super_admin') {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    supabase.rpc('get_my_staff_role').then(({ data, error }: { data: { role: string }[] | null; error: unknown }) => {
      if (!error && data && data.length > 0) {
        const dbRole = data[0].role;
        setIsAdmin(
          dbRole === 'admin' ||
          dbRole === 'super_admin' ||
          dbRole === 'support' ||
          dbRole === 'finance'
        );
      }
      setLoading(false);
    });
  }, [user, authLoading]);

  return { isAdmin, loading: loading || authLoading };
}
