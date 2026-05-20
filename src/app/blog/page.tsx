import Link from "next/link";
import { Metadata } from "next";
import PageHeader from "@/components/navigation/PageHeader";

export const metadata: Metadata = {
  title: "SewaKhoj Blog | Nepal Home Service Guides & Tips",
  description: "Expert guides on plumbers, electricians, cleaners, and home services in Nepal. Get pricing, tips, and trustworthy advice for Kathmandu and beyond.",
  alternates: {
    canonical: 'https://sewakhoj.com/blog',
  },
  openGraph: {
    title: "SewaKhoj Blog | Nepal Home Service Guides & Tips",
    description: "Expert guides on plumbers, electricians, cleaners, and home services in Nepal.",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "SewaKhoj Blog" }],
  },
};

const posts = [
  {
    slug: "plumber-kathmandu-cost",
    title: "Plumber in Kathmandu: Cost Guide 2026 (with Price List)",
    excerpt: "Complete pricing guide for plumbing services in Kathmandu. From tap repairs to full bathroom installations, know what to expect before calling a plumber.",
    date: "2026-01-15",
    readTime: "6 min read",
    category: "Plumbing",
  },
  {
    slug: "home-cleaning-service-nepal",
    title: "Best Home Cleaning Services in Nepal — What to Expect",
    excerpt: "A comprehensive guide to professional home cleaning in Nepal. Learn about service types, pricing, and how to choose the right cleaner for your home.",
    date: "2026-02-03",
    readTime: "7 min read",
    category: "Cleaning",
  },
  {
    slug: "electrician-near-me-kathmandu",
    title: "How to Find a Trusted Electrician in Kathmandu",
    excerpt: "Your step-by-step guide to finding reliable electrical help in Kathmandu. Learn red flags, pricing, and when to call a professional.",
    date: "2026-02-20",
    readTime: "5 min read",
    category: "Electrical",
  },
  {
    slug: "home-services-app-nepal",
    title: "SewaKhoj: Nepal's First Service Marketplace Explained",
    excerpt: "Discover how SewaKhoj is revolutionizing home services in Nepal. Learn about verified taskers, transparent pricing, and instant booking.",
    date: "2026-03-10",
    readTime: "8 min read",
    category: "Platform",
  },
  {
    slug: "tasker-income-nepal",
    title: "How Much Can a Tasker Earn in Nepal? (Real Numbers)",
    excerpt: "Real earnings data from SewaKhoj taskers across Nepal. Understand income potential for plumbers, electricians, cleaners, and other skilled professionals.",
    date: "2026-04-05",
    readTime: "9 min read",
    category: "Earnings",
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white font-inter">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden bg-gray-50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sewakhoj-red/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <PageHeader
            title="Nepal Service Guides"
            description="Expert advice on finding trusted home service professionals"
            className="mb-6 [&_.title-wrapper]:hidden"
            relatedLinks={[
              { href: "/about", label: "About Us" },
              { href: "/services", label: "Service Catalog" },
            ]}
          />
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
            Nepal Service <span className="text-sewakhoj-red">Guides</span>
          </h1>
          <p className="text-xl text-gray-600 font-medium max-w-2xl">
            Expert advice on finding trusted plumbers, electricians, cleaners, and home service professionals in Kathmandu and across Nepal.
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-20 max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post) => (
            <article key={post.slug} className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all p-8 flex flex-col">
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-sewakhoj-red bg-red-50 px-3 py-1 rounded-full">
                  {post.category}
                </span>
                <h2 className="text-2xl font-black text-gray-900 mt-4 mb-3 group-hover:text-sewakhoj-red transition-colors">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">{post.excerpt}</p>
              </div>
              <div className="flex items-center justify-between text-[12px] text-gray-500">
                <span>{post.date}</span>
                <span>{post.readTime}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black text-gray-900 mb-4">Need a Service Professional?</h2>
          <p className="text-gray-600 mb-8">Get verified, skilled taskers for your home service needs.</p>
          <Link href="/services" className="inline-block px-10 py-4 bg-sewakhoj-red text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-red-700 transition-all">
            Browse Services
          </Link>
        </div>
      </section>
    </main>
  );
}
