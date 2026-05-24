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

function taskerSchema(tasker: any, user: any, id: string) {
  const name = user?.full_name || "Tasker";
  const skill = tasker.skills?.[0] || "Professional Service";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        name: name,
        description: tasker.bio || `${skill} professional serving ${tasker.city}`,
        image: user?.avatar_url || "https://sewakhoj.com/logo.png",
        url: `https://sewakhoj.com/tasker/${id}`,
        telephone: "+977-9763650737",
        priceRange: "Rs " + (tasker.hourly_rate || " negotiable"),
        address: {
          "@type": "PostalAddress",
          addressLocality: tasker.city,
          addressRegion: "Bagmati",
          addressCountry: "NP",
        },
        aggregateRating: tasker.rating ? {
          "@type": "AggregateRating",
          ratingValue: tasker.rating,
          reviewCount: tasker.total_reviews || 0,
          bestRating: "5",
        } : undefined,
        knowsAbout: tasker.skills || [skill],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `What services does ${name} offer?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `${name} specializes in ${(tasker.skills || [skill]).join(", ")} in ${tasker.city}. You can browse their profile and book directly through SewaKhoj.`,
            },
          },
          {
            "@type": "Question",
            name: `Is ${name} verified on SewaKhoj?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: tasker.id_verified
                ? `Yes, ${name} has completed SewaKhoj's ID verification process and is a trusted professional.`
                : `${name} is a registered professional on SewaKhoj. Verification status is displayed on their profile.`,
            },
          },
          {
            "@type": "Question",
            name: `How do I book ${name} for ${skill} in ${tasker.city}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `To book ${name} for ${skill} services in ${tasker.city}, visit their SewaKhoj profile, select a convenient time slot, and confirm your booking. You can also contact them directly through the platform.`,
            },
          },
        ],
      },
    ],
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const tasker = await getTasker(id);

  if (!tasker) return { title: "Tasker Not Found | SewaKhoj" };

  const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
  const name = user?.full_name || "Tasker";
  const skill = tasker.skills?.[0] || "Professional Service";
  const isVerified = tasker.id_verified;
  const ratingLabel = tasker.rating >= 4.5 ? 'top-rated' : tasker.rating >= 3.5 ? 'trusted' : 'experienced';
  const verifiedLabel = isVerified ? 'ID-verified' : 'background-checked';

  return {
    title: `${name} | ${isVerified ? 'Verified ' : ''}${skill} in ${tasker.city} | SewaKhoj`,
    description: `${name} is a ${ratingLabel} ${skill} in ${tasker.city} with ${tasker.total_jobs || 0} tasks completed and a ${tasker.rating} star rating. ${verifiedLabel} professional on SewaKhoj.`,
    alternates: {
      canonical: `https://sewakhoj.com/tasker/${id}`,
    },
    openGraph: {
      title: `${name} - ${skill} in ${tasker.city}`,
      description: tasker.bio?.slice(0, 160) || `${name} is a ${ratingLabel} ${skill} in ${tasker.city} with ${tasker.total_jobs || 0} tasks completed. ${verifiedLabel} professional.`,
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

  const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
  const schema = taskerSchema(tasker, user, id);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <TaskerProfileClient params={params} initialTasker={tasker} />
    </>
  );
}
