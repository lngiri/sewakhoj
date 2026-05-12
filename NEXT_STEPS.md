# SewaKhoj - Future Tasks & Roadmap

This list contains recommended next steps for further stabilizing and enhancing the platform.

## 🛠 High Priority (Technical)
- [ ] **Internationalization (i18n):** Transition from hardcoded bilingual labels to a structured i18n library (like `next-intl`) to scale to more languages easily.
- [ ] **Build Validation:** Run a full production build (`npm run build`) before any major deployment to check for TypeScript errors in the new bilingual mapping logic.
- [ ] **Database Constraints:** Ensure all real taskers being fetched have complete metadata (Avatar, Verified Status, Rating) to prevent UI breakage on the homepage.

## ✨ UX & Polish
- [ ] **Dark Mode Audit:** Check all new bilingual components for readability in Dark Mode, especially the new Stats cards and Sticky Mobile CTA.
- [ ] **Animations:** Add subtle entrance animations (e.g., `animate-in fade-in slide-in-from-bottom`) to the Sticky Location Banner and WhatsApp button to make them feel more "alive".
- [ ] **Service Icon Mapping:** Expand the `getIcon` function in `HomeClient.tsx` to support all categories dynamically from the database.

## 📱 Mobile Improvements
- [ ] **Scroll Performance:** Debounce the scroll listener in `StickyMobileCTA.tsx` to optimize performance on low-end devices.
- [ ] **Feedback Loop:** Implement a small success toast or animation when a user changes their location from the sticky mobile banner.

---
*Reference these tasks when starting a new development session.*
