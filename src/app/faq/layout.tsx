import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SewaKhoj FAQ | Frequently Asked Questions",
  description: "Find answers to common questions about booking taskers, safety, payments, and how to become a service provider on SewaKhoj Nepal.",
  keywords: ["SewaKhoj FAQ", "Nepal home services help", "booking taskers Nepal", "service safety Nepal"]
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
