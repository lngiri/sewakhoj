import { Metadata } from "next";
import DiasporaClient from "./DiasporaClient";

export const metadata: Metadata = {
  title: "Care from Afar | Book Home Services for Family in Nepal | SewaKhoj",
  description: "Living abroad? Book verified plumbers, cleaners, and electricians for your family back home in Nepal. Trusted service, photo updates, and easy coordination via WhatsApp.",
  alternates: {
    canonical: 'https://sewakhoj.com/diaspora',
  },
  openGraph: {
    title: "SewaKhoj Care from Afar - Support Your Family in Nepal from Anywhere",
    description: "The easiest way for Nepali expats to take care of home repairs and services for their parents and family in Nepal.",
    images: ['/logo.png'],
  }
};

export default function Page() {
  return <DiasporaClient />;
}
