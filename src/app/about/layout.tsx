import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About SewaKhoj | Our Mission to Modernize Services in Nepal",
  description: "Learn about SewaKhoj's journey, our mission to empower local taskers, and our commitment to providing reliable home services across Nepal.",
  openGraph: {
    title: "About SewaKhoj - Modernizing Services in Nepal",
    description: "Discover how SewaKhoj is bridging the gap between skilled professionals and customers in Nepal.",
    images: [{ url: "/logo.jpeg" }]
  }
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
