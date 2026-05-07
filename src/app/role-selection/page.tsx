"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  Briefcase,
  ArrowRight,
  Loader2,
  LogOut
} from "lucide-react";

interface UserRole {
  role: string;
}

export default function RoleSelectionPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const { data: roles, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) {
          console.error("Error fetching user roles:", error);
          router.push("/login");
          return;
        }

        if (!roles || roles.length === 0) {
          console.error("No roles found for user");
          router.push("/login");
          return;
        }

        const roleList = roles.map((r: UserRole) => r.role);
        setUserRoles(roleList);

        // If user has only one role, auto-redirect
        if (roleList.length === 1) {
          if (roleList[0] === "customer") {
            router.push("/dashboard");
          } else if (roleList[0] === "tasker") {
            router.push("/tasker");
          }
        }
      } catch (error) {
        console.error("Error in role selection:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUserRoles();
  }, [user, router]);

  const handleRoleSelect = async (role: string) => {
    if (role === "customer") {
      router.push("/dashboard");
    } else if (role === "tasker") {
      router.push("/tasker");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome Back!
          </h1>
          <p className="text-lg text-gray-600">
            You have access to multiple dashboards. Please select one to continue.
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Customer Card */}
          {userRoles.includes("customer") && (
            <button
              onClick={() => handleRoleSelect("customer")}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-left border-2 border-transparent hover:border-indigo-500"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300">
                  <User className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Customer Dashboard
              </h2>
              <p className="text-gray-600 mb-4">
                Book services, manage your bookings, and find the perfect tasker for your needs.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full">
                  Book Services
                </span>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full">
                  Track Bookings
                </span>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full">
                  View History
                </span>
              </div>
            </button>
          )}

          {/* Tasker Card */}
          {userRoles.includes("tasker") && (
            <button
              onClick={() => handleRoleSelect("tasker")}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-left border-2 border-transparent hover:border-emerald-500"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 transition-colors duration-300">
                  <Briefcase className="w-8 h-8 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Tasker Dashboard
              </h2>
              <p className="text-gray-600 mb-4">
                Manage your services, accept job requests, and grow your tasker business.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm rounded-full">
                  Manage Jobs
                </span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm rounded-full">
                  Update Profile
                </span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm rounded-full">
                  View Earnings
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Sign Out Button */}
        <div className="text-center">
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
