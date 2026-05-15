"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Client-side admin auth hook.
 * Redirects to /login if not authenticated, or / if not a staff member.
 *
 * @returns { isAdmin: boolean, loading: boolean, role: string | null }
 */
export function useAdminAuth() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data: staffRole } = await supabase
          .from("staff_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (!staffRole) {
          router.push("/");
          return;
        }

        setRole(staffRole.role);
        setIsAdmin(true);
      } catch (err) {
        console.error("Admin auth check failed:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  return { isAdmin, loading, role };
}