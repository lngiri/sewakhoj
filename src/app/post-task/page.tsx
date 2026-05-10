import { Metadata } from "next";
import PostTaskClient from "./PostTaskClient";

export const metadata: Metadata = {
  title: "Post a Task | Find Verified Pros Instantly - SewaKhoj",
  description: "Need a job done? Post your task on SewaKhoj and get bids from verified plumbers, cleaners, and electricians in your city. Quick, safe, and reliable.",
  alternates: {
    canonical: 'https://sewakhoj.com/post-task',
  }
};

export default function Page() {
  return <PostTaskClient />;
}
