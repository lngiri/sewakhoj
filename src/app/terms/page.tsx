import { Metadata } from "next";
import TermsClient from "./TermsClient";

export const metadata: Metadata = {
  title: "Terms of Service | SewaKhoj",
  description: "Read the Terms of Service for SewaKhoj. Understand the rules, responsibilities, and legal agreements for using our local service marketplace in Nepal.",
  alternates: {
    canonical: 'https://sewakhoj.com/terms',
  }
};

export default function Page() {
  return <TermsClient />;
}
