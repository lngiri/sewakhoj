import { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact SewaKhoj | 24/7 Support for Home Services in Nepal",
  description: "Get in touch with SewaKhoj for support, partnerships, or inquiries. We provide 24/7 assistance for all your home service needs in Kathmandu and across Nepal.",
  alternates: {
    canonical: 'https://sewakhoj.com/contact',
  }
};

export default function Page() {
  return <ContactClient />;
}
