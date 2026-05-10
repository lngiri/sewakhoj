import { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "SewaKhoj - Find Trusted Local Services in Nepal | Plumber, Cleaning, Electrician",
  description: "Find trusted local services in Nepal. Book verified plumber in Kathmandu, cleaning service Nepal, electricians, and more. Safe, reliable, affordable home services.",
  alternates: {
    canonical: 'https://sewakhoj.com',
  },
  openGraph: {
    title: "SewaKhoj - Find Trusted Local Services in Nepal",
    description: "Book verified plumber in Kathmandu, cleaning service Nepal, electricians, and more. Safe, reliable, affordable home services at SewaKhoj.",
    url: "https://sewakhoj.com",
    siteName: "SewaKhoj",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 800,
        alt: "SewaKhoj Logo",
      },
    ],
    locale: "en_NP",
    type: "website",
  },
};

export default function Page() {
  return <HomeClient />;
}
