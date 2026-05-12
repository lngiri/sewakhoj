# SewaKhoj Architecture & Design Guide

This guide explains the key architectural patterns and design decisions implemented in the SewaKhoj platform to maintain a premium, bilingual experience.

## 🌍 Bilingual Design Pattern
To handle the English and Nepali requirements, we use a "Stacked Label" pattern rather than concatenation.

### Implementation Rule:
- **English Labels:** Usually `font-black text-gray-900` or `font-bold`.
- **Nepali Labels:** Usually `font-devanagari text-gray-400 font-bold uppercase tracking-widest` (for secondary) or `text-sewakhoj-red` (for emphasis).
- **Separation:** Always separate scripts by a line break or a vertical margin to avoid visual clutter on small screens.

**Example (JSX):**
```tsx
<div className="flex flex-col">
  <span className="text-sm font-black">Find a Pro</span>
  <span className="text-[10px] text-gray-400 font-bold">प्रो खोज्नुहोस्</span>
</div>
```

## 🏗 Navigation Structure
The project follows a **Global Root Layout** pattern.

- **`src/app/layout.tsx`**: The ONLY place where `<Navbar />` and `<Footer />` should be defined.
- **Conditional Visibility**: Navigation is hidden on specific routes (Admin, Dashboard, Onboarding) using a `isPortalView` or `isTaskerView` check based on `usePathname`.
- **Z-Index Management**: 
    - Navbar: `z-50`
    - Location Banner: `z-[45]`
    - PWA/WhatsApp Floating Buttons: `z-[60]`
    - Modals: `z-[100]`

## 🔍 Search & Discovery
- **`SearchAutocomplete.tsx`**: Supports a `minimal` prop for use inside high-density headers or hero sections.
- **Service Chips**: Link directly to `/browse?service=[slug]` to provide instant filtered results, reducing the friction of manual typing.

## 📍 Location System
Location is treated as a top-priority input.
- On mobile, a sticky banner is used to ensure the current city is always visible and changeable.
- Location state is managed via `LocationContext`.

## 📦 PWA Implementation
- Uses `next-pwa`.
- The install prompt is handled manually via `PWAInstallBanner.tsx` to ensure it only shows when the `beforeinstallprompt` event fires or on iOS via specific instructions.

---
*Follow these patterns when adding new features to maintain consistency.*
