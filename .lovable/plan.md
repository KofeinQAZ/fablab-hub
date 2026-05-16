# FabLab Satbayev — Build Plan

A mobile-first equipment booking & portable inventory app with student and lab-assistant (admin) roles, built on TanStack Start + Lovable Cloud (Supabase).

## Stack & foundations

- TanStack Start (existing template), Shadcn UI, Tailwind, dark mode default.
- Supabase for database
- Sonner for toasts.
- Industrial palette: near-black backgrounds, steel greys, neon-orange primary accent, tech-blue secondary. Tokens defined in `src/styles.css` (oklch).

## Database (migrations)

- `profiles` — `id (uuid, PK → auth.users)`, `name text`, `role` (enum `app_role`: `student` | `admin`), `safety_briefing_passed bool default false`, `created_at`.
- `equipment` — `id uuid PK`, `name text`, `category` (enum: `stationary` | `portable`), `status` (enum: `active` | `maintenance`), `image_url text`, `created_at`.
- `bookings` — `id uuid PK`, `user_id → auth.users`, `equipment_id → equipment`, `start_time timestamptz`, `end_time timestamptz`, `status` (enum: `pending` | `active` | `cancelled` | `completed`), `material_used text null`, `created_at`.
- Roles stored on `profiles.role` for simplicity (single-role app); `has_role()` SECURITY DEFINER function for RLS to avoid recursion.
- Trigger: auto-insert profile row on `auth.users` insert (default role `student`).
- RLS:
  - `profiles`: user sees own row; admins see all; users update own (except role).
  - `equipment`: all authenticated read; only admins insert/update/delete.
  - `bookings`: students see/insert/cancel own; admins see/update all.
- Seed a handful of equipment rows (3D printers, laser cutter, FPV drones, hand tools).

## Routes

```
/                       → redirect to /login or /dashboard based on session
/login                  → email+password + Google sign-in
/_authenticated/        → guard (beforeLoad redirect)
  dashboard             → student dashboard (default for role=student)
  admin                 → admin dashboard (guarded by role=admin)
```

## Student Dashboard (`/dashboard`)

- Header: lab logo, user name, safety-briefing status chip, sign out.
- Tabs: **Stationary Equipment** / **Portable Inventory**.
- **Stationary tab**: responsive grid of equipment cards (image, name, status badge). Maintenance → red disabled badge + disabled Book button. Safety briefing not passed → Book button greyed with tooltip "Safety briefing required".
- **Booking modal** (Dialog): date + 2-hour time-slot picker (shows already-booked slots disabled), material dropdown (ABS / PLA / PETG / Own Material). Submits booking with status `pending`. Toast on success.
- **Portable tab**: large CTA "Scan QR to Check-out" (mock). Opens modal: equipment selector + duration (1h / 2h / 4h / 1 day) → creates a `pending` booking. Below CTA, list user's current portable check-outs.

## Admin Dashboard (`/admin`)

- **Active & upcoming bookings table**: equipment, student, start/end, status. Actions per row: **Cancel booking**, **Mark equipment as maintenance**.
- **Pending Requests** section: portable inventory requests with **Approve** (→ status `active`) / **Reject** (→ `cancelled`) buttons.
- **Equipment management** (light): toggle status active/maintenance.
- Realtime refresh via TanStack Query refetch on mutation; optional Supabase realtime subscription.

## UX / Styling

- Mobile-first layout, sticky bottom-safe spacing for QR CTA.
- Dark theme default with toggle.
- Neon-orange primary for CTAs, tech-blue for info, red for maintenance/cancel, muted steel for surfaces.
- Sonner toasts on all mutations.
- Empty states & loading skeletons.

## Technical notes

- Server functions (`createServerFn` + `requireSupabaseAuth`) for all booking mutations and admin actions; reads via authenticated supabase client respecting RLS.
- Bearer attacher in `src/start.ts` if not already present.
- Auth state change listener in `__root.tsx` invalidating router + queries.
- Image placeholders for equipment generated via image-gen.

## Clarifications needed before build

1. **Admin bootstrap**: how should the first admin be created? Options: (a) seed one admin by email (you provide), (b) any new user can self-select role on signup, (c) all users start as student and an existing admin promotes via UI.
2. **Auth methods**: OK with email+password + Google, or email-only?
3. **Safety briefing toggle**: should students see a "Request safety briefing" action that an admin approves, or is it purely admin-managed (admin flips the flag)?
4. **Time-slot rules**: fixed 2-hour blocks from 09:00–21:00 daily? Different hours?