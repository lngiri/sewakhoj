# SewaKhoj Critical Fixes Task List

## Task 1: Homepage Stats & Sections
- [x] Remove fake stats section (500+ Taskers, 10,000+ Services, 4.8 Rating)
- [x] Replace with "Now Launching" banner
- [x] Hide "Featured Taskers" section if < 3 taskers
- [x] Remove fake testimonials (Ramesh Sharma, Pooja Karki, Sunil Shrestha)
- [x] Hide entire "Featured Taskers" section when no taskers exist (was showing "coming soon" empty state)

## Task 1b: FAQ & Contact Integrity Fixes (2026-05-15)
- [x] FAQ WhatsApp button — already uses real number via useSiteSettings fallback (9779763650737)
- [x] FAQ footer support phone — already uses real number via useSiteSettings
- [x] FAQ floating WhatsApp button — already uses real number via useSiteSettings
- [x] FAQ email: support@sewakhoj.com → hello@sewakhoj.com (standardized)
- [x] Homepage nav: Added About and FAQ links (was missing — only 4 items, now 6)
- [x] OG image ratio: 800×800 → 1200×630 in layout.tsx and faq/layout.tsx
- [x] "Dedicated safety team" overclaim removed from HomeClient FAQ + JSON-LD → "We respond within 24 hours"
- [x] "Featured Taskers coming soon" empty state section hidden entirely when no taskers
- [x] JSON-LD schemas verified: LocalBusiness + FAQPage present in layout.tsx, FAQPage in FAQClient.tsx
- [x] Build verified: zero errors, all 64 pages compiled

## Task 2: Browse Page Empty State
- [x] Add empty state component for /browse when no taskers
- [x] Icon, "No taskers available in your area yet"
- [x] "Be the first to join — we're growing fast!"
- [x] "Become a Tasker" button linking to /tasker/onboard

## Task 3: Tasker Onboarding Landing Page
- [x] Create public-facing /tasker/onboard landing page (no auth required)
- [x] Benefits: earnings, flexibility, verification badge
- [x] 3-step onboarding process
- [x] "Get Started" CTA leading to auth flow

## Task 4: Service Pages (/services/[slug])
- [x] Build template for all 12 services
- [x] Hero with service name, icon, description
- [x] Sub-services list with icons
- [x] How it works (3 steps)
- [x] Pricing guide: "Starting from NPR X"
- [x] FAQ section (4-5 questions)
- [x] CTA to browse taskers
- [x] Services: plumbing, cleaning, electrical, moving, tutoring, cooking, painting, gardening, tech-help, driver, caretaking, pet-care

## Task 5: Navigation Menu Consistency
- [x] Sync desktop/mobile nav: Home, Services, Find a Pro, About, FAQ, Contact
- [x] Remove "Privacy" from mobile nav
- [x] Add "FAQ" to mobile nav
- [x] Remove "Install App" button until published

## Task 6: Contact Information Audit
- [x] Replace +9779812345678 with +9779763650737 everywhere
- [x] Standardize to hello@sewakhoj.com everywhere
- [x] Update footer copyright year
- [x] Fix /privacy#cookies links

## Task 7: Structured Data JSON-LD
- [x] Homepage: LocalBusiness schema with all 12 services
- [x] /faq: FAQPage schema with all Q&A pairs
- [x] Each /services/[slug]: Service schema

## Task 8: Terms of Service Update
- [x] Change "Last updated: May 2024" to "Last updated: May 2026"
- [x] Add Cancellation & Refund Policy section
- [x] Add Liability Limitation clause

## Task 9: Privacy Policy Update
- [x] Remove GDPR/CCPA claims
- [x] Replace with Nepal IT Act 2063 compliance

## Task 10: Theme Color & Company Name Standardization
- [x] Standardize theme-color to #C8102E
- [x] Standardize footer to "SewaKhoj Technologies Pvt. Ltd."
- [x] Standardize OG image to logo.png

## Task 11: Support Claims Fix
- [x] Change "24/7 support" to "We respond within 24 hours"
- [x] Remove SOS feature claim if not functional

## Task 12: KYC Documentation & Commission Clarity
- [x] Create "Tasker Verification" page explaining KYC process
- [x] Clearly state commission model (90% to tasker, 10% platform)

## Task 13: Phone Number Standardization (FIXED)
- [x] Changed all instances of +9779812345678 to +9779763650737
- [x] Updated migrations: 006_seed_taskers.sql, 019_site_settings.sql, 027_api_integrations_manager.sql
- [x] Updated scratch/run_seed.js
- [x] Footer now displays consistent contact number

## Task 13: Real-time Messaging System (COMPLETE)
- [x] Add `read_at`, `receiver_id` columns to messages table
- [x] Mark messages as read when chat tab is opened
- [x] Add typing indicator via Supabase presence channel
- [x] Add unread message badge to navigation (NotificationCenter)

## Task 14: Payment Gateway Integration (DONE)
- [x] Create `payments` table for eSewa/Khalti transactions
- [x] Add triggers for payment completion
- [x] Build Edge Functions for payment verification

