# Localy UI Design System Specification

**Last Updated:** June 12, 2026
**Project:** Localy — TikTok-style video platform for local small businesses
**Stack:** Next.js 16.1 · React 19.2 · TypeScript 5.9 · Tailwind CSS 4 · Supabase · Stripe
**Targets:** Desktop & tablet web (Chrome-first), fully responsive
**Themes:** Light **and** dark, driven entirely by design tokens

---

## 1. BRAND IDENTITY

### 1.1 Personality
- **Aesthetic:** Flat and almost shadowless, inspired by SoundCloud. Definition comes from **1px hairlines** and **grayscale shifts**, never from drop shadows.
- **Color comes from content.** Business videos, photos and album-style thumbnails supply the color; the chrome stays neutral so the content pops.
- **One accent only:** orange `#f97316`. No second saturated color, no gradients on UI surfaces.

### 1.2 Core rules (non-negotiable)
- **Squared corners — 4px** on every button, input, badge and card. Never pill shapes or large radii. (Avatars are the only circles, via `rounded-full`.)
- **No drop shadows** on cards/buttons. Use `box-shadow: inset 0 0 0 1px var(--border)` for definition; hover lifts use an inset **orange** hairline.
- **No gradients** on UI surfaces.
- **Orange is the only accent** and the primary CTA color in both themes.
- **Dark** canvas is near-black `#121212`; **light** canvas is white `#ffffff`.

---

## 2. COLOR TOKENS

All color is expressed as CSS custom properties in [`app/globals.css`](video-platform/app/globals.css). Components reference **tokens**, never raw hex, so the entire app re-themes by flipping the `.dark` class on `<html>`.

### 2.1 Surface & accent tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `#ffffff` | `#121212` | Page canvas |
| `--foreground` | `#121212` | `#ffffff` | Primary text |
| `--card` | `#ffffff` | `#1a1a1a` | Card / panel surface |
| `--popover` | `#ffffff` | `#1a1a1a` | Menus, dropdowns |
| `--primary` | `#f97316` | `#f97316` | **Orange** CTA / accent |
| `--primary-foreground` | `#ffffff` | `#ffffff` | Text on orange |
| `--secondary` / `--muted` | `#f2f2f2` | `#303030` | Subtle blocks |
| `--muted-foreground` | `#666666` | `#999999` | Secondary text / placeholders |
| `--surface` | `#f2f2f2` | `#303030` | Filled inputs / panels |
| `--surface-2` | `#e6e6e6` | `#666666` | Hover / nested surfaces |
| `--border` / `--input` | `#cccccc` | `rgba(255,255,255,.12)` | Hairlines |
| `--ring` | `#f97316` | `#f97316` | Focus ring |
| `--destructive` | `#dc2626` | `#ef4444` | Errors |
| `--success` | `#16a34a` | `#22c55e` | Success |
| `--warning` | `#d97706` | `#f59e0b` | Warnings |

These are exposed to Tailwind via `@theme inline` as `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border`, `bg-surface`, `bg-card`, etc.

### 2.2 Legacy alias layer (how the whole app inherited the system)
The pre-existing 2,700-line component layer referenced names like `--color-accent`, `--color-bg-secondary`, `--color-text-primary`, `--color-border`, `--accent-blue`, `--dark-text`. Rather than rewrite every consumer, each legacy name is **re-pointed at a token** in `:root` (e.g. `--color-accent: var(--primary)`, `--dark-text: var(--foreground)`). Because the aliases read the base tokens through `var()`, the `.dark` block only overrides the base tokens and the entire app — including untouched components — flips automatically.

### 2.3 Contrast (WCAG-AA verified)
- `#ffffff` on `#121212` (dark body text): **~17:1**
- `#121212` on `#ffffff` (light body text): **~17:1**
- `#ffffff` on `#f97316` (CTA label): **~3.6:1** (AA for large/bold UI text)
- `#666666` on `#ffffff` (light secondary): **~5.7:1**

---

## 3. TYPOGRAPHY

- **Typeface:** Inter (a Söhne substitute), loaded via `next/font` as `--font-inter` at weights **100 / 400 / 600 / 700**. Weight 100 is reserved for display-scale hero text; 400 body, 600 subheads, 700 button labels.
- **Mono:** JetBrains Mono (`--font-mono`) for prices / codes.
- **Body never below 14px.**

### Type scale (`@theme inline`)

| Token | Size | Typical use |
|-------|------|-------------|
| `text-caption` | 12px | Labels, timestamps |
| `text-body-sm` | 14px | UI text, buttons |
| `text-body` | 17px | Reading content |
| `text-subheading` | 22px | Subheads |
| `text-heading-sm` | 28px | Section headers |
| `text-heading` | 36px | Page titles |
| `text-display` | 60px | Hero (weight 100) |

---

## 4. SPACING & RADIUS
- **Base unit:** 4px. Section gaps **48–64px**; card padding **16px**; page max-width **~1200px**.
- **Radius:** `--radius: 4px`. Tailwind's `rounded-sm … rounded-3xl` are all overridden to 4px in `@theme inline` so nothing renders large/pill. Avatars use `rounded-full`.

---

## 5. COMPONENTS

