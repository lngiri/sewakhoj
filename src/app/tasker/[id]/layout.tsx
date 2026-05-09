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
    
    return {
      title: `${name} - ${mainSkill} in ${tasker.city} | SewaKhoj`,
      description: tasker.bio || `Hire ${name}, a top-rated ${mainSkill} in ${tasker.city}. Verified professional with ${tasker.rating?.toFixed(1) || '5.0'} rating on SewaKhoj.`,
      openGraph: {
        title: `Hire ${name} - ${mainSkill} on SewaKhoj`,
        description: `Book ${name} for reliable ${mainSkill} services in ${tasker.city}. Fully verified and highly rated.`,
        url: `https://sewakhoj.com/tasker/${id}`,
        type: 'profile',
        images: user?.avatar_url ? [{ url: user.avatar_url, width: 400, height: 400 }] : [],
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
