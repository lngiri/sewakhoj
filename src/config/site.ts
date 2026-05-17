export const siteConfig = {
  name: "SewaKhoj",
  tagline: "Nepal's Trusted Service Marketplace",
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+977-9763650737",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "9763650737",
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@sewakhoj.com",
  address: process.env.NEXT_PUBLIC_OFFICE_ADDRESS || "Kathmandu, Nepal",
  socialFacebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://facebook.com/sewakhoj",
  commissionRate: 10,
  payoutSchedule: "Every Friday via eSewa",
  kycSLA: "2-3 business days",
  supportHours: "9AM - 6PM, Sunday to Friday",
};
