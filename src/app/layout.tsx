import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import TaskerLocationTracker from "@/components/TaskerLocationTracker";
import Navbar from "@/components/layout/Navbar";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "devanagari"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SewaKhoj - Find Trusted Local Services in Nepal | सेवा खोज",
  description:
    "Book verified taskers for home services, repairs, cleaning and more in Nepal. | घरेलु सेवा, मर्मत, सफाइ र अरूका लागि प्रमाणित साथीहरू बुक गर्नुहोस्।",
  icons: {
    icon: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
  openGraph: {
    title: "SewaKhoj - Find Trusted Local Services in Nepal",
    description: "Book verified taskers for home services, repairs, cleaning and more in Nepal.",
    url: 'https://sewakhoj.com',
    siteName: 'SewaKhoj',
    images: [
      {
        url: '/logo.jpeg',
        width: 800,
        height: 800,
        alt: 'SewaKhoj Logo',
      },
    ],
    locale: 'en_NP',
    type: 'website',
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
      className={`${poppins.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "SewaKhoj",
              "url": "https://sewakhoj.com",
              "logo": "https://sewakhoj.com/logo.jpeg",
              "description": "Nepal's trusted platform for local services connecting customers with skilled taskers.",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Kathmandu",
                "addressCountry": "NP"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+977-9800000000",
                "contactType": "customer service"
              }
            })
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
          <TaskerLocationTracker />
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
