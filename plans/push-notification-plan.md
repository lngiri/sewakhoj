# P1-1: Push Notification Implementation Plan

## Current State Analysis

### What Already Exists (code written but never fully wired)

| Component | File(s) | Status |
|-----------|---------|--------|
| DB `push_subscriptions` table | migration 040 | ✅ code exists |
| DB in-app notification triggers | migration 051 | ✅ code exists (4 triggers) |
| `notification_preferences` table | migration 051 | ✅ code exists |
| API route `/api/push/send` | `src/app/api/push/send/route.ts` | ✅ uses `web-push` npm lib |
| Edge function `send-push` | `supabase/functions/send-push/index.ts` | ✅ Deno implementation |
| Frontend `usePushNotifications` hook | `src/hooks/usePushNotifications.ts` | ✅ subscribe/unsubscribe logic |
| Push prompt UI | `src/components/layout/NotificationCenter.tsx` | ✅ shows when bell opens |
| Service worker `sw-push.js` | `public/sw-push.js` | ✅ push event handlers |

### What's Missing

1. **VAPID keys** — not generated, not in `.env.local`
2. **NEXT_PUBLIC_VAPID_PUBLIC_KEY** — not set, hook reads this
3. **Service worker registration** — `sw-push.js` exists but is never registered
4. **Migrations 040 & 051** — may not be applied to remote DB
5. **`pg_net` extension** — required by `net.http_post()` in the DB triggers
6. **`net.http_post` requires service_role** — the triggers run as the table owner but need permissions

## Architecture Flow

```mermaid
graph TD
    A[Booking Accepted / New Message / Payout Processed] --> B{DB Trigger}
    B --> C[net.http_post]
    C --> D[/api/push/send Next.js Route]
    D --> E[Query push_subscriptions table]
    D --> F[web-push library sends via VAPID]
    F --> G[Browser Push Service]
    G --> H[sw-push.js Service Worker]
    H --> I[Browser Notification]
```

## TODO Checklist

### Step 1: Apply Migrations 040 & 051 to Remote DB
- Open Supabase Dashboard SQL Editor
- Copy-paste `supabase/migrations/040_push_notifications.sql` → run
- Copy-paste `supabase/migrations/051_push_notification_triggers.sql` → run

**Note:** Migration 040 uses `supabase_functions.http_request()` which is legacy. Migration 051 replaces trigger functions with `net.http_post()`. However, both need the `pg_net` extension:

```sql
-- Run this FIRST before the migrations if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 2: Generate VAPID Keys
Run this once to generate a VAPID key pair:
```bash
npx web-push generate-vapid-keys
```

This outputs:
```
=======================================
Public Key:
<base64-encoded-public-key>
Private Key:
<base64-encoded-private-key>
=======================================
```

### Step 3: Add VAPID Keys to `.env.local`
Add these lines to `d:\vscode\sewakhoj\.env.local`:
```
VAPID_PUBLIC_KEY=<public-key-from-step-2>
VAPID_PRIVATE_KEY=<private-key-from-step-2>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public-key-from-step-2>
```

### Step 4: Register `sw-push.js` Service Worker
Create a registration script that runs on app load. Add it to the root layout.

**File to create:** `src/hooks/useRegisterSW.ts`
- Runs once on mount
- Calls `navigator.serviceWorker.register('/sw-push.js', { scope: '/' })`
- Handles update detection via `onupdatefound`
- Returns registration state (loading/registered/error)

**File to modify:** `src/app/layout.tsx`
- Import and render `<ServiceWorkerRegistrar />` component
- Or call the hook inside `AuthProvider` / existing layout wrapper

### Step 5: Verify End-to-End Flow
1. Build passes: `npm run build`
2. User visits site → SW registers → push prompt appears in notification bell
3. User accepts → subscription saved to `push_subscriptions` table
4. Booking accepted → DB trigger fires → `net.http_post` → API route → web-push lib → browser notification

## Files to Create/Modify

### New Files:
| File | Purpose |
|------|---------|
| `src/hooks/useRegisterSW.ts` | Registers `sw-push.js` on app mount |

### Modified Files:
| File | Change |
|------|--------|
| `.env.local` | Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` |
| `src/app/layout.tsx` | Add service worker registration component/hook |

### Target DB (via SQL Editor):
| Target | Action |
|--------|--------|
| `pg_net` extension | `CREATE EXTENSION IF NOT EXISTS pg_net;` |
| Migration 040 | Copy-paste and run |
| Migration 051 | Copy-paste and run |

## Verification Query
After migrations, run in SQL Editor:
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'notify_booking_accepted', 'notify_new_message', 
    'notify_payout_processed', 'send_booking_reminders',
    'create_notification_preferences'
  );
```
All 5 should be listed.