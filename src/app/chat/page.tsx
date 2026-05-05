"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
// If a chat component exists, we can import it, but for now we render a placeholder.
// import ChatWidget from "@/components/chat/ChatWidget";

export default function ChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/chat");
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Live Support</h1>
          <p className="text-xs font-bold text-green-500 uppercase tracking-widest">Online</p>
        </div>
      </header>
      
      <main className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
          <MessageCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Welcome to Support</h2>
        <p className="text-gray-500 font-medium max-w-md">
          Our live chat support feature is currently being integrated into the main platform. 
          Please email us at <a href="mailto:support@sewakhoj.com" className="text-blue-500 font-bold hover:underline">support@sewakhoj.com</a> or call the emergency hotline in the meantime.
        </p>
        <Link href="/dashboard" className="mt-8 px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-sewakhoj-red transition-all shadow-lg active:scale-95">
          Return to Dashboard
        </Link>
      </main>
    </div>
  );
}
