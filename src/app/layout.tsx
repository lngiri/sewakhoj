import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LocationProvider } from "@/context/LocationContext";
import TaskerLocationTracker from "@/components/TaskerLocationTracker";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "devanagari"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SewaKhoj - Find Trusted Local Services in Nepal | Plumber, Cleaning, Electrician",
  description:
    "Find trusted local services in Nepal. Book verified plumber in Kathmandu, cleaning service Nepal, electricians, and more. Safe, reliable, affordable home services.",
  keywords: [
    "plumber in Kathmandu",
    "cleaning service Nepal",
    "electrician Kathmandu",
    "home services Nepal",
    "trusted local services",
    "SewaKhoj",
    "plumber near me",
    "house cleaning Kathmandu",
    "repair services Nepal",
    "verified taskers Nepal",
  ],
  icons: {
    icon: "/logo.jpeg",
    apple: "/logo.jpeg",
  },
  openGraph: {
    title: "SewaKhoj - Find Trusted Local Services in Nepal",
    description:
      "Book verified plumber in Kathmandu, cleaning service Nepal, electricians, and more. Safe, reliable, affordable home services at SewaKhoj.",
    url: "https://sewakhoj.com",
    siteName: "SewaKhoj",
    images: [
      {
        url: "/logo.jpeg",
        width: 800,
        height: 800,
        alt: "SewaKhoj Logo",
      },
    ],
    locale: "en_NP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SewaKhoj - Find Trusted Local Services in Nepal",
    description:
      "Book verified plumber in Kathmandu, cleaning service Nepal, electricians, and more.",
    images: ["/logo.jpeg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: "SewaKhoj",
                  url: "https://sewakhoj.com",
                  logo: "https://sewakhoj.com/logo.jpeg",
                  description:
                    "Nepal's trusted platform for local services connecting customers with skilled taskers.",
                  sameAs: ["https://facebook.com/sewakhoj"],
                  contactPoint: {
                    "@type": "ContactPoint",
                    telephone: "+977-9812345678",
                    contactType: "customer service",
                    email: "hello@sewakhoj.com",
                  },
                },
                {
                  "@type": "LocalBusiness",
                  name: "SewaKhoj Services",
                  image: "https://sewakhoj.com/logo.jpeg",
                  description:
                    "Book verified taskers for home services, repairs, cleaning and more in Nepal.",
                  address: {
                    "@type": "PostalAddress",
                    streetAddress: "Kathmandu Valley",
                    addressLocality: "Kathmandu",
                    addressRegion: "Bagmati",
                    addressCountry: "NP",
                  },
                  telephone: "+977-9812345678",
                  priceRange: "$$",
                  areaServed: [
                    "Kathmandu",
                    "Lalitpur",
                    "Bhaktapur",
                    "Pokhara",
                  ],
                },
                {
                  "@type": "ItemList",
                  itemListElement: [
                    {
                      "@type": "SiteNavigationElement",
                      position: 1,
                      name: "Home",
                      url: "https://sewakhoj.com/",
                    },
                    {
                      "@type": "SiteNavigationElement",
                      position: 2,
                      name: "Services",
                      url: "https://sewakhoj.com/browse",
                    },
                    {
                      "@type": "SiteNavigationElement",
                      position: 3,
                      name: "About Us",
                      url: "https://sewakhoj.com/about",
                    },
                    {
                      "@type": "SiteNavigationElement",
                      position: 4,
                      name: "Contact",
                      url: "https://sewakhoj.com/contact",
                    },
                    {
                      "@type": "SiteNavigationElement",
                      position: 5,
                      name: "FAQ",
                      url: "https://sewakhoj.com/faq",
                    },
                  ],
                },
              ],
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-poppins">
        <AuthProvider>
          <LocationProvider>
            <TaskerLocationTracker />
            <Navbar />
            <div className="flex-1">{children}</div>
            <Footer />
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
