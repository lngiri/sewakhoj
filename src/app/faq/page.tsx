import { Metadata } from "next";
import FAQClient from "./FAQClient";

export const metadata: Metadata = {
  title: "Frequently Asked Questions (FAQ) | SewaKhoj",
  description: "Find answers to common questions about booking services, tasker verification, payments, and safety on SewaKhoj - Nepal's trusted service marketplace.",
  alternates: {
    canonical: 'https://sewakhoj.com/faq',
  }
};

export default function Page() {
  return <FAQClient />;
}
