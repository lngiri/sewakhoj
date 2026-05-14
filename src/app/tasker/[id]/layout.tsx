import { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; }
      }
    }
  );

  const { data: tasker } = await supabase
    .from("taskers")
    .select(`
      *,
      users (full_name, avatar_url)
    `)
    .eq("id", id)
    .single();

  if (tasker) {
    const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
    const name = user?.full_name || 'Professional Tasker';
    const mainSkill = tasker.skills?.[0] || 'Local Services';
    const isVerified = tasker.id_verified;
    const ratingLabel = tasker.rating >= 4.5 ? 'top-rated' : tasker.rating >= 3.5 ? 'trusted' : 'experienced';
    const verifiedLabel = isVerified ? 'ID-verified' : 'background-checked';
    
    return {
      title: `${name} - ${mainSkill} in ${tasker.city} | SewaKhoj`,
      description: tasker.bio || `Hire ${name}, a ${ratingLabel} ${mainSkill} in ${tasker.city}. ${verifiedLabel} professional with ${tasker.total_jobs || 0} tasks completed and a ${tasker.rating?.toFixed(1) || '5.0'} rating on SewaKhoj.`,
      openGraph: {
        title: `Hire ${name} - ${mainSkill} on SewaKhoj`,
        description: tasker.bio?.slice(0, 160) || `Book ${name} for ${mainSkill} services in ${tasker.city}. ${verifiedLabel} professional with ${tasker.total_jobs || 0} tasks completed and a ${tasker.rating?.toFixed(1) || '5.0'} star rating.`,
        url: `https://sewakhoj.com/tasker/${id}`,
        type: 'profile',
        images: user?.avatar_url ? [{ url: user.avatar_url, width: 400, height: 400 }] : [{ url: '/logo.png', width: 400, height: 400 }],
      }
    };
  }

  return {
    title: 'Tasker Profile | SewaKhoj',
    description: 'View professional tasker profiles on SewaKhoj.',
  };
}

export default function TaskerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
