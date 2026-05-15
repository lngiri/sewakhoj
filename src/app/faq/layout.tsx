import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SewaKhoj FAQ | Frequently Asked Questions",
  description: "Find answers to common questions about booking taskers, safety, payments, and how to become a service provider on SewaKhoj Nepal.",
  keywords: ["SewaKhoj FAQ", "Nepal home services help", "booking taskers Nepal", "service safety Nepal"],
  openGraph: {
    title: "SewaKhoj FAQ | Frequently Asked Questions",
    description: "Find answers to common questions about booking taskers, safety, payments, and how to become a service provider on SewaKhoj Nepal.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "SewaKhoj Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SewaKhoj FAQ | Frequently Asked Questions",
    description: "Find answers to common questions about booking taskers, safety, payments, and how to become a service provider on SewaKhoj Nepal.",
    images: ["/logo.png"],
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
