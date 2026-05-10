import { Metadata } from "next";
import SignupClient from "./SignupClient";

export const metadata: Metadata = {
  title: "Join SewaKhoj | Sign Up to Book Local Services in Nepal",
  description: "Create a SewaKhoj account today. Join thousands of users in Nepal booking verified plumbers, cleaners, and electricians with ease.",
  alternates: {
    canonical: 'https://sewakhoj.com/signup',
  }
};

export default function Page() {
  return <SignupClient />;
}
