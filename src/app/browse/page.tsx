import { services as staticServices } from "@/data/services";
import { createClient } from "@supabase/supabase-js";
import BrowseClient from "./BrowseClient";
import { Metadata } from "next";

// Initialize a server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ 
    service?: string; 
    city?: string; 
    q?: string;
    minPrice?: string;
    maxPrice?: string;
    minRating?: string;
  }>;
}

// SEO Metadata
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { service, city, q } = await searchParams;
  
  let title = "Browse Verified Taskers in Nepal | SewaKhoj";
  const description = "Find and book verified professionals for plumbing, cleaning, electrical, and more in Nepal. Real-time availability and transparent pricing.";

  if (service) {
    const sName = staticServices.find(s => s.id === service)?.nameEn || service;
    title = `Verified ${sName} Professionals in ${city || 'Nepal'} | SewaKhoj`;
  } else if (q) {
    title = `Search results for "${q}" | SewaKhoj`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: "https://sewakhoj.com/browse",
    }
  };
}

export default async function BrowsePage({ searchParams }: Props) {
  const params = await searchParams;
  
  // 1. Fetch initial taskers (Server-side)
  let query = supabaseServer
    .from("taskers")
    .select(`
      id, hourly_rate, city, rating, status, bio, skills, is_featured,
      users!inner (id, full_name, phone, avatar_url)
    `)
    .eq("status", "active");

  if (params.city) query = query.eq("city", params.city.toLowerCase());
  if (params.service) query = query.contains("skills", [params.service]);
  if (params.minPrice) query = query.gte("hourly_rate", parseInt(params.minPrice));
  if (params.maxPrice) query = query.lte("hourly_rate", parseInt(params.maxPrice));
  if (params.minRating) query = query.gte("rating", parseFloat(params.minRating));

  const { data: taskersData } = await query;
  let taskers = (taskersData || []) as any[];

  // Basic filtering for de-activated users (simplified for now)
  taskers = taskers.filter(t => {
    const u = Array.isArray(t.users) ? t.users[0] : t.users;
    return !!u;
  });

  // 2. Fetch services for the client
  const { data: dbServices } = await supabaseServer.from('services').select('*');
  const allServices = (dbServices && dbServices.length > 0) ? dbServices : staticServices;

  return (
    <BrowseClient 
      initialTaskers={taskers} 
      initialServices={allServices} 
    />
  );
}
