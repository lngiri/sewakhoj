import { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Login to SewaKhoj | Access Your Account",
  description: "Sign in to your SewaKhoj account to book home services, manage your tasks, and connect with verified professionals in Nepal.",
  alternates: {
    canonical: 'https://sewakhoj.com/login',
  }
};

export default function Page() {
  return <LoginClient />;
}
