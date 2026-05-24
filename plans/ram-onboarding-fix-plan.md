# Ram's Tasker Onboarding Journey — Fix Plan

## Audit Summary

Audited 12+ files across the tasker onboarding flow. Key finding: **in-app notifications work, but SMS is completely non-functional** because `SPARROW_SMS_TOKEN` is empty. Signup has no phone field, so there's no number to send SMS to even if the token were configured.

### Claim vs. Reality

| # | Ram's Experience (Claim) | Code Reality | Gap? |
|---|--------------------------|--------------|------|
| 1 | Google search → Not Found | No blog, no sitemap strategy | ✅ Real gap |
| 2 | "Get Started" → Login (friction) | Navbar.tsx:161 links to `/login?redirect=/tasker/onboard` | ✅ Real gap |
| 3 | Signup: 4 fields | SignupClient.tsx:67 — Only 2 fields: Email + Password. No phone field. | ✅ Real gap (worse) |
| 4 | OTP/SMS reliability (Ncell) | sms.ts:63 — Full Sparrow SMS integration exists, but token is empty → mock mode | ✅ Real gap |
| 5 | ID upload: no progress bar, no size limit | onboard/page.tsx:845 — No accept attr, no size validation, no progress | ✅ Real gap |
| 6 | Submit confirmation unclear | welcome/page.tsx:66 — Welcome page exists with "24 hours" timeline | ⚠️ Minor |
| 7 | Wait time not communicated | Welcome page says "24 hours" (line 93) | ❌ Already exists |
| 8 | No application status page | dashboard/page.tsx:1164 — "Verification Roadmap" with 4 steps | ❌ Already exists |
| 9 | Admin approval → no notification | approve-tasker/index.ts:89-95 — DOES insert in-app notification. Dashboard has real-time sub. No SMS. | ⚠️ Partial |
| 10 | KYC rejection → reason unclear | approve-tasker/index.ts:121-127 — Reason IS in notification. No SMS. | ⚠️ Partial |
| 11 | Booking notification → how? | dashboard/page.tsx:375 — Real-time in-app via Supabase Realtime. No SMS. | ⚠️ Partial |

---

## Phase 1: Foundation — SMS Infrastructure & Phone Collection (P0)

### 1.1 Add phone field to signup form
- **File:** `src/app/signup/SignupClient.tsx`
- Add `phone` field (Nepal format: 98XXXXXXXX)
- Validate with existing `validatePhone()` from `src/lib/sms.ts`
- Store in `public.users` table (verify column exists or add migration)
- Prerequisite for ALL SMS features

### 1.2 Configure Sparrow SMS token
- **File:** `.env.local`
- Set `SPARROW_SMS_TOKEN` to actual Sparrow SMS API token
- Set `SPARROW_SMS_IDENTITY` (sender ID, e.g., "SewaKhoj")
- Test with `/api/sms` balance check endpoint

### 1.3 Send welcome SMS on signup
- **File:** `src/app/signup/SignupClient.tsx`
- After successful signup, call `sendSMS()` with welcome message
- Non-blocking (fire-and-forget)

---

## Phase 2: Onboarding UX Improvements (P1-P2)

### 2.1 File upload: size validation + progress bar
- **File:** `src/app/tasker/onboard/page.tsx` (lines 845-870)
- Add `accept="image/*,.pdf"` and `maxFileSize` (5MB) validation
- Add XMLHttpRequest-based upload progress bar
- Add retry logic for failed uploads (3G resilience)
- Compress images client-side before upload (canvas-based resize)

### 2.2 Fix "Get Started" → redirect to signup, not login
- **File:** `src/components/layout/Navbar.tsx` (line 161)
- Change link from `/login?redirect=/tasker/onboard` to `/signup?redirect=/tasker/onboard`
- Preserve redirect param through post-signup navigation

### 2.3 Phone-only signup option (OTP-based)
- **File:** `src/app/signup/SignupClient.tsx`
- Add tab switcher: "Email" | "Phone"
- Phone flow: Enter number → Receive OTP via `sendOTP()` → Verify → Set password
- Critical for non-email-users (many Nepali taskers)