## Task 15: PostGIS Location System (DONE)
- [x] Enable PostGIS extension
- [x] Add `location` geography column to taskers table
- [x] Create `search_taskers_nearby()` function with ST_DWithin
- [x] Add district/ward fallback columns
- [x] Create TaskerLocationSelector component

## Task 16: Supabase Edge Functions (COMPLETE)
- [x] esewa-token-inquiry - Token API inquiry endpoint for eSewa
- [x] esewa-status-check - Status check endpoint for eSewa
- [x] khalti-verify - Khalti payment verification
- [x] send-push - Web Push notification sender

## Task 17: Push Notifications System (DONE)
- [x] Created push_subscriptions table migration
- [x] Add saveSubscription function in frontend
- [x] VAPID keys support via Supabase secrets

## Task 18: Payment Testing Tools (ADDED)
- [x] PaymentButton component for eSewa payments
- [x] PaymentStatusBadge component for displaying payment status
- [x] /payment/test page for easy payment testing

## Remaining Tasks (Need Manual Action)
- [ ] Test eSewa payment flow with EPAYTEST credentials in staging
  - Requires: Deploy app, visit /payment/test, use test wallet 9800000000/test1234/1111
- [ ] Configure VAPID keys for push notifications in Supabase
  - Generate keys: `npx web-push generate-vapid-keys`
  - Set in Supabase Dashboard → Settings → Secrets:
    - `VAPID_PUBLIC_KEY`
    - `VAPID_PRIVATE_KEY`
- [ ] Deploy Edge Functions to Supabase
  - Run: `supabase functions deploy esewa-token-inquiry`
  - Run: `supabase functions deploy esewa-status-check`
  - Run: `supabase functions deploy khalti-verify`
  - Run: `supabase functions deploy send-push`

## Task 19: Referral Reward System (COMPLETE)
- [x] Add referral_code and referred_by columns to users table
- [x] Create referrals table to track referral status
- [x] Create wallets and wallet_transactions tables (migration 043)
- [x] Add trigger to create wallet on user signup
- [x] Add trigger to process referral on join
- [x] Add trigger to award reward on first task completion (Rs 500 each)
- [x] Update ReferralTab with stats and sharing options
- [x] Capture referral code from URL in signup flow
- [ ] Apply migrations to database (run in Supabase SQL editor):
  - Execute: `supabase/migrations/043_referral_rewards.sql`
  - Execute: `supabase/migrations/043b_wallet_sync.sql`

## Task 20: Admin Dashboard Full Audit (COMPLETE)
- [x] Audit all admin dashboard files for errors and bugs
- [x] AdminDashboard.tsx — CLEAN (no errors)
- [x] admin/layout.tsx — CLEAN (no errors)
- [x] admin/page.tsx — CLEAN (no errors)
- [x] admin/taskers/page.tsx — CLEAN (no errors)
- [x] admin/users/page.tsx — CLEAN (no errors)
- [x] admin/finance/ — CLEAN (all files, both tabs)
- [x] admin/operations/ — CLEAN (all files)
- [x] admin/support/page.tsx — CLEAN (no errors)
- [x] admin/roles/page.tsx — CLEAN (no errors)
- [x] admin/full-access/page.tsx — CLEAN (no errors)
- [x] admin/marketing/ — CLEAN (all files, both tabs)
- [x] admin/settings/ — CLEAN (all files, all 4 tabs)
- [x] admin/live-map/ — CLEAN (all files)

**Minor observations (not errors):**
- Layout.tsx.bak — stale backup file, should be deleted
- Unused icon imports in EscrowTab, RevenueTab, PromoTab, AnnouncementsTab, FinancialTab, IntegrationsTab, CitiesTab (lint-level only)

## Task 21: Dashboard Home Navigation Fix (COMPLETE)
- [x] Make SewaKhoj logo in dashboard sidebar a clickable Link to "/"
- [x] Add "Back to Home" link at top of dashboard sidebar navigation
- [x] Build verified: no errors

## Task 22: City Names & Test Account Cleanup (COMPLETE)
- [x] Create migration 044 to capitalize city names in users + taskers tables
- [x] Remove "Live Pro" test account via migration
- [x] Fix seed files: scripts/seed.mjs, scratch/run_seed.js, scratch/run_seed_v2.js
- [x] Fix supabase/migrations/006b_seed_taskers.sql — all cities proper-cased
- [x] Build verified: no errors

## Task 23: Tasker-Specific OG & JSON-LD Schema (COMPLETE)
- [x] Fix OG description in tasker/[id]/layout.tsx — uses real rating/jobs/verified data
- [x] Fix OG description in tasker/[id]/page.tsx — uses real metrics, dynamic labels
- [x] OG image falls back to /logo.png when no avatar
- [x] Add tasker-specific LocalBusiness + FAQPage JSON-LD schema in tasker/[id]/page.tsx
- [x] Title "Verified" prefix only shows if id_verified is true
- [x] Build verified: no errors

## Task 24: About Page Stats Fix (COMPLETE)
- [x] Remove placeholder stats from siteStats.ts dependency
- [x] Replace with honest in-page values: "Growing Daily", "In Progress", etc.
- [x] Add descriptive subtext explaining early access phase to each stat card
- [x] Remove unused siteStats import from HomeClient.tsx
- [x] Build verified: no errors
