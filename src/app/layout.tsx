import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LocationProvider } from "@/context/LocationContext";
import { NotificationProvider } from "@/context/NotificationContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

export const viewport: Viewport = {
  themeColor: "#C8102E",
};

export const metadata: Metadata = {
  metadataBase: new URL('https://sewakhoj.com'),
  title: "SewaKhoj - Find Trusted Local Services in Nepal | Plumber, Cleaning, Electrician",
  description:
    "Find trusted local services in Nepal. Book verified plumber in Kathmandu, cleaning service Nepal, electricians, and more. Safe, reliable, affordable home services.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: '',
  },
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
    icon: [
      { url: "/logo.png" },
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "SewaKhoj - Find Trusted Local Services in Nepal",
    description:
      "Book verified plumber in Kathmandu, cleaning service Nepal, electricians, and more. Safe, reliable, affordable home services at SewaKhoj.",
    siteName: "SewaKhoj",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
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
    images: ["/logo.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(sw){sw.unregister()})})` }} />
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
                  logo: "https://sewakhoj.com/logo.png",
                  description:
                    "Nepal's trusted platform for local services connecting customers with skilled taskers.",
                  sameAs: ["https://facebook.com/sewakhoj"],
                  contactPoint: {
                    "@type": "ContactPoint",
                    telephone: "+977-9763650737",
                    contactType: "customer service",
                    email: "hello@sewakhoj.com",
                  },
                },
                {
                  "@type": "LocalBusiness",
                  name: "SewaKhoj Services",
                  image: "https://sewakhoj.com/logo.png",
                  description:
                    "Book verified taskers for home services, repairs, cleaning and more in Nepal.",
                  address: {
                    "@type": "PostalAddress",
                    streetAddress: "Kathmandu Valley",
                    addressLocality: "Kathmandu",
                    addressRegion: "Bagmati",
                    addressCountry: "NP",
                  },
                  telephone: "+977-9763650737",
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
      </head>
      <body className="min-h-full flex flex-col font-poppins">
        <AuthProvider>
          <LocationProvider>
            <NotificationProvider>
              <Navbar />
              <div className="flex-1">{children}</div>
              <Analytics />
              <SpeedInsights />
              <Footer />
            </NotificationProvider>
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
