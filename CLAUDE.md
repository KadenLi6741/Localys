# CLAUDE.md — Localys

## Project
Localys is a location-based web app that helps users discover and support small local businesses. It blends **TikTok** (vertical video feed), **Reddit** (community forums/reviews), and **Uber Eats** (ordering/cart). Built for the FBLA Coding & Programming competition (topic: "Byte-Sized Business Boost").

## Tech stack
- **Framework:** Next.js 16 (App Router, React 19)
- **Language:** TypeScript 5.9 (strict — never use `any`)
- **DB/Auth/Storage/Realtime:** Supabase (Postgres)
- **Payments:** Stripe (use TEST mode for dev/demo)
- **Styling:** Tailwind CSS 4
- **Theming:** next-themes (class strategy, default dark)
- **State:** React Context + custom hooks
- **Lint:** ESLint 9

## Commands (run from `video-platform/`)
- Dev: `npm run dev`  → http://localhost:3000
- Build: `npm run build` then `npm start`
- Lint: `npm run lint`
- Always run `npm run lint` and confirm the build passes before considering a task done.

## Project structure
- `app/` — App Router pages + API routes (`(auth)/`, `api/`, `chats/`, `profile/`, `search/`, `upload/`, `video/`, `buy-coins/`)
- `components/` — reusable UI
- `contexts/` — React Context providers
- `hooks/` — custom hooks
- `models/` — TypeScript interfaces/types
- `services/` — business logic (OOP service classes)
- `lib/supabase/` — Supabase client + data access; `lib/utils/` — helpers (geolocation, sharing)
- `supabase/migrations/` — SQL migrations (run in order)

## Design system (STRICT — this is the visual identity)
SoundCloud-inspired, flat, content-forward, with **orange** as the only brand accent.

- **Colors:** use the semantic tokens in `app/globals.css` only. NEVER hardcode hex values in components.
  - Surfaces: `bg-background`, `bg-card`, `bg-surface`, `bg-secondary`
  - Text: `text-foreground` (primary), `text-muted-foreground` (secondary/placeholder)
  - Accent/CTA: `bg-primary` / `text-accent` — orange `#f97316` is the ONLY accent and CTA color
  - Borders: `border-border`
- **Light + dark:** every component must work in both. Dark = near-black `#121212` (default). Light = white `#ffffff`.
- **Corners:** 4px squared (`rounded-[4px]`) on buttons, inputs, badges, cards. No pill shapes, no large radii.
- **Elevation:** FLAT. No drop shadows. Use inset hairlines: `shadow-[inset_0_0_0_1px_var(--border)]`.
- **No gradients** on UI surfaces. **No second saturated accent color.**
- **Typography:** Inter (Söhne substitute), weights 100/400/600/700. Weight 100 only at display scale (60px). Body text never below 14px.
  - Scale tokens: caption 12 / body-sm 14 / body 17 / subheading 22 / heading-sm 28 / heading 36 / display 60
- **Layout:** persistent left sidebar (Home, Explore, Upload, Messages, Cart); top-right header (points pill, search, notifications, theme toggle, profile). Max content width ~1200px, 48–64px section gaps. Collapse to a sheet/drawer on tablet.

## Component conventions
- **shadcn** only for complex primitives: sidebar, sheet, dropdown-menu, dialog, tabs, chart. Align them to the existing tokens (`--primary`, `--card`, `--muted-foreground`, `--border`, `--input`, `--ring`, `--radius`).
- Keep the **in-house buttons/inputs/cards** — just ensure they're fully tokenized. One source of truth per component; do not create duplicate component systems.
- Reference TikTok (Home feed) and Reddit (Explore) for *layout/structure*, but keep content original.

## Coding conventions
- Modular components, clear and complete comments, consistent naming.
- Strict TypeScript, no `any`. Validate user input (format + meaning) with friendly error messages; never crash on bad input.
- When restyling, change presentational markup only — DO NOT break Supabase queries, hooks, or handlers.
- Add alt text, visible focus states, keyboard nav, and aria labels on icon buttons (accessibility is scored).

## Competition constraints (important)
- App should degrade gracefully on unreliable wifi: support a seeded/offline demo path and graceful loading/error states (no blank screens). Use Stripe test mode for demos.
- Document any libraries / open-source / copyrighted assets used (required for judges). Keep landing-page design original — recreate patterns/motion, not exact copies of other sites.

## Workflow notes
- Work one screen/feature per session; commit after each working chunk.
- Prefer small, targeted edits over full-file rewrites.
- After UI changes, verify light/dark toggle and responsiveness (desktop → tablet) with no console errors.
