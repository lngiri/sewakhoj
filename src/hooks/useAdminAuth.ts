"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export type StaffRole = "super_admin" | "admin" | "support" | "finance" | "operations";

export const ALL_STAFF_ROLES: StaffRole[] = [
  "super_admin",
  "admin",
  "support",
  "finance",
  "operations",
];

export const SETTINGS_ROLES: StaffRole[] = ["super_admin", "admin"];
export const USER_MANAGEMENT_ROLES: StaffRole[] = ["super_admin", "admin", "support"];
export const FINANCE_ROLES: StaffRole[] = ["super_admin", "finance"];

/**
 * Check if a role is included in the allowed roles list.
 */
function isRoleAllowed(role: string, allowedRoles: StaffRole[]): boolean {
  return allowedRoles.includes(role as StaffRole);
}

interface AdminAuthResult {
  isAdmin: boolean;
  loading: boolean;
  role: StaffRole | null;
  hasAccess: boolean;
}

/**
 * Client-side admin auth hook.
 * Redirects to /login if not authenticated, or / if not a staff member.
 * Supports optional role-scoped guarding.
 *
 * @param requiredRoles - Optional array of allowed roles. If omitted, any staff role is accepted.
 * @returns { isAdmin: boolean, loading: boolean, role: StaffRole | null, hasAccess: boolean }
 */
export function useAdminAuth(requiredRoles?: StaffRole[]): AdminAuthResult {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

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
          .rpc('get_my_staff_role');

        if (!staffRole || staffRole.length === 0) {
          router.push("/");
          return;
        }

        const userRole = staffRole[0].role as StaffRole;
        setRole(userRole);
        setIsAdmin(true);

        // If specific roles are required, check access
        if (requiredRoles && requiredRoles.length > 0) {
          if (isRoleAllowed(userRole, requiredRoles)) {
            setHasAccess(true);
          } else {
            // User is staff but doesn't have the correct role
            setHasAccess(false);
          }
        } else {
          setHasAccess(true);
        }
      } catch (err) {
        console.error("Admin auth check failed:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router, requiredRoles?.join(",")]);

  return { isAdmin, loading, role, hasAccess };
}
