# Animation Reference

> Cinematic motion design extracted from live DOM. Follow these specs exactly to recreate the experience.

## Motion Technology Stack

| Library | Type | Notes |
|---------|------|-------|
| **Web Animations API (2 active)** | animation |  |

## Scroll Journey

The page is **3,342px** tall. Each frame below shows what the user sees at that scroll depth.

> **Use these screenshots to understand WHAT animates, WHEN it animates, and HOW it moves.**

### 0% — Top / Hero
Scroll position: 0px

![Scroll 0%](../screens/scroll/scroll-000.png)

### 17% — Opening Section
Scroll position: 415px

![Scroll 17%](../screens/scroll/scroll-017.png)

### 33% — First Feature Section
Scroll position: 806px

![Scroll 33%](../screens/scroll/scroll-033.png)

### 50% — Mid-Page
Scroll position: 1,221px

![Scroll 50%](../screens/scroll/scroll-050.png)

### 67% — Lower Content
Scroll position: 1,636px

![Scroll 67%](../screens/scroll/scroll-067.png)

### 83% — Near Footer
Scroll position: 2,027px

![Scroll 83%](../screens/scroll/scroll-083.png)

### 100% — Bottom / Footer
Scroll position: 2,442px

![Scroll 100%](../screens/scroll/scroll-100.png)

## CSS Keyframes (3 extracted)

### `@keyframes _ae`

Used by: `._em`

```css
@keyframes _ae {
  0% {
    max-width: 0%;
    opacity: 0;
  }
  100% {
    max-width: 100%;
    opacity: 1;
  }
}
```

> Opacity fade · Dimension expand/collapse

### `@keyframes _af`

Used by: `._j5`

```css
@keyframes _af {
  0% {
    transform: translate3d(0px, 200%, 0px);
  }
  100% {
    transform: translate3d(0px, 0px, 0px);
  }
}
```

> Transform/motion animation

### `@keyframes loadingAnimation`

Used by: `._gq`

```css
@keyframes loadingAnimation {
  0% {
    background-position-x: -100vw;
    background-position-y: 0px;
  }
  100% {
    background-position-x: 100vw;
    background-position-y: 0px;
  }
}
```

> Background color/gradient shift · Background position (shimmer/scroll)

## Global Transition Declarations

These `transition` values were extracted from CSS rules across the site:

```css
transition: opacity 0.4s ease-in-out, width 0.4s, height 0.4s;
transition: 0.4s ease-in-out;
transition: 400ms;
transition: box-shadow 0.3s ease-in-out;
transition: height 0.2s linear;
transition: width 0.3s linear;
transition: background-color 0.218s, border-color 0.218s;
transition: background-color 0.218s;
```

## How to Recreate This Motion Design

### Step 1 — Install Dependencies

```bash
```

### Step 2 — Scroll-Reveal Pattern

Elements that animate into view follow this pattern:

```css
/* Initial hidden state */
.reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Step 3 — Key Motion Principles

- **Duration scale:** `0.4s` · `400ms` — use these values, never invent new durations
- **Always add** `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`

### Step 4 — Scroll Journey Reference

Match what happens at each scroll position:

- **0%** (`0px`) → `screens/scroll/scroll-000.png`
- **17%** (`415px`) → `screens/scroll/scroll-017.png`
- **33%** (`806px`) → `screens/scroll/scroll-033.png`
- **50%** (`1221px`) → `screens/scroll/scroll-050.png`
- **67%** (`1636px`) → `screens/scroll/scroll-067.png`
- **83%** (`2027px`) → `screens/scroll/scroll-083.png`
- **100%** (`2442px`) → `screens/scroll/scroll-100.png`

