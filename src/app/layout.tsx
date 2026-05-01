import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "devanagari"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SewaKhoj - Find Trusted Local Services in Nepal | सेवा खोजी",
  description:
    "Book verified taskers for home services, repairs, cleaning and more in Nepal. | घरेलु सेवा, मर्मत, सफाइ र अरूका लागि प्रमाणित साथीहरू बुक गर्नुहोस्।",
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
      <body className="min-h-full flex flex-col font-poppins">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