### 5.1 Buttons ([`components/ui/button.tsx`](video-platform/components/ui/button.tsx), shadcn + cva)
- **Primary (CTA):** `bg-primary text-primary-foreground rounded-[4px] font-bold`, hover `bg-primary/90`.
- **Secondary / outline:** transparent, `border border-border`, hover `bg-surface`.
- **Ghost:** `text-muted-foreground hover:bg-surface hover:text-foreground`.
- **Disabled:** `opacity-40`, `cursor-not-allowed`, no hover.

### 5.2 Inputs
`bg-surface border border-border rounded-[4px] px-4 py-3 text-foreground placeholder:text-muted-foreground`, focus `border-primary` + `bg-surface-2`, no glow.

### 5.3 Cards
Flat: `bg-card border border-border rounded-[4px] p-4`. No drop shadow. Hover affordance = inset orange hairline. 1:1 thumbnails, `rounded-[4px]` images.

### 5.4 Badges / chips
Squared 4px. Filled = `bg-primary text-primary-foreground` (or `bg-primary/15 text-primary`); active filter chips = solid orange.

### 5.5 Overlays
- **Dropdown menu** ([`components/ui/dropdown-menu.tsx`](video-platform/components/ui/dropdown-menu.tsx)) — Radix, `bg-popover` + hairline border.
- **Sheet / drawer** ([`components/ui/sheet.tsx`](video-platform/components/ui/sheet.tsx)) — Radix dialog, `bg-card`, `bg-black/50` scrim.

---

## 6. LAYOUT & NAVIGATION

Desktop-first web app. Chrome lives in [`components/LayoutShell.tsx`](video-platform/components/LayoutShell.tsx):

- **Left sidebar** ([`DesktopSidebar.tsx`](video-platform/components/DesktopSidebar.tsx), `lg+`): logo + five primary destinations — **Home, Explore, Upload, Messages, Cart**. Active item is orange with a left hairline bar. Content is offset `lg:pl-60`.
- **Top header** ([`AppHeader.tsx`](video-platform/components/AppHeader.tsx), sticky): right cluster in order — **reward-points pill · Search · Notifications · Theme toggle · Profile avatar (dropdown)**.
- **Below `lg`:** sidebar collapses; the mobile logo appears in the header and the five destinations move to a bottom nav ([`AppBottomNav.tsx`](video-platform/components/AppBottomNav.tsx)). The bottom bar (rather than a header drawer) is used on mobile because the immersive home video feed overlays the header.
- **Auth routes** (`/login`, `/signup`, `/reset-password`) bypass the chrome and render full-screen.
- The **home feed** renders separately via [`PersistentVideoFeed.tsx`](video-platform/components/PersistentVideoFeed.tsx) as a full-screen overlay with its own immersive header.

---

## 7. THEMING ENGINE

- **`next-themes`** with `attribute="class"`, `defaultTheme="dark"`, `enableSystem`, `disableTransitionOnChange` — see [`app/providers.tsx`](video-platform/app/providers.tsx).
- Toggling adds/removes `.dark` on `<html>`; `@custom-variant dark (&:is(.dark *))` and the `.dark { … }` token block flip every token.
- next-themes injects an SSR script so there is **no light/dark flash** on load. `<html suppressHydrationWarning>` in [`app/layout.tsx`](video-platform/app/layout.tsx).
- Toggle UI: [`components/ThemeToggle.tsx`](video-platform/components/ThemeToggle.tsx) (sun in dark, moon in light; mounted-guarded to avoid hydration mismatch).

---

## 8. ACCESSIBILITY
- **Contrast:** AA in both themes (§2.3).
- **Focus:** visible `2px` orange ring (`ring-ring` + offset) on all interactive elements, via `:focus-visible`.
- **Touch targets:** ≥ 40px (icon buttons `h-10 w-10`; nav targets larger).
- **Semantics:** `<button>`, `<a>`, `<nav aria-label>`, `<label>`; icon-only buttons carry `aria-label`; decorative SVGs are `aria-hidden`.
- **Motion:** `prefers-reduced-motion` disables animations (globals.css).

---

## 9. LIBRARIES ADDED (for documentation)
| Library | Purpose |
|---------|---------|
| `next-themes` | Class-based light/dark, no-flash SSR |
| `lucide-react` | Icon set (nav, header) |
| `@radix-ui/react-dropdown-menu` | Accessible profile dropdown |
| `@radix-ui/react-dialog` | Accessible sheet/drawer |
| `class-variance-authority`, `clsx`, `tailwind-merge` | shadcn primitive styling (`cn`) |

shadcn config: [`components.json`](video-platform/components.json); util: [`lib/utils.ts`](video-platform/lib/utils.ts).

---

## 10. STATUS

| Area | State |
|------|-------|
| Token system (light + dark) | ✅ Done & verified (no console errors) |
| Theme engine, fonts | ✅ Done & verified both themes |
| Shared component layer (cards, inputs, badges, chat bubbles, orders, profile blocks, modals) | ✅ Re-themed via token remap |
| Navigation chrome (sidebar, header, bottom nav) | ✅ Built, type-checked, tokenized |
| Auth screens (login / signup / reset) | ✅ Tokenized & verified both themes |
| 7 authenticated screens fine-tuning + remaining hardcoded-color long tail | ⏳ In progress — needs a test login for visual verification |

**Version:** 2.0 — SoundCloud-orange, light + dark. Supersedes the v1 amber/charcoal spec.
