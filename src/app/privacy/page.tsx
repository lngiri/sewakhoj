import { Metadata } from "next";
import PrivacyClient from "./PrivacyClient";

export const metadata: Metadata = {
  title: "Privacy Policy | SewaKhoj",
  description: "Read SewaKhoj's privacy policy. We are committed to protecting your personal data in accordance with Nepal's Individual Privacy Act 2075 and global standards.",
  alternates: {
    canonical: 'https://sewakhoj.com/privacy',
  }
};

export default function Page() {
  return <PrivacyClient />;
}
