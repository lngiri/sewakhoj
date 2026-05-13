# SewaKhoj Critical Fixes Task List

## Task 1: Homepage Stats & Sections
- [x] Remove fake stats section (500+ Taskers, 10,000+ Services, 4.8 Rating)
- [x] Replace with "Now Launching" banner
- [x] Hide "Featured Taskers" section if < 3 taskers
- [x] Remove fake testimonials (Ramesh Sharma, Pooja Karki, Sunil Shrestha)

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
- [x] Add unread message badge hook in Navbar

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