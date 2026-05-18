# Tasker Onboarding & Profile Picture Upload Mobile-First Fix

## 1. Profile Picture Save Fix
### The Issue:
The profile picture crop modal had a fallback upload mechanism to the `task_photos` Supabase storage bucket. However:
1. It used a static file path: `avatar_${authUser.id}_profile.jpg`
2. It specified `upsert: true`

Under the Supabase RLS policy:
```sql
CREATE POLICY "Anyone can upload task photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'task_photos');
```
*Only* `INSERT` is permitted for public task photos. The storage engine treats `upsert: true` as an `UPDATE` check if a file already exists or when verifying update permissions. Additionally, since the path was static, any re-saves failed.

### The Fix:
We refactored `handleCropSave` in [page.tsx](file:///d:/vscode/sewakhoj/src/app/tasker/onboard/page.tsx) to match the reliable unique path pattern used by the KYC upload flow:
* We generate a unique timestamp: `const timestamp = Date.now();`
* We build a unique path: `avatar_${authUser.id}_${timestamp}.jpg`
* We set `upsert: false` to guarantee a clean, permitted `INSERT` operation.
* This bypasses any update RLS restrictions and successfully uploads the cropped profile picture every time!

---

## 2. Onboarding Mobile-First Visual Optimization
### The Issue:
On mobile viewports, the onboarding wizard was completely cramped because:
1. The left sidebar was fixed to a wide `w-[220px]` layout.
2. The outer page was styled with `h-screen overflow-hidden`, which breaks input fields when the mobile virtual keyboard appears.

### The Solution:
We refactored the layout of [page.tsx](file:///d:/vscode/sewakhoj/src/app/tasker/onboard/page.tsx) to be fully responsive and mobile-first:
* **Outer Layout**: Changed outer wrapper to `flex-col md:flex-row min-h-screen md:h-screen overflow-y-auto md:overflow-hidden` so that mobile viewports scroll naturally.
* **Responsive Sidebar**: Added `hidden md:flex` to hide the 220px desktop sidebar on mobile.
* **Custom Mobile Stepper**: Designed a premium, horizontal stepper dynamically below the top bar on mobile:
  * Shows step progress bubbles (1 to 6) with interactive click states.
  * Connects done steps with a gorgeous emerald line.
  * Displays a clean progress bar and profile strength percentage inside a compact top bar.
* **Grid Controls**: Stacked form grids (`grid-cols-1 md:grid-cols-2`) for comfortable finger tapping on touch screens.