---

## Phase 3: Critical Notifications — SMS on Key Events (P0-P1)

### 3.1 SMS on admin approval
- **File:** `supabase/functions/approve-tasker/index.ts` (after line 95)
- After inserting in-app notification, call `/api/notify` with SMS channel
- Message: "Congratulations! Your SewaKhoj Tasker profile is now active. Start receiving bookings."
- Edge Function needs tasker's phone from `public.users`

### 3.2 SMS on KYC rejection with reason
- **File:** `supabase/functions/approve-tasker/index.ts` (after line 127)
- After inserting in-app notification, send SMS with rejection reason
- Message: "SewaKhoj: Your profile needs updates. Reason: {reason}. Fix here: [link]"

### 3.3 SMS on new booking alert
- **File:** Booking creation endpoint (TBD — need to identify)
- When a customer creates a booking, trigger SMS to the tasker
- Use existing `sendTaskerAlert()` from `src/lib/sms.ts`
- **Most critical gap** — taskers have no way to know about new bookings without dashboard open

---

## Phase 4: Discovery & SEO (P3)

### 4.1 Blog/content section
- New directory: `src/app/blog/` with dynamic routes
- Content from Supabase `blog_posts` table (new migration)
- Topics: "How to find a plumber in Kathmandu", "Best electricians in Lalitpur"
- Each post targets service+city keyword combination

### 4.2 Dynamic sitemap generation
- Add `src/app/sitemap.ts` for dynamic sitemap
- Include all service pages, city pages, blog posts
- Submit to Google Search Console

### 4.3 Service/city landing pages
- Leverage existing `src/app/services/[id]/page.tsx`
- Add city-specific pages: `/services/plumber/kathmandu`, `/services/electrician/lalitpur`
- Each with unique title, description, and structured data

---

## Prioritized Execution Order

| Priority | Task | Impact | Dependencies |
|----------|------|--------|--------------|
| 🔴 P0 | 1.1 Add phone field to signup | Unblocks all SMS features | None |
| 🔴 P0 | 1.2 Configure Sparrow SMS token | SMS goes live | 1.1 |
| 🔴 P0 | 3.3 SMS on new booking | Critical — taskers know about jobs | 1.1, 1.2 |
| 🟠 P1 | 2.2 Fix "Get Started" → signup | Reduces friction | None |
| 🟠 P1 | 3.1 SMS on admin approval | Taskers know they're live | 1.1, 1.2 |
| 🟠 P1 | 3.2 SMS on KYC rejection | Taskers know what to fix | 1.1, 1.2 |
| 🟡 P2 | 2.1 Upload progress + validation | Better UX, fewer failures | None |
| 🟡 P2 | 2.3 Phone-only signup (OTP) | Accessible for non-email users | 1.1, 1.2 |
| 🟢 P3 | 1.3 Welcome SMS on signup | Nice-to-have | 1.1, 1.2 |
| 🟢 P3 | 4.1 Blog section | Long-term SEO | None |
| 🟢 P3 | 4.2 Dynamic sitemap | SEO indexing | 4.1 |
| 🟢 P3 | 4.3 City landing pages | Local SEO | None |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/app/signup/SignupClient.tsx` | Add phone field, OTP tab, welcome SMS trigger |
| `.env.local` | Add `SPARROW_SMS_TOKEN` |
| `.env.example` | Add `SPARROW_SMS_TOKEN` placeholder |
| `src/components/layout/Navbar.tsx` | "Get Started" → `/signup` |
| `src/app/tasker/onboard/page.tsx` | Upload progress bar, size validation, retry |
| `supabase/functions/approve-tasker/index.ts` | SMS on approve + reject |
| Booking creation endpoint (TBD) | SMS on new booking |
| New: `src/app/blog/` | Blog section |
| New: `src/app/sitemap.ts` | Dynamic sitemap |
| New migration | `blog_posts` table, phone column on users |
