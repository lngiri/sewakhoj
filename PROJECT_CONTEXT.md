# SewaKhoj Project Context

Comprehensive documentation for developers maintaining the SewaKhoj marketplace platform.

## 1. Tech Stack
- **Framework**: [Next.js 16.2.4](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Frontend Library**: [React 19](https://react.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Maps**: [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)
- **Emails**: [Resend](https://resend.com/)
- **Deployment**: Configured for Cloudflare Pages (via OpenNext)

## 2. Folder Structure
- `/src/app`: Next.js App Router pages and API route handlers.
- `/src/components`: UI components organized by function (layout, ui, chat).
- `/src/context`: React Context providers for global state (Auth, Location, Notifications).
- `/src/data`: Static data and configuration (services, cities).
- `/src/hooks`: Custom React hooks.
- `/src/lib`: Core logic, utility functions, and Supabase client initializations.
- `/supabase`: Database migrations, seed scripts, and configuration.
- `/public`: Static assets like images and fonts.

## 3. Routing System
Next.js App Router based on file-system routing in `src/app`.
- **Public**: `/`, `/about`, `/browse`, `/login`, `/signup`, `/faq`, `/terms`, `/privacy`.
- **Protected (Customer)**: `/dashboard`, `/book/[taskerId]`, `/booking/[id]/tracking`.
- **Protected (Tasker)**: `/tasker/onboard`, `/tasker/jobs`.
- **Protected (Admin)**: `/admin/*` (Cities, Promo, Settings, Support, Finance).

## 4. Main Layout Structure
- **Root Layout**: `src/app/layout.tsx` - Wraps the entire app with Context Providers and includes the `Navbar` and `Footer`.
- **Admin Layout**: `src/app/admin/layout.tsx` - Adds admin-specific navigation or checks.
- **Dashboard Layout**: `src/app/dashboard/layout.tsx` - Basic layout for customer/tasker dashboards.

## 5. Global State Management
Managed via React Context in `src/context/`:
- `AuthContext.tsx`: Tracks authenticated user status and profile data.
- `LocationContext.tsx`: Manages user's current city/location and geolocation detection.
- `NotificationContext.tsx`: Provides a global toast/notification system.

## 6. Authentication Flow
- **Provider**: Supabase Auth.
- **Client Side**: `AuthContext` uses `supabase-browser.ts` to listen to auth state changes.
- **Protected Routes**: Handled via `useEffect` checks in page components or `AuthContext` redirects.
- **Signup**: Redirects to `/role-selection` to distinguish between Customer and Tasker roles.

## 7. API Architecture
Next.js Route Handlers in `src/app/api/`:
- `/api/notify`: Proxies email notifications via Resend (`src/lib/email.ts`).
- `/api/reverse-geocode`: Proxies requests to Nominatim (OpenStreetMap) to bypass CSP/CORS and handle geocoding securely.

## 8. Database Connection Flow
- **Supabase Client**: Initialized in `src/lib/supabase-browser.ts` (for client-side) and `src/lib/supabase-server.ts` (for server-side/middleware).
- **RLS (Row Level Security)**: Enforced at the database level (`supabase/migrations/`).
- **Realtime**: Used for chat and booking status updates via Supabase Realtime channels.

## 9. UI Component Hierarchy
- `src/app/layout.tsx`
  - `Auth/Location/Notification Providers`
  - `Navbar` (`src/components/layout/Navbar.tsx`)
  - `Children` (Pages)
  - `Footer` (`src/components/layout/Footer.tsx`)

## 10. Styling System
- **Tailwind CSS 4**: Uses standard utility classes.
- **Global CSS**: `src/app/globals.css` defines the primary color palette (e.g., `--sewakhoj-red`) and global animations.
- **Animations**: `tw-animate-css` and native Tailwind transitions.

## 11. Reusable Components List
- `TaskerCard`: `src/components/TaskerCard.tsx`
- `LocationModal`: `src/components/LocationModal.tsx`
- `SearchAutocomplete`: `src/components/SearchAutocomplete.tsx`
- `LocationDetector`: `src/components/LocationDetector.tsx`
- `ui/`: Standard UI elements like buttons, inputs, modals (shadcn-like structure).

## 12. Important Dependencies
- `@supabase/ssr`: For seamless auth handling in Next.js.
- `lucide-react`: Primary icon set.
- `leaflet`: Map engine for location tracking.
- `resend`: Email delivery service.
- `class-variance-authority`: For managing component variants.

## 13. Component Responsibility
- **Navbar**: `src/components/layout/Navbar.tsx`
- **Sidebar**: No global sidebar; admin use local layouts in `src/app/admin`.
- **Dashboard**: `src/app/dashboard/page.tsx` (Customer/Tasker shared dashboard).
- **Homepage**: `src/app/page.tsx`
- **Forms**: Typically inline in pages or using reusable UI components in `src/components/ui`.
- **Modals**: Controlled via state, often using `LocationModal` or local modal logic.

## 14. Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key.
- `RESEND_API_KEY`: API key for email services.

## 15. Build/Deployment
- **Build Command**: `npm run build`
- **Cloudflare**: `npm run build:cloudflare` uses OpenNext to generate Cloudflare-compatible output.
- **Config**: `next.config.ts` includes strict CSP headers and optimization settings.

## 16. Coding Conventions
- **Client Components**: Mark with `"use client"` at the top.
- **Supabase**: Always use the singleton client from `@/lib/supabase-browser` to avoid auth loops.
- **Naming**: PascalCase for components, camelCase for variables/functions.
- **Consistency**: Use `calculateTotal()` pattern for pricing logic to ensure transparency.

## 17. NEVER Modify Automatically
- `supabase/migrations/`: Database schema should only be modified via new migration files.
- `next.config.ts`: Strict CSP headers are critical for security.
- `.env.local`: Contains sensitive local credentials.

## 18. Debugging Locations
- **Auth Loops**: Check `AuthContext.tsx` and `Navbar.tsx`.
- **Geolocation/CORS**: Check `src/app/api/reverse-geocode/route.ts`.
- **Infinite Renders**: Check `useEffect` dependency arrays in `src/components/LocationModal.tsx`.
- **Realtime Issues**: Check Supabase channel subscriptions in `src/app/booking/[id]/tracking/page.tsx`.

## 19. File Relationships
- `AuthContext` -> `Navbar` & `Dashboard` (Auth state).
- `LocationContext` -> `LocationModal` & `LocationDetector` (Location state).
- `supabase-browser` -> Shared across all client components for DB access.

## 20. Potential Risky Areas
- **CSP Headers**: Adding new third-party scripts requires updating `next.config.ts`.
- **Realtime Subs**: Ensure channels are properly cleaned up in `useEffect` return functions to avoid memory leaks.
- **Pricing Logic**: `calculateTotal()` in `src/app/book/[taskerId]/page.tsx` must be kept in sync with any backend pricing changes.
