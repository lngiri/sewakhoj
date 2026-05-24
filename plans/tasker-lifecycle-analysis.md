# SewaKhoj Tasker Lifecycle — Comprehensive Deep-Dive Analysis

> **Date:** 2026-05-15
> **Scope:** End-to-end tasker journey — sign-up through ongoing fulfillment, payment settlement, and re-engagement
> **Methodology:** Cross-referenced all 45+ migration files against application code (onboarding, booking, dashboard, chat, payments, admin, edge functions)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Consolidated Data Model Overview](#2-consolidated-data-model-overview)
3. [Dimension 1: Tasker Onboarding & Identity](#3-dimension-1-tasker-onboarding--identity)
4. [Dimension 2: Service Configuration & Portfolio](#4-dimension-2-service-configuration--portfolio)
5. [Dimension 3: Discovery & Matching](#5-dimension-3-discovery--matching)
6. [Dimension 4: Booking & Scheduling](#6-dimension-4-booking--scheduling)
7. [Dimension 5: Communication & Coordination](#7-dimension-5-communication--coordination)
8. [Dimension 6: Job Execution & Tracking](#8-dimension-6-job-execution--tracking)
9. [Dimension 7: Payments & Financial Flow](#9-dimension-7-payments--financial-flow)
10. [Dimension 8: Rating, Review & Reputation](#10-dimension-8-rating-review--reputation)
11. [Dimension 9: Post-Job & Re-engagement](#11-dimension-9-post-job--re-engagement)
12. [Dimension 10: Admin & Operational Controls](#12-dimension-10-admin--operational-controls)
13. [Cross-Cutting Concerns](#13-cross-cutting-concerns)
14. [Prioritized Recommendations](#14-prioritized-recommendations)

---

## 1. Executive Summary

The SewaKhoj platform has built a **remarkably comprehensive data model** spanning 29 tables with well-considered relationships, RLS policies, realtime subscriptions, and financial ledgering. The tasker lifecycle is supported from initial phone-OTP signup through KYC verification, service configuration, discovery, booking, execution, payment settlement, and re-engagement.

**Overall Assessment:** The platform is architecturally sound but exhibits **significant gaps between schema capability and application implementation**. Many powerful database features (PostGIS proximity search, trust scores, reliability metrics, push notifications, abandoned booking recovery) exist in the schema but are either partially implemented or entirely unused in the application layer. The onboarding flow is the most polished area; the post-booking financial settlement and re-engagement loops are the weakest.

**Key Strengths:**
- Comprehensive RLS security model with staff role hierarchy
- Dual-role support (user can be both customer and tasker)
- Real-time infrastructure for messages, notifications, and location tracking
- Proper commission ledger with receivable/payable double-entry pattern
- KYC verification with document upload and admin approval workflow
- Marketplace bidding system for custom tasks

**Critical Gaps:**
- No tasker payout/disbursement mechanism exists
- Push notifications are scaffolded but non-functional (no web-push library)
- PostGIS `search_taskers_nearby()` function exists but is never called from application code
- Trust score column exists but has no computation logic
- No re-engagement automation (no email/SMS for dormant taskers)
- Booking conflict detection is client-side only (race condition prone)
- No escrow release automation — requires manual admin intervention

---

## 2. Consolidated Data Model Overview

### Entity-Relationship Diagram (Textual)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         AUTH SYSTEM (Supabase)                        │
│  auth.users ─── trigger ──→ public.users (handle_new_user)           │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             ┌──────────┐   ┌───────────┐   ┌──────────────┐
             │  users   │   │ staff_roles│   │  user_roles  │
             │──────────│   │───────────│   │──────────────│
             │ id (PK)  │◄──│ user_id   │   │ user_id (FK) │
             │ email    │   │ role      │   │ role         │
             │ phone    │   └───────────┘   └──────────────┘
             │ full_name│
             │ role     │◄──────────────────────────────────┐
             │ city     │                                    │
             │ area     │   ┌──────────────┐                │
             │ avatar   │   │   taskers    │                │
             │ account  │   │──────────────│                │
             │ _status  │   │ id (PK)      │                │
             │ wallet   │   │ user_id (FK) │───────────────►│
             │ _balance │   │ status       │                │
             │ referral │   │ city, area   │                │
             │ _code    │   │ skills[]     │                │
             └──────────┘   │ hourly_rate  │                │
                            │ bio          │                │
                            │ rating       │                │
                            │ total_jobs   │                │
                            │ transport    │                │
                            │ id_verified  │                │
                            │ is_featured  │                │
                            │ trust_score  │                │
                            │ is_elite     │                │
                            │ completion   │                │
                            │ _count       │                │
                            │ average      │                │
                            │ _rating      │                │
                            │ response     │                │
                            │ _time_avg    │                │
                            │ location     │                │
                            │ (PostGIS)    │                │
                            │ district     │                │
                            │ experience   │                │
                            └──────┬───────┘                │
                                   │                        │
         ┌────────────┬────────────┼────────────┬──────────┘
         ▼            ▼            ▼            ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ tasker   │ │ profile  │ │ favorites│ │ tasker   │
   │ _kyc     │ │ _views   │ │          │ │ _locations│
   │──────────│ │──────────│ │──────────│ │──────────│
   │ tasker   │ │ tasker   │ │ user_id  │ │ tasker   │
   │ _id (FK) │ │ _id (FK) │ │ tasker   │ │ _id (FK) │
   │ doc_type │ │ viewer   │ │ _id (FK) │ │ lat, lng │
   │ doc_url  │ │ _id (FK) │ └──────────┘ │ accuracy │
   │ verified │ │ viewed   │              │ (Realtime)│
   └──────────┘ │ _at      │              └──────────┘
                └──────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        BOOKING & EXECUTION                            │
│                                                                       │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐          │
│  │  bookings    │────►│   messages   │     │   reviews    │          │
│  │──────────────│     │──────────────│     │──────────────│          │
│  │ id (PK)      │     │ id (PK)      │     │ id (PK)      │          │
│  │ customer_id  │     │ booking_id   │     │ booking_id   │          │
│  │ tasker_id    │     │ sender_id    │     │ reviewer_id  │          │
│  │ service      │     │ text         │     │ tasker_id    │          │
│  │ total_price  │     │ created_at   │     │ rating       │          │
│  │ status       │     │ (Realtime)   │     │ comment      │          │
│  │ payment      │     └──────────────┘     └──────────────┘          │
│  │ _status      │                                                     │
│  │ scheduled    │     ┌──────────────┐     ┌──────────────┐          │
│  │ _date/time   │     │ booking_logs │     │  disputes    │          │
│  │ address      │     │──────────────│     │──────────────│          │
│  │ is_draft     │     │ booking_id   │     │ booking_id   │          │
│  │ is_disputed  │     │ old_status   │     │ reporter_id  │          │
│  │ is_family    │     │ new_status   │     │ reason       │          │
│  │ _booking     │     │ actor_id     │     │ status       │          │
│  └──────┬───────┘     └──────────────┘     └──────────────┘          │
│         │                                                            │
└─────────┼────────────────────────────────────────────────────────────┘
          │
┌─────────┼────────────────────────────────────────────────────────────┐
│                      FINANCIAL SYSTEM                                  │
│                                                                       │
│  ┌──────────────────┐    ┌──────────────────┐                        │
│  │ commission_ledger│    │ platform_settings│                        │
│  │──────────────────│    │──────────────────│                        │
│  │ id (PK)          │    │ id (PK)          │                        │
│  │ booking_id (FK)  │    │ commission_rate  │                        │
│  │ tasker_id (FK)   │    │ _percentage      │                        │
│  │ total_amount     │    └──────────────────┘                        │
│  │ commission_amt   │                                                 │
│  │ type (receivable │    ┌──────────────────┐                        │
│  │  /payable)       │    │    payments      │                        │
│  │ payment_method   │    │──────────────────│                        │
│  │ status           │    │ id (PK)          │                        │
│  └──────────────────┘    │ booking_id (FK)  │                        │
│                          │ amount           │                        │
│  ┌──────────────────┐    │ method           │                        │
│  │     wallets      │    │ gateway_reference│                        │
│  │──────────────────│    │ status           │                        │
│  │ id (PK)          │    └──────────────────┘                        │
│  │ user_id (FK)     │                                                 │
│  │ balance          │    ┌──────────────────┐                        │
│  └──────┬───────────┘    │ wallet_transactions                      │
│         │                │──────────────────│                        │
│         └───────────────►│ wallet_id (FK)   │                        │
│                          │ amount           │                        │
│                          │ type             │                        │
│                          └──────────────────┘                        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    MARKETPLACE & OPERATIONS                            │
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │ market_tasks │    │  task_bids   │    │  services    │           │
│  │──────────────│    │──────────────│    │──────────────│           │
│  │ id (PK)      │    │ id (PK)      │    │ id (PK)      │           │
│  │ customer_id  │    │ task_id (FK) │    │ name         │           │
│  │ title        │    │ tasker_id    │    │ name_ne      │           │
│  │ description  │    │ amount       │    │ description  │           │
│  │ category_id  │    │ message      │    │ icon         │           │
│  │ budget_amt   │    │ status       │    │ base_price   │           │
│  │ location     │    └──────────────┘    │ slug (UNIQUE)│           │
│  │ status       │                        └──────────────┘           │
│  └──────────────┘                                                     │
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │  referrals   │    │  promo_codes │    │ announcements│           │
│  │──────────────│    │──────────────│    │──────────────│           │
│  │ referrer_id  │    │ code         │    │ title        │           │
│  │ referred_id  │    │ discount_%   │    │ message      │           │
│  │ status       │    │ max_uses     │    │ type         │           │
│  │ reward       │    │ current_uses │    │ target_role  │           │
│  │ _claimed     │    │ is_active    │    │ is_active    │           │
│  └──────────────┘    └──────────────┘    └──────────────┘           │
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │ system_logs  │    │  cities      │    │ site_settings│           │
│  │──────────────│    │──────────────│    │──────────────│           │
│  │ action_type  │    │ name         │    │ id (PK)      │           │
│  │ performed_by │    │ name_np      │    │ value        │           │
│  │ details JSONB│    │ is_active    │    │ description  │           │
│  │ target_id    │    └──────────────┘    └──────────────┘           │
│  └──────────────┘                                                     │
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐                                │
│  │ push_subscrip│    │ api_integrat │                                │
│  │──────────────│    │──────────────│                                │
│  │ user_id (FK) │    │ service_name │                                │
│  │ endpoint     │    │ api_key      │                                │
│  │ p256dh       │    │ api_secret   │                                │
│  │ auth         │    │ is_enabled   │                                │
│  └──────────────┘    │ config JSONB │                                │
│                      └──────────────┘                                │
└──────────────────────────────────────────────────────────────────────┘
```

### Table Inventory with Roles in Tasker Lifecycle

| # | Table | Primary Key | Key Foreign Keys | Role in Tasker Lifecycle |
|---|-------|-------------|------------------|--------------------------|
| 1 | `users` | `id` (UUID) | — | Core identity; shared by customers and taskers |
| 2 | `taskers` | `id` (UUID) | `user_id` → `users.id` | Tasker profile, skills, metrics, verification status |
| 3 | `services` | `id` (UUID) | — | Service categories taskers can offer |
| 4 | `bookings` | `id` (UUID) | `customer_id` → `users`, `tasker_id` → `taskers` | The core transaction record |
| 5 | `reviews` | `id` (UUID) | `booking_id` → `bookings`, `tasker_id` → `taskers` | Post-job rating and feedback |
| 6 | `messages` | `id` (UUID) | `booking_id` → `bookings`, `sender_id` → `users` | Real-time chat between customer and tasker |
| 7 | `notifications` | `id` (UUID) | `user_id` → `users` | In-app alerts for booking updates, KYC status |
| 8 | `commission_ledger` | `id` (UUID) | `booking_id` → `bookings`, `tasker_id` → `taskers` | Financial tracking of platform fees |
| 9 | `platform_settings` | `id` (UUID) | — | Global commission rate configuration |
| 10 | `site_settings` | `id` (TEXT) | — | No-code business rules (commission, tracking, etc.) |
| 11 | `staff_roles` | `user_id` (UUID) | `user_id` → `users` | Admin role hierarchy for KYC, disputes, finance |
| 12 | `user_roles` | `user_id` (UUID) | `user_id` → `users` | Dual-role support (customer + tasker) |
| 13 | `tasker_kyc` | `id` (UUID) | `tasker_id` → `taskers` | Document uploads for identity verification |
| 14 | `cities` | `id` (UUID) | — | Serviceable city list |
| 15 | `promo_codes` | `id` (UUID) | — | Discount campaigns for bookings |
| 16 | `disputes` | `id` (UUID) | `booking_id` → `bookings` | Formal dispute resolution |
| 17 | `booking_logs` | `id` (UUID) | `booking_id` → `bookings` | Audit trail of booking status changes |
| 18 | `system_logs` | `id` (UUID) | `performed_by` → `users` | Platform-wide audit logging |
| 19 | `favorites` | `id` (UUID) | `user_id` → `users`, `tasker_id` → `taskers` | Customer bookmarks for re-booking |
| 20 | `profile_views` | `id` (UUID) | `tasker_id` → `taskers` | Discovery analytics |
| 21 | `market_tasks` | `id` (UUID) | `customer_id` → `users` | Custom task marketplace |
| 22 | `task_bids` | `id` (UUID) | `task_id` → `market_tasks`, `tasker_id` → `taskers` | Bidding on custom tasks |
| 23 | `tasker_locations` | `tasker_id` (UUID) | `tasker_id` → `users` | Live GPS tracking (realtime) |
| 24 | `push_subscriptions` | `id` (UUID) | `user_id` → `users` | Web push notification tokens |
| 25 | `announcements` | `id` (UUID) | `created_by` → `users` | Platform-wide banners |
| 26 | `api_integrations` | `id` (UUID) | — | External API key management |
| 27 | `referrals` | `id` (UUID) | `referrer_id` → `users`, `referred_id` → `users` | Referral reward tracking |
| 28 | `wallets` | `id` (UUID) | `user_id` → `users` | User wallet balances |
| 29 | `wallet_transactions` | `id` (UUID) | `wallet_id` → `wallets` | Wallet transaction history |

---

## 3. Dimension 1: Tasker Onboarding & Identity

### Flow Overview

```
Landing Page → Phone OTP Signup → Onboard Form (6 steps) → KYC Upload → Admin Review → Approval/Rejection → Welcome Page
```

### Schema Support

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `users` | `phone`, `role`, `full_name`, `city`, `area` | Core identity created at signup |
| `taskers` | `status` (pending/active/inactive/suspended), `id_verified`, `is_background_checked`, `is_gear_certified`, `rejection_reason` | Verification state machine |
| `tasker_kyc` | `doc_type`, `doc_url`, `verified`, `verified_at`, `verified_by` | Document-level verification tracking |
| `user_roles` | `user_id`, `role` | Dual-role assignment |

### Application Implementation

**Signup Flow** ([`src/app/signup/SignupClient.tsx`](src/app/signup/SignupClient.tsx)):
- Phone OTP via Supabase Auth (`signInWithOtp` / `verifyOtp`)
- Google OAuth and email/password also supported
- After auth, user is inserted into `public.users` via the `handle_new_user()` trigger ([`003_add_user_trigger.sql`](supabase/migrations/003_add_user_trigger.sql))

**Onboarding Form** ([`src/app/tasker/onboard/page.tsx`](src/app/tasker/onboard/page.tsx)):
- 6-step wizard: Personal Info → Skills → Availability → Documents → Pricing → Review
- Profile strength calculator (client-side only)
- File upload with XHR progress tracking to Supabase Storage
- Skills selection from static `services` data
- Availability grid (7 days × 3 slots: morning/afternoon/evening)
- Bulk availability presets (all/none/weekdays/weekends)

**Admin Approval** ([`src/app/admin/taskers/page.tsx`](src/app/admin/taskers/page.tsx)):
- Three verification pillars: ID, Background, Gear
- Approve/Reject with reason
- SMS nudge capability
- Edge function [`approve-tasker`](supabase/functions/approve-tasker/index.ts) sends SMS via Sparrow SMS

### Strengths

1. **Multi-pillar verification**: The three-pillar system (ID/Background/Gear) provides granular control over what constitutes "verified"
2. **Rejection feedback**: `rejection_reason` column stores specific feedback for rejected taskers
3. **Profile strength**: Client-side calculator gives immediate feedback during onboarding
4. **File upload progress**: XHR-based progress tracking provides good UX during document upload
5. **Dual-role support**: `user_roles` table allows users to be both customer and tasker without separate accounts

### Critical Issues

#### 3.1 No Phone Uniqueness Enforcement
**Severity: P0 — Security/Data Integrity**

The `users` table has no unique constraint on `phone`. A single phone number can create multiple accounts. The signup flow checks if a user exists by phone but this is a client-side check, not a database constraint. This means:
- Race conditions can create duplicate accounts
- No way to prevent phone reuse for fraud

**Fix:** Add `UNIQUE` constraint on `users.phone`:
```sql
ALTER TABLE public.users ADD CONSTRAINT users_phone_unique UNIQUE (phone);
```

#### 3.2 Onboarding Form Has No Server-Side Validation
**Severity: P1 — Data Quality**

All 6 steps of the onboarding form validate only on the client. A determined user could bypass validation and submit incomplete or malformed data directly to Supabase. The `taskers` table has no `CHECK` constraints on skills arrays, hourly rates, or availability JSON.

**Fix:** Add database-level constraints and a server-side validation API route.

#### 3.3 KYC Document Storage Has No Retention Policy
**Severity: P2 — Compliance**

KYC documents are uploaded to Supabase Storage but there's no:
- Automatic deletion policy for rejected applications
- Expiration on verified documents (KYC should be re-verified periodically)
- Audit trail of who viewed/downloaded documents

#### 3.4 No Email Verification in Onboarding
**Severity: P2 — Trust**

The onboarding flow relies entirely on phone OTP. While phone verification is strong, email verification adds a second factor and enables email-based re-engagement. The `handle_new_user()` trigger creates users with unverified emails.

#### 3.5 Onboarding Abandonment Not Tracked
**Severity: P2 — Growth**

There's no mechanism to detect or recover users who start but abandon the 6-step onboarding. No `onboarding_step` column exists on `taskers` to track partial progress. The `is_draft`/`last_step_completed` pattern used for bookings could be applied here.

#### 3.6 SMS Costs Not Monitored
**Severity: P3 — Operations**

The `approve-tasker` edge function sends SMS via Sparrow SMS but there's no:
- Rate limiting on SMS sends
- Cost tracking per SMS
- Balance monitoring or alerting when credits run low

---

## 4. Dimension 2: Service Configuration & Portfolio

### Flow Overview

```
Onboarding Skills Selection → Tasker Profile → Dashboard Profile Edit → Service Page Display
```

### Schema Support

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `taskers` | `skills` (TEXT[]), `hourly_rate`, `bio`, `experience`, `service_radius`, `availability_hours` | Core service offering |
| `services` | `name`, `name_ne`, `description`, `description_ne`, `icon`, `base_price`, `slug` | Service catalog |

### Application Implementation

**Skills Selection** ([`src/app/tasker/onboard/page.tsx`](src/app/tasker/onboard/page.tsx), lines 802-854):
- Taskers select from static `services` data
- Each skill can have a proficiency level (Beginner/Intermediate/Expert)
- Skills stored as TEXT[] array on `taskers.skills`

**Profile Editing** ([`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx), lines 1386-1708):
- Tabbed profile editor (Personal, Skills, Availability, Documents, Pricing, Danger Zone)
- Skills can be added/removed post-onboarding
- Hourly rate, bio, experience editable

**Service Page Display** ([`src/app/services/[id]/page.tsx`](src/app/services/[id]/page.tsx)):
- Taskers filtered by service category
- Real metrics displayed: `id_verified`, `experience`, `completion_count`, `average_rating`, `is_elite`

### Strengths

1. **Flexible skills array**: TEXT[] allows any service category without schema changes
2. **Bilingual service catalog**: `name_ne`/`description_ne` columns support Nepali translations
3. **Slug-based service URLs**: Migration 045 added clean URL slugs for SEO
4. **Proficiency levels**: Beginner/Intermediate/Expert adds nuance beyond binary skill selection

### Critical Issues

#### 4.1 Skills Array Has No Referential Integrity
**Severity: P1 — Data Quality**

`taskers.skills` is a TEXT[] array with no foreign key to `services`. If a service is renamed or deleted, tasker skill references become orphaned. There's no way to cascade updates.

**Fix:** Either add a trigger to validate skills against `services` table, or migrate to a junction table `tasker_services(tasker_id, service_id, proficiency_level)`.

#### 4.2 No Portfolio/Work Samples
**Severity: P2 — Trust**

Taskers cannot upload photos of past work. The `task_photo_url` column exists on `bookings` (for job completion photos) but there's no portfolio gallery for taskers to showcase their work. This is a major trust signal missing from tasker profiles.

#### 4.3 Availability Is Stored as JSON Text, Not Structured
**Severity: P2 — Queryability**

The onboarding form collects availability as a 7×3 grid (days × morning/afternoon/evening) but this is stored as a JSON text field (`availability_hours`). This makes it impossible to query "find all taskers available on Tuesday mornings" via SQL. The data is effectively opaque to the database.

**Fix:** Create an `availability_slots` table:
```sql
CREATE TABLE availability_slots (
  tasker_id UUID REFERENCES taskers(id),
  day_of_week INTEGER, -- 0=Sun, 6=Sat
  slot TEXT, -- 'morning', 'afternoon', 'evening'
  PRIMARY KEY (tasker_id, day_of_week, slot)
);
```

#### 4.4 Service Radius Not Used in Search
**Severity: P3 — Feature Gap**

`taskers.service_radius` column exists but is never used in any search query. The PostGIS `search_taskers_nearby()` function accepts a `radius_km` parameter but it's hardcoded by the caller, not derived from the tasker's preference.

#### 4.5 No Service-Level Pricing
**Severity: P3 — Monetization**

Taskers set a single `hourly_rate` regardless of which skill they're offering. A plumber-electrician charges the same rate for both services. There's no per-skill pricing capability.

---

## 5. Dimension 3: Discovery & Matching

### Flow Overview

```
Homepage Search → Browse Page → Service Page → City Filter → TaskerCard → Booking Page
```

### Schema Support

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `taskers` | `is_featured`, `featured_until`, `city`, `area`, `skills`, `rating`, `location` (PostGIS) | Searchable tasker attributes |
| `services` | `slug`, `name` | Category-based discovery |
| `cities` | `name`, `is_active` | Geographic filtering |
| `profile_views` | `tasker_id`, `viewer_id`, `viewed_at` | Discovery analytics |
| `favorites` | `user_id`, `tasker_id` | Saved taskers for re-booking |

### Application Implementation

**Homepage** ([`src/app/HomeClient.tsx`](src/app/HomeClient.tsx)):
- Featured taskers carousel (sorted by `is_featured`, `rating`, `total_jobs`)
- Service category grid from DB `services` table
- Search autocomplete component

**Browse Page** ([`src/app/browse/page.tsx`](src/app/browse/page.tsx) + [`BrowseClient.tsx`](src/app/browse/BrowseClient.tsx)):
- Server-side initial fetch with `users!taskers_user_id_fkey` (left join)
- Client-side filtering by service, city, rating
- Geolocation-based city detection
- Favorites toggle

**Service Page** ([`src/app/services/[id]/page.tsx`](src/app/services/[id]/page.tsx)):
- UUID-to-slug redirect for SEO
- City filter via `?city=` query param
- Pagination (20 per page)
- `is_featured` priority sort
- Dynamic badge computation from real metrics

### Strengths

1. **Slug-based SEO URLs**: Clean `/services/plumbing` URLs with 301 redirects from UUIDs
2. **Dynamic areaServed**: JSON-LD structured data reflects actual cities where taskers exist
3. **Real metrics on cards**: Badges computed from actual DB data, not hardcoded
4. **Left join pattern**: `users!taskers_user_id_fkey` prevents silently dropping taskers with missing user rows
5. **Favorites system**: Enables re-booking and personalization

### Critical Issues

#### 5.1 PostGIS Proximity Search Is Never Used
**Severity: P0 — Missed Core Feature**

Migration 042 created a full PostGIS setup with:
- `taskers.location` geography(POINT, 4326) column
- GIST index on location
- `search_taskers_nearby()` function with distance calculation
- `search_taskers_by_district()` fallback function

**None of this is called from any application code.** All discovery is done via simple city name string matching (`taskers.city = 'Kathmandu'`). This means:
- No distance-based sorting ("find plumbers near me")
- No radius filtering
- No "taskers in your area" feature
- The entire PostGIS investment is dormant

#### 5.2 No Full-Text Search
**Severity: P1 — Discovery**

There's no full-text search across tasker bios, skills, or service descriptions. The search autocomplete uses a static keyword list ([`src/data/search-keywords.ts`](src/data/search-keywords.ts)). Users searching for "water heater repair" won't find taskers who mention it in their bio unless it matches a service category name.

#### 5.3 Featured Tasker Logic Is Inconsistent
**Severity: P2 — Fairness**

The homepage fetches featured taskers with `is_featured = true` but the sort order is client-side by `rating` and `total_jobs`. The `featured_until` column exists but is never checked — featured taskers never expire automatically. There's no admin UI to manage featured status (it's set via seed migration only).

#### 5.4 No Discovery Analytics Feedback Loop
**Severity: P3 — Growth**

`profile_views` table tracks who viewed which tasker, but this data is never used to:
- Boost frequently-viewed taskers in search results
- Show taskers their profile view count
- Identify high-demand services in specific areas

#### 5.5 City Filter Is Case-Sensitive String Matching
**Severity: P3 — Reliability**

City filtering uses exact string matching (`taskers.city = 'Kathmandu'`). If a tasker enters "kathmandu" (lowercase) or "KTM", they won't appear in filters. The `cities` table exists with standardized names but isn't used as a lookup/enum for tasker city values.

---

## 6. Dimension 4: Booking & Scheduling

### Flow Overview

```
TaskerCard → Booking Page (3 steps) → Schedule → Upgrades → Review → Confirm → Payment → Booking Created
```

### Schema Support

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `bookings` | `customer_id`, `tasker_id`, `service`, `total_price`, `status`, `payment_status`, `scheduled_date`, `scheduled_time`, `address`, `notes`, `transportation_mode`, `is_draft`, `last_step_completed`, `abandoned_at`, `is_family_booking`, `recipient_name`, `recipient_phone` | Complete booking record |

### Application Implementation

**Booking Page** ([`src/app/book/[taskerId]/page.tsx`](src/app/book/[taskerId]/page.tsx)):
- 3-step wizard: Schedule → Upgrades → Review
- Time slot generation from tasker availability
- Conflict detection (client-side only)
- Add-on selection (deep clean, eco products, urgent, weekend)
- Promo code application
- Draft saving with `saveDraft()` at each step
- Payment method selection (eSewa, cash)
- Total calculation with add-ons and promo discounts

### Strengths

1. **Draft saving**: `is_draft` + `last_step_completed` enables recovery of abandoned bookings
2. **Family booking support**: `is_family_booking`, `recipient_name`, `recipient_phone` for diaspora use case
3. **Add-on system**: Configurable service upgrades with pricing from `site_settings`
4. **Promo code integration**: Real-time discount calculation
5. **Multi-payment support**: eSewa online + cash on delivery

### Critical Issues

#### 6.1 Booking Conflict Detection Is Client-Side Only
**Severity: P0 — Double-Booking Risk**

The booking page fetches existing bookings and checks for time conflicts in JavaScript ([`src/app/book/[taskerId]/page.tsx`](src/app/book/[taskerId]/page.tsx), lines 763-770). This means:
- Two customers booking simultaneously can both pass the conflict check
- The last one to submit wins; the first gets silently overwritten
- No database-level exclusion constraint exists

**Fix:** Add a database-level exclusion constraint or use `SELECT ... FOR UPDATE` in a transaction:
```sql
-- Check before insert in a transaction
SELECT id FROM bookings
WHERE tasker_id = $1
  AND scheduled_date = $2
  AND scheduled_time = $3
  AND status NOT IN ('cancelled', 'declined')
FOR UPDATE;
```

#### 6.2 No Server-Side Price Validation
**Severity: P1 — Revenue Integrity**

The total price is calculated entirely on the client. A malicious user could modify the JavaScript to submit a booking with `total_price = 1`. The API route that creates the booking does not recalculate or validate the price server-side.

**Fix:** Recalculate `total_price` server-side from the tasker's `hourly_rate`, selected add-ons, and applied promo code before inserting.

#### 6.3 Time Slot Generation Is Naive
**Severity: P2 — UX**

Time slots are generated as fixed 1-hour blocks (7AM-7PM) regardless of the tasker's actual availability. The `availability_hours` JSON is not parsed to filter available slots. A tasker who only works afternoons will still show morning slots as available.

#### 6.4 No Booking Expiry/Cancellation Automation
**Severity: P2 — Operations**

Pending bookings never auto-expire. If a customer creates a booking and never pays, or a tasker never responds, the booking stays in `pending` status indefinitely. There's no:
- Auto-cancellation of unpaid bookings after N minutes
- Auto-decline of unresponded bookings after N hours
- Reminder notifications for stale bookings

#### 6.5 Abandoned Booking Recovery Is Not Implemented
**Severity: P2 — Revenue**

The schema supports abandoned booking tracking (`is_draft`, `abandoned_at`, `last_step_completed`) and the admin dashboard shows "Leakage Detected" with abandoned value. But there's no:
- Automated email/SMS to recover abandoned bookings
- "Complete your booking" reminder flow
- Admin tool to manually recover specific abandoned bookings

---

## 7. Dimension 5: Communication & Coordination

### Flow Overview

```
Booking Created → Chat Modal → Real-time Messages → WhatsApp Fallback → Concierge Support
```

### Schema Support

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `messages` | `booking_id`, `sender_id`, `text`, `created_at` | Real-time chat (Realtime enabled) |
| `notifications` | `user_id`, `title`, `message`, `type`, `is_read`, `target_role` | In-app alerts (Realtime enabled) |
| `push_subscriptions` | `user_id`, `endpoint`, `p256dh`, `auth` | Web push tokens |

### Application Implementation

**Chat Modal** ([`src/components/chat/ChatModal.tsx`](src/components/chat/ChatModal.tsx)):
- Per-booking chat room
- Supabase Realtime subscription for live messages
- Deduplication of incoming messages
- Auto-scroll to latest message

**Concierge Page** ([`src/app/chat/page.tsx`](src/app/chat/page.tsx)):
- WhatsApp-based support fallback
- Email support option
- Operating hours display

**Notifications** ([`src/context/NotificationContext.tsx`](src/context/NotificationContext.tsx)):
- Toast notification system
- Real-time subscription to `notifications` table
- Admin notifications with `target_role` support

### Strengths

1. **Real-time chat**: Supabase Realtime provides instant message delivery
2. **Message deduplication**: Client-side check prevents duplicate messages from Realtime race conditions
3. **Role-based notifications**: `target_role` column enables admin-wide broadcasts
4. **WhatsApp fallback**: Provides an alternative channel when in-app chat isn't sufficient

### Critical Issues

#### 7.1 Chat Is Not Persistent Across Sessions
**Severity: P1 — UX**

The chat modal is only accessible from the booking detail modal in the dashboard. There's no:
- Standalone chat list page showing all conversations
- Chat history accessible after booking completion
- Unread message indicators outside the dashboard

The [`ChatModal.tsx`](src/components/chat/ChatModal.tsx) is only rendered when `activeChat` is set in the dashboard, which requires a specific booking to be selected.

#### 7.2 No Typing Indicators or Read Receipts
**Severity: P2 — UX**

The chat has no presence awareness:
- No "user is typing" indicator
- No read receipts (message seen status)
- "Online" status is hardcoded to always show green

#### 7.3 Push Notifications Are Non-Functional
**Severity: P1 — Engagement**

The `push_subscriptions` table and `send-push` edge function exist, but:
- The edge function only logs to console; it doesn't actually send push notifications
- No web-push library is imported or used
- The `notify_booking_accepted()` trigger calls `supabase_functions.http_request()` to a non-existent `/api/push/send` endpoint
- VAPID keys are configured but never used for actual push delivery

This means taskers receive no notification when:
- A new booking is created
- A booking is accepted/declined
- A customer sends a chat message
- Payment is received

#### 7.4 No Message Attachments
**Severity: P3 — Feature Gap**

The `messages` table only supports text. Taskers and customers cannot share:
- Photos (e.g., "this is the leak")
- Location pins
- Voice messages

#### 7.5 No Notification Preferences
**Severity: P3 — UX**

Users cannot configure which notifications they receive. There's no:
- Opt-out for specific notification types
- Do-not-disturb hours
- Channel preference (push vs email vs SMS)

---

## 8. Dimension 6: Job Execution & Tracking

### Flow Overview

```
Booking Accepted → On-the-Way → In-Progress → Completed → Photo Upload
```

### Schema Support

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `bookings` | `status` (pending/accepted/on-the-way/in-progress/completed/cancelled/declined), `task_photo_url` | Job state machine |
| `booking_logs` | `booking_id`, `old_status`, `new_status`, `actor_id` | Status change audit trail |
| `tasker_locations` | `tasker_id`, `lat`, `lng`, `accuracy`, `last_updated` | Live GPS (Realtime enabled) |

### Application Implementation

**Dashboard Booking Management** ([`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx)):
- `updateStatus()` function handles status transitions
- Booking detail modal with action buttons
- Status flow: Accept → On-the-Way → In-Progress → Complete
- Tasker can also decline bookings

**Live Tracking** ([`src/components/TaskerLocationTracker.tsx`](src/components/TaskerLocationTracker.tsx)):
- Client component for GPS tracking
- Writes to `tasker_locations` table

### Strengths

1. **Granular status flow**: 7 distinct statuses provide clear job state visibility
2. **Audit trail**: `booking_logs` captures every status transition with actor
3. **Live GPS infrastructure**: Realtime-enabled location tracking for customer visibility
4. **Photo evidence**: `task_photo_url` for job completion verification

### Critical Issues

#### 8.1 No Status Transition Validation
**Severity: P1 — Data Integrity**

The `updateStatus()` function allows any status transition. A tasker could jump from `pending` directly to `completed` without going through `accepted` → `on-the-way` → `in-progress`. There's no:
- Database-level state machine enforcement
- Server-side validation of valid transitions
- Business rule that completion requires a photo

**Fix:** Add a CHECK constraint or trigger:
```sql
CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status NOT IN ('accepted', 'declined', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition from pending to %', NEW.status;
  END IF;
  -- ... more transition rules
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 8.2 Live Tracking Is Not Used in Customer-Facing UI
**Severity: P2 — Feature Gap**

The `tasker_locations` table and `TaskerLocationTracker` component exist, but there's no customer-facing live map view. The admin has a live map page ([`src/app/admin/live-map/page.tsx`](src/app/admin/live-map/page.tsx)) but customers cannot see their tasker's real-time location during a job.

#### 8.3 No Time-on-Site Tracking
**Severity: P3 — Operations**

There's no tracking of when a tasker actually arrives or how long a job takes. The `scheduled_time` is a single time slot, not a range. Actual start/end times are not captured, making it impossible to:
- Measure tasker punctuality
- Calculate actual vs estimated job duration
- Optimize scheduling algorithms

#### 8.4 No Job Checklist/Scope Verification
**Severity: P3 — Quality**

There's no mechanism for the customer to confirm what work was done. The booking has a `service` field and `notes` but no:
- Pre-job checklist of tasks to complete
- Post-job verification by customer
- Scope change tracking (if additional work was requested)

---

## 9. Dimension 7: Payments & Financial Flow

### Flow Overview

```
Booking Created → Payment (eSewa/Cash) → Escrow → Job Complete → Commission Calculated → Tasker Payout (?)
```

### Schema Support

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `bookings` | `total_price`, `payment_status` (pending/escrowed/paid_out/refunded), `payment_method`, `payment_reference` | Payment state per booking |
| `commission_ledger` | `booking_id`, `tasker_id`, `total_amount`, `commission_amount`, `type` (receivable/payable), `status` | Double-entry commission tracking |
| `platform_settings` | `commission_rate_percentage` | Global commission rate |
| `payments` | `booking_id`, `amount`, `method`, `gateway_reference`, `status` | Payment gateway transactions |
| `wallets` | `user_id`, `balance` | User wallet for referrals/payouts |
| `wallet_transactions` | `wallet_id`, `amount`, `type`, `description` | Wallet transaction history |

### Application Implementation

**eSewa Integration** ([`src/lib/esewa.ts`](src/lib/esewa.ts)):
- Signature generation using HMAC-SHA256
- Test/production mode switching via `isProduction` check
- Payload generation with `supabaseAdmin` client

**Payment Flow** ([`src/components/PaymentButton.tsx`](src/components/PaymentButton.tsx)):
- Client-side form POST to eSewa
- Redirect-based payment flow

**Edge Functions**:
- [`esewa-token-inquiry`](supabase/functions/esewa-token-inquiry/index.ts): Validates booking tokens for eSewa
- [`esewa-status-check`](supabase/functions/esewa-status-check/index.ts): Returns payment status to eSewa
- [`khalti-verify`](supabase/functions/khalti-verify/index.ts): Verifies Khalti payments, creates commission ledger entries

**Commission Ledger** ([`008_ledger_trigger.sql`](supabase/migrations/008_ledger_trigger.sql)):
- `handle_booking_completion()` trigger creates ledger entries on booking completion
- Calculates commission based on `platform_settings.commission_rate_percentage`

### Strengths

1. **Double-entry ledger**: `receivable` (tasker owes platform) and `payable` (platform owes tasker) types
2. **Multiple payment gateways**: eSewa and Khalti integration scaffolded
3. **Escrow model**: Payment held until job completion
4. **Automatic commission calculation**: Trigger-based on booking completion
5. **Referral rewards**: Wallet credits for successful referrals

### Critical Issues

#### 9.1 No Tasker Payout/Disbursement Mechanism
**Severity: P0 — Critical Business Function**

This is the most significant gap in the entire platform. The commission ledger tracks what the platform owes taskers (`type = 'payable'`), but there is **no mechanism to actually pay taskers**. There's no:
- Payout initiation UI (admin or automated)
- Bank account/ eSewa ID collection from taskers
- Payout batch processing
- Payout status tracking
- Payout reconciliation

The `wallets` table exists but is only used for referral rewards, not for tasker earnings disbursement.

#### 9.2 Commission Ledger Has No Immutability Enforcement
**Severity: P1 — Financial Integrity**

Migration 012 mentions "ledger immutability trigger" but the actual trigger implementation is not present in the codebase. Commission ledger entries can be modified or deleted after creation, which is a critical financial control gap.

#### 9.3 Cash Payment Commission Collection Is Undefined
**Severity: P1 — Revenue Leakage**

For cash payments, the platform has no mechanism to collect its commission. The `commission_ledger` marks these as `type = 'receivable'` (tasker owes platform) but there's no:
- Invoice generation for taskers
- Payment collection workflow
- Reconciliation process
- Consequences for non-payment

#### 9.4 No Refund Workflow
**Severity: P2 — Customer Protection**

There's no refund mechanism for cancelled or disputed bookings:
- No refund initiation UI
- No refund status tracking
- No integration with eSewa/Khalti refund APIs
- `payment_status = 'refunded'` exists as a value but is never set by any code

#### 9.5 eSewa Integration Is Partially Hardcoded
**Severity: P2 — Production Readiness**

The eSewa integration has several hardcoded/test values:
- Merchant ID defaults to `EPAYTEST`
- The `isProduction` check in [`esewa.ts`](src/lib/esewa.ts) switches URLs but the merchant ID and secret key must be manually configured
- No webhook receiver for eSewa's server-to-server payment confirmation

#### 9.6 No Financial Reporting
**Severity: P3 — Operations**

There's no:
- Revenue dashboard with time-series data
- Tasker earnings statements
- Commission reconciliation reports
- Tax reporting exports
- CSV/PDF export of financial data

---

## 10. Dimension 8: Rating, Review & Reputation

### Flow Overview

```
Job Completed → Customer Reviews → Rating Stored → Tasker Metrics Updated → Badges Computed
```

### Schema Support

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `reviews` | `booking_id`, `reviewer_id`, `tasker_id`, `rating` (1-5), `comment` | Individual reviews |
| `taskers` | `rating`, `total_ratings`, `average_rating`, `completion_count`, `cancellation_count`, `is_elite`, `trust_score` | Aggregated reputation metrics |

### Application Implementation

**Review Trigger** ([`003b_trust_communication.sql`](supabase/migrations/003b_trust_communication.sql)):
- Trigger updates `taskers.rating` and `taskers.total_tasks` on new review

**Reliability Metrics** ([`036_tasker_reliability_metrics.sql`](supabase/migrations/036_tasker_reliability_metrics.sql)):
- Added `completion_count`, `cancellation_count`, `total_ratings`, `average_rating`, `is_elite`, `response_time_avg`, `trust_score`

**Badge Computation** ([`src/app/services/[id]/page.tsx`](src/app/services/[id]/page.tsx)):
- Client-side badge logic: "ID Verified", "Elite", rating stars, jobs completed

### Strengths

1. **Automatic metric aggregation**: Trigger-based updates keep tasker stats current
2. **Multi-dimensional reputation**: Completion rate, cancellation rate, average rating, response time
3. **Elite badge**: `is_elite` flag for top-performing taskers
4. **Trust score infrastructure**: 0-100 scale with CHECK constraint

### Critical Issues

#### 10.1 Trust Score Is Never Computed
**Severity: P1 — Feature Gap**

The `trust_score` column (INTEGER, 0-100, default 50) exists but there's no:
- Algorithm to compute it from other metrics
- Trigger to update it when ratings/completions change
- Weighting of factors (verification status, completion rate, rating, response time)
- Display of trust score anywhere in the UI

#### 10.2 No Review Moderation
**Severity: P2 — Trust**

Reviews are posted directly without:
- Profanity filtering
- Minimum character length enforcement
- Admin moderation queue
- Ability to report inappropriate reviews
- Review removal workflow

#### 10.3 No Review Response from Taskers
**Severity: P2 — Engagement**

Taskers cannot respond to reviews. A negative review sits unanswered, which:
- Damages tasker reputation without right of reply
- Reduces trust in the platform
- Is a standard feature on all major marketplace platforms

#### 10.4 Rating Is Stored Redundantly
**Severity: P3 — Data Integrity**

`taskers.rating` and `taskers.average_rating` both exist. The `rating` column appears to be the legacy field (updated by the old trigger) while `average_rating` is the newer, more precisely named column. Having both creates confusion about which is authoritative.

#### 10.5 No Review Prompt Automation
**Severity: P3 — Engagement**

There's no automated prompt to customers to leave a review after job completion. Reviews only happen if the customer proactively navigates to the review flow. This results in low review coverage.

---

## 11. Dimension 9: Post-Job & Re-engagement

### Flow Overview

```
Job Completed → Review → Favorites → Re-book → Referral → Dormant (?)
```

### Schema Support

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `favorites` | `user_id`, `tasker_id` | Saved taskers for re-booking |
| `referrals` | `referrer_id`, `referred_id`, `status`, `reward_claimed` | Referral program |
| `wallets` | `user_id`, `balance` | Referral reward storage |
| `promo_codes` | `code`, `discount_percent`, `max_uses`, `current_uses` | Re-engagement incentives |

### Application Implementation

**Favorites** ([`src/app/browse/BrowseClient.tsx`](src/app/browse/BrowseClient.tsx)):
- Heart toggle on TaskerCard
- Favorites tab in dashboard

**Referrals** ([`043_referral_rewards.sql`](supabase/migrations/043_referral_rewards.sql)):
- `referral_code` on users table
- Trigger creates wallet and referral record on signup with referral code
- Reward amount configurable

### Strengths

1. **Referral system**: Complete with wallet credits, trigger automation, and reward tracking
2. **Favorites**: Enables easy re-booking of preferred taskers
3. **Promo code infrastructure**: Supports targeted re-engagement campaigns

### Critical Issues

#### 11.1 No Re-engagement Automation
**Severity: P1 — Retention**

There is absolutely no automated re-engagement:
- No "It's been a while" email/SMS to dormant customers
- No "Taskers you've worked with before" suggestions
- No seasonal/service-based prompts ("Time for AC servicing?")
- No "Your favorite tasker has new availability" notifications
- No booking anniversary reminders

#### 11.2 No Tasker Performance Reviews
**Severity: P2 — Quality**

There's no periodic review of tasker performance:
- No automated flagging of taskers with declining ratings
- No quality improvement plans or warnings
- No suspension automation for consistently poor performance
- No re-activation workflow for improved taskers

#### 11.3 Referral Rewards Have No Expiry
**Severity: P3 — Financial**

Referral rewards are credited to wallets with no:
- Expiration date on credits
- Minimum balance for withdrawal
- Usage restrictions (can only be used for bookings, not withdrawn)
- Fraud detection (same IP, same phone patterns)

#### 11.4 No Loyalty Program
**Severity: P3 — Retention**

There's no:
- Repeat customer discounts
- Tasker tenure rewards
- Volume-based commission discounts
- Tiered benefits beyond the binary `is_elite` flag

---

## 12. Dimension 10: Admin & Operational Controls

### Flow Overview

```
Admin Dashboard → KYC Review → User Management → Dispute Resolution → Financial Oversight → Platform Config
```

### Schema Support

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `staff_roles` | `user_id`, `role` (super_admin/admin/support/finance/operations) | Role-based access control |
| `system_logs` | `action_type`, `performed_by`, `details` (JSONB), `target_id` | Audit trail |
| `disputes` | `booking_id`, `reporter_id`, `reason`, `status`, `admin_notes` | Dispute management |
| `announcements` | `title`, `message`, `type`, `target_role`, `is_active`, `expires_at` | Platform communications |
| `api_integrations` | `service_name`, `api_key`, `api_secret`, `is_enabled`, `configuration` | External service management |
| `site_settings` | `id`, `value`, `description` | No-code configuration |

### Application Implementation

**Admin Dashboard** ([`src/app/admin/AdminDashboard.tsx`](src/app/admin/AdminDashboard.tsx)):
- Real-time stats: users, taskers, bookings, revenue, disputes
- Abandoned booking value tracking
- Site settings editor
- Notification center

**KYC Review** ([`src/app/admin/taskers/page.tsx`](src/app/admin/taskers/page.tsx)):
- Three-pillar verification toggle
- Document viewer
- Approve/Reject with reason
- SMS nudge

**User Management** ([`src/app/admin/users/page.tsx`](src/app/admin/users/page.tsx)):
- Full user database with filtering
- Account status management (active/deactivated/suspended)
- Configurable column visibility
- WhatsApp contact link

**Dispute Resolution** ([`src/app/admin/support/page.tsx`](src/app/admin/support/page.tsx)):
- Active booking monitoring
- Dispute list with resolution workflow
- Market task oversight
- "Seeker Intel" modal with metadata

**Platform Settings** ([`src/app/admin/settings/page.tsx`](src/app/admin/settings/page.tsx)):
- Financial: Commission rate, currency, default payment method
- Integrations: API key management for eSewa, WhatsApp, Maps, SMS
- Cities: CRUD for serviceable cities
- Categories: CRUD for service categories

**Marketing** ([`src/app/admin/marketing/page.tsx`](src/app/admin/marketing/page.tsx)):
- Promo code management (create, toggle, delete)
- Announcement broadcaster (targeted by role)

**Role Management** ([`src/app/admin/roles/page.tsx`](src/app/admin/roles/page.tsx)):
- Staff role assignment by email
- Role revocation
- Role hierarchy: super_admin > admin > finance/support/operations

### Strengths

1. **Comprehensive admin panel**: Covers all major operational domains
2. **Granular staff roles**: 5 distinct roles with appropriate access separation
3. **Audit logging**: `system_logs` with JSONB details for flexible event tracking
4. **No-code configuration**: `site_settings` enables operational changes without deployments
5. **Dispute workflow**: Formal dispute creation, investigation, and resolution tracking
6. **Seeker Intel**: Creative metadata display for market task posters

### Critical Issues

#### 12.1 Admin Access Control Is Inconsistent
**Severity: P1 — Security**

Different admin pages use different authorization patterns:
- Some check `staff_roles` table
- Some check `users.role` column
- Some have no authorization check at all
- The `is_super_admin()` function exists but isn't consistently used

The admin layout ([`src/app/admin/layout.tsx`](src/app/admin/layout.tsx)) should enforce a single, consistent authorization pattern.

#### 12.2 No Rate Limiting on Admin Actions
**Severity: P2 — Security**

Admin actions (approve/reject taskers, change account status, modify commission rates) have no rate limiting. A compromised admin account could:
- Mass-approve fraudulent taskers
- Mass-suspend legitimate users
- Change commission rates arbitrarily

#### 12.3 API Keys Stored in Plain Text
**Severity: P1 — Security**

The `api_integrations` table stores API keys and secrets in plain text. While RLS restricts access to staff, a database breach would expose all third-party API credentials. These should be stored in Supabase Vault or at minimum encrypted at rest.

#### 12.4 No Admin Action Approval Workflow
**Severity: P2 — Safety**

Critical actions (commission rate changes, mass user operations, service deletions) have no:
- Two-person approval requirement
- Confirmation with reason
- Cool-down period before taking effect
- Rollback capability

#### 12.5 Dispute Resolution Has No SLA Tracking
**Severity: P3 — Operations**

Disputes have `created_at` and `resolved_at` timestamps but there's no:
- SLA targets for resolution time
- Escalation workflow for aging disputes
- Admin assignment (who's handling which dispute)
- Customer/tasker communication thread within the dispute

---

## 13. Cross-Cutting Concerns

### 13.1 Authentication & Session Management

**Strengths:**
- Supabase Auth with phone OTP, Google OAuth, and email/password
- `handle_new_user()` trigger ensures `public.users` row creation
- Auth state management via React Context

**Issues:**
- No session timeout or idle logout
- No multi-device session management
- No "remember me" functionality
- Password reset flow exists but is untested in the current codebase

### 13.2 Real-time Infrastructure

**Strengths:**
- Supabase Realtime enabled on: `messages`, `notifications`, `tasker_locations`, `taskers`
- `REPLICA IDENTITY FULL` set on `notifications` for reliable change data capture
- Channel-based subscription pattern with unique IDs to prevent duplicates

**Issues:**
- No connection status indicator in UI (users don't know if real-time is connected)
- No reconnection backoff strategy
- No offline message queueing
- `taskers` table has realtime enabled but no UI subscribes to it

### 13.3 Error Handling & Resilience

**Strengths:**
- Try/catch patterns in most async operations
- Toast notifications for user-facing errors
- Console.error logging for debugging

**Issues:**
- No centralized error tracking (no Sentry, LogRocket, etc.)
- No structured error codes — all errors are string messages
- No retry logic for failed API calls
- No circuit breaker for external service calls (eSewa, SMS)
- No graceful degradation when Supabase is unreachable

### 13.4 Performance

**Strengths:**
- Server Components for initial data fetching (reduced client JS)
- `generateStaticParams` for SSG on service pages
- Pagination on service page (20 per page)
- Database indexes on key lookup columns

**Issues:**
- No query result caching (Redis, etc.)
- No image optimization for tasker avatars (direct Unsplash/DiceBear URLs)
- No bundle splitting analysis
- Admin dashboard makes 11 parallel Supabase queries on every load
- No database connection pooling configuration visible

### 13.5 Security

**Strengths:**
- Comprehensive RLS policies on all tables
- `SECURITY DEFINER` functions for privileged operations
- Service role key used only server-side
- Staff role hierarchy with `is_super_admin()` helper

**Issues:**
- API keys in plain text (see 12.3)
- No CSP headers configured
- No rate limiting on public endpoints
- No input sanitization beyond Supabase's built-in protection
- No CSRF protection on state-changing operations
- Phone numbers not validated for Nepal format consistency

### 13.6 Mobile/PWA Readiness

**Strengths:**
- `manifest.json` and service worker present
- PWA install banner component
- Responsive design throughout

**Issues:**
- No offline support (service worker is basic)
- No push notification integration with PWA
- No mobile-specific UI adaptations beyond responsive CSS
- No app-like navigation patterns (bottom tabs, swipe gestures)

---

## 14. Prioritized Recommendations

### P0 — Critical (Must Fix Before Production Launch)

| # | Issue | Dimension | Impact |
|---|-------|-----------|--------|
| 1 | No tasker payout/disbursement mechanism | 7 — Payments | Taskers cannot get paid — platform cannot function |
| 2 | PostGIS proximity search never used | 5 — Discovery | Core location-based discovery is non-functional |
| 3 | Booking conflict detection is client-side only | 6 — Booking | Double-booking risk undermines reliability |
| 4 | No phone uniqueness enforcement | 3 — Onboarding | Account duplication and fraud risk |
| 5 | No server-side price validation | 6 — Booking | Revenue leakage from manipulated prices |

### P1 — High Priority (Significant User/ Business Impact)

| # | Issue | Dimension | Impact |
|---|-------|-----------|--------|
| 6 | Push notifications non-functional | 7 — Communication | No engagement loop for taskers |
| 7 | Commission ledger not immutable | 9 — Payments | Financial integrity risk |
| 8 | Cash payment commission uncollectible | 9 — Payments | Revenue leakage |
| 9 | No status transition validation | 8 — Execution | Data integrity risk |
| 10 | No re-engagement automation | 11 — Post-Job | Poor retention |
| 11 | Trust score never computed | 10 — Reputation | Wasted schema investment |
| 12 | Admin access control inconsistent | 12 — Admin | Security risk |
| 13 | API keys stored in plain text | 12 — Admin | Security risk |
| 14 | Chat not persistent across sessions | 7 — Communication | Poor UX |
| 15 | Skills array has no referential integrity | 4 — Portfolio | Data quality risk |

### P2 — Medium Priority (Quality/Feature Improvements)

| # | Issue | Dimension | Impact |
|---|-------|-----------|--------|
| 16 | No refund workflow | 9 — Payments | Customer protection gap |
| 17 | No review moderation | 10 — Reputation | Trust degradation risk |
| 18 | No review response from taskers | 10 — Reputation | Engagement gap |
| 19 | No portfolio/work samples | 4 — Portfolio | Trust signal missing |
| 20 | Availability stored as opaque JSON | 4 — Portfolio | Queryability gap |
| 21 | No booking expiry automation | 6 — Booking | Operational inefficiency |
| 22 | Abandoned booking recovery not implemented | 6 — Booking | Revenue recovery gap |
| 23 | Live tracking not in customer UI | 8 — Execution | Feature gap |
| 24 | No typing indicators/read receipts | 7 — Communication | UX gap |
| 25 | No admin action approval workflow | 12 — Admin | Safety gap |
| 26 | No rate limiting on admin actions | 12 — Admin | Security gap |
| 27 | KYC documents have no retention policy | 3 — Onboarding | Compliance gap |
| 28 | No email verification in onboarding | 3 — Onboarding | Trust gap |
| 29 | Onboarding abandonment not tracked | 3 — Onboarding | Growth gap |
| 30 | Featured tasker logic inconsistent | 5 — Discovery | Fairness gap |

### P3 — Lower Priority (Nice to Have)

| # | Issue | Dimension | Impact |
|---|-------|-----------|--------|
| 31 | No financial reporting | 9 — Payments | Operations gap |
| 32 | No loyalty program | 11 — Post-Job | Retention gap |
| 33 | No message attachments | 7 — Communication | Feature gap |
| 34 | No notification preferences | 7 — Communication | UX gap |
| 35 | No time-on-site tracking | 8 — Execution | Analytics gap |
| 36 | No job checklist/scope verification | 8 — Execution | Quality gap |
| 37 | No discovery analytics feedback loop | 5 — Discovery | Growth gap |
| 38 | City filter is case-sensitive | 5 — Discovery | Reliability gap |
| 39 | Service radius not used in search | 4 — Portfolio | Feature gap |
| 40 | No service-level pricing | 4 — Portfolio | Monetization gap |
| 41 | Rating stored redundantly | 10 — Reputation | Data integrity |
| 42 | No review prompt automation | 10 — Reputation | Engagement gap |
| 43 | Referral rewards have no expiry | 11 — Post-Job | Financial gap |
| 44 | No tasker performance reviews | 11 — Post-Job | Quality gap |
| 45 | Dispute resolution has no SLA tracking | 12 — Admin | Operations gap |
| 46 | SMS costs not monitored | 3 — Onboarding | Operations gap |

---

## Appendix A: Migration File Index

| Migration | Purpose | Key Tables/Columns Added |
|-----------|---------|--------------------------|
| 000 | Core schema | users, taskers, services, bookings, reviews |
| 001 | Job posts | job_posts |
| 001b | Schema expansion | Additional user/tasker columns |
| 002 | Advanced booking | transportation_mode, task_photo_url, expanded statuses |
| 002b | RLS fix | INSERT policies for users |
| 003 | User trigger | handle_new_user() trigger |
| 003b | Trust & communication | Reviews trigger, messages table |
| 004 | Enterprise roles | staff_roles table |
| 005 | Financial ledger | platform_settings, commission_ledger |
| 006 | Fix roles recursion | is_super_admin() function |
| 006b | Seed taskers | Demo tasker data |
| 007 | Fix second recursion | Staff roles policy fix |
| 008 | Ledger trigger | handle_booking_completion trigger |
| 009 | Dispute columns | is_disputed, dispute_reason on bookings |
| 010 | Location tracking | last_lat, last_long, realtime for taskers |
| 011 | System audit logs | system_logs table |
| 012 | Growth & ops | featured_until, promo_codes, disputes, ledger immutability |
| 013 | Account growth | service_radius, availability_hours, goals, tier, referral_code |
| 014 | Cities table | cities |
| 015 | Profile views | profile_views, increment function |
| 015b | Dispute policies | Customer dispute creation policy |
| 016 | Create cities | cities table with seed data |
| 017 | Ops hardening | trust_score, notifications table |
| 018 | Seed featured | Featured demo taskers with photos |
| 019 | Site settings | site_settings table |
| 020 | Favorites | favorites table |
| 020b | Notifications system | notifications with realtime |
| 021 | User roles | user_roles table, dual role functions |
| 022 | Live tracking | tasker_locations with realtime |
| 023 | Ops hardening logs | booking_logs, disputes tables |
| 024 | Admin nocode | Verification pillars, site_settings defaults |
| 025 | Abandoned tracker | is_draft, last_step_completed, abandoned_at |
| 026 | Announcements | announcements table |
| 027 | API integrations | api_integrations table |
| 028 | Addon settings | Addon price site_settings |
| 029 | Marketplace bidding | market_tasks, task_bids |
| 031 | KYC verification | tasker_kyc table |
| 032 | Service translations | description_ne on services |
| 033 | Seed translations | Nepali translations for services |
| 034 | Grant admin | Super admin for sewakhoj@gmail.com |
| 035 | Family support | is_family_booking, recipient fields |
| 036 | Reliability metrics | completion_count, average_rating, is_elite, response_time_avg |
| 037 | Notifications realtime | REPLICA IDENTITY FULL, target_role |
| 038 | Promo codes RLS | Admin management policy |
| 039 | Announcements RLS | Staff management policy |
| 040 | Master RLS hardening | Comprehensive RLS for staff access |
| 040b | Push notifications | push_subscriptions, booking accepted trigger |
| 041 | Payment gateways | payments table, payment completion trigger |
| 042 | PostGIS location | PostGIS extension, search functions |
| 043 | Referral rewards | referrals, wallets, wallet_transactions |
| 043b | Wallet balance | wallet_balance on users |
| 043c | Account status | account_status on users |
| 044 | Platform settings | Default row safety net |
| 045 | Service slugs | slug column, unique constraint, index |

---

*End of Analysis*
