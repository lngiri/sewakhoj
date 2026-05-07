import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Taskers in Nepal | Plumbers, Electricians, Cleaners & More",
  description: "Find and book verified local service providers in Kathmandu, Pokhara, and across Nepal. Compare ratings, prices, and reviews for cleaners, plumbers, tutors, and more.",
  openGraph: {
    title: "Find Trusted Local Professionals on SewaKhoj",
    description: "Verified taskers ready to help with your home needs. Book in minutes.",
    images: [{ url: "/logo.jpeg" }]
  }
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
