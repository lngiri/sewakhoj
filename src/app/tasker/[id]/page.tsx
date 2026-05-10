import { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import TaskerProfileClient from "./TaskerProfileClient";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getTasker(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("taskers")
    .select(`
      *,
      users (id, full_name, avatar_url)
    `)
    .eq("id", id)
    .single();
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const tasker = await getTasker(id);
  
  if (!tasker) return { title: "Tasker Not Found | SewaKhoj" };
  
  const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
  const name = user?.full_name || "Tasker";
  const skill = tasker.skills?.[0] || "Professional Service";
  
  return {
    title: `${name} | Verified ${skill} in ${tasker.city} | SewaKhoj`,
    description: `${name} is a top-rated ${skill} in ${tasker.city} with a ${tasker.rating} star rating. Book verified home services in Nepal through SewaKhoj.`,
    alternates: {
      canonical: `https://sewakhoj.com/tasker/${id}`,
    },
    openGraph: {
      title: `${name} - ${skill} in ${tasker.city}`,
      description: tasker.bio?.slice(0, 160) || `Book ${name} for ${skill} services in ${tasker.city}.`,
      images: [user?.avatar_url || '/logo.png'],
    }
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const tasker = await getTasker(id);

  if (!tasker) {
    notFound();
  }

  return <TaskerProfileClient params={params} initialTasker={tasker} />;
}
