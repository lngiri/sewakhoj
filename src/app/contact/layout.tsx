import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact SewaKhoj | Support & Inquiries",
  description: "Get in touch with SewaKhoj support. Reach us via WhatsApp, email, or our contact form for help with bookings, tasker partnerships, or general inquiries in Nepal.",
  openGraph: {
    title: "Contact SewaKhoj - We're Here to Help",
    description: "Need assistance with a local service? Contact our support team for quick help.",
    images: [{ url: "/logo.jpeg" }]
  }
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
