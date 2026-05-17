/**
 * Centralized Admin Authorization Utility
 *
 * Provides consistent auth checks for all admin pages and API routes.
 * Uses the staff_roles table with the is_super_admin() SECURITY DEFINER function.
 *
 * Staff roles: super_admin, admin, support, finance, operations
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export type StaffRole = "super_admin" | "admin" | "support" | "finance" | "operations";

export interface AdminUser {
  userId: string;
  role: StaffRole;
  email?: string;
  fullName?: string;
}

/**
 * Check if the current user has any staff role.
 * Returns the AdminUser object or null.
 * Use in Server Components and API routes.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: staffRole } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!staffRole) return null;

  return {
    userId: user.id,
    role: staffRole.role as StaffRole,
    email: user.email,
    fullName: user.user_metadata?.full_name,
  };
}

/**
 * Require the current user to have a specific staff role.
 * Redirects to /login if not authenticated, or / if not authorized.
 * Use in Server Components (page.tsx files).
 *
 * @param requiredRoles - Array of allowed roles. If empty, any staff role is accepted.
 * @returns AdminUser object
 */
export async function requireAdmin(
  requiredRoles: StaffRole[] = []
): Promise<AdminUser> {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    redirect("/login");
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(adminUser.role)) {
    redirect("/");
  }

  return adminUser;
}

/**
 * Check if the current user is a super admin.
 * Uses the is_super_admin() SECURITY DEFINER function to avoid RLS recursion.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error) return false;
  return !!data;
}

/**
 * Require super admin access. Redirects if not super admin.
 */
export async function requireSuperAdmin(): Promise<AdminUser> {
  const adminUser = await requireAdmin();
  const superAdmin = await isSuperAdmin();

  if (!superAdmin) {
    redirect("/");
  }

  return adminUser;
}

/**
 * API route helper: validate admin access and return a 401/403 response if unauthorized.
 * Use in Route Handlers (route.ts files).
 *
 * @param requiredRoles - Array of allowed roles. If empty, any staff role is accepted.
 * @returns Either an AdminUser or a NextResponse error.
 */
export async function validateAdminApiAccess(
  requiredRoles: StaffRole[] = []
): Promise<AdminUser | NextResponse> {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(adminUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return adminUser;
}

/**
 * Client-side helper: check if a user has admin access.
 * Returns a boolean — use in client components for UI conditional rendering.
 *
 * @param supabase - Browser Supabase client instance
 */
export async function checkIsAdminClient(
  supabase: any
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: staffRole } = await supabase.rpc('get_my_staff_role');

  return !!(staffRole && staffRole.length > 0);
}

/**
 * All valid staff roles for validation.
 */
export const ALL_STAFF_ROLES: StaffRole[] = [
  "super_admin",
  "admin",
  "support",
  "finance",
  "operations",
];

/**
 * Roles that can manage sensitive settings (API keys, commission rates).
 */
export const SETTINGS_ROLES: StaffRole[] = ["super_admin", "admin"];

/**
 * Roles that can manage users and taskers.
 */
export const USER_MANAGEMENT_ROLES: StaffRole[] = [
  "super_admin",
  "admin",
  "support",
];

/**
 * Roles that can manage financial operations.
 */
export const FINANCE_ROLES: StaffRole[] = ["super_admin", "finance"];