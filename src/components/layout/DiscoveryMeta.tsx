"use client";

import Script from "next/script";

export default function DiscoveryMeta() {
  const siteUrl = "https://sewakhoj.com";

  // 1. JSON-LD for WebSite & SearchAction
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SewaKhoj",
    "url": siteUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${siteUrl}/browse?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  // 2. JSON-LD for FAQ (Optimized for AI Answer Engines)
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I book a plumber in Kathmandu through SewaKhoj?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "To book a plumber in Kathmandu, simply browse the Plumbing category on SewaKhoj, select a verified tasker based on their ratings and reviews, choose your preferred time, and confirm your booking. Our taskers typically respond within minutes."
        }
      },
      {
        "@type": "Question",
        "name": "Are taskers on SewaKhoj background checked?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, SewaKhoj maintains a high-trust marketplace. All elite taskers undergo a 3-pillar verification process including ID verification, background checks, and gear certification before receiving their trust badges."
        }
      },
      {
        "@type": "Question",
        "name": "What services does SewaKhoj provide in Nepal?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "SewaKhoj offers a wide range of local services across Nepal, including plumbing, electrical work, professional house cleaning, appliance repair, pest control, and handyman tasks."
        }
      }
    ]
  };

  return (
    <>
      <Script
        id="website-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
