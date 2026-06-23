# Interaction Reference

> Micro-interactions extracted from live DOM. Recreate these exactly for authentic feel.

## Coverage

| Component Type | Count | States Captured |
|----------------|-------|----------------|
| Button | 3 | default, hover, focus |
| Role Button | 1 | default, hover, focus |
| Link | 3 | default, focus |
| Input | 1 | default, hover, focus |

## Transition System

These transition declarations were extracted from interactive elements:

```css
transition: background 0.2s cubic-bezier(0, 0, 1, 1);
transition: all;
```

Apply these to all interactive elements. Never invent new durations or easings.

## Button Interactions

### Button 1 — `Main navigation menu`

**States:**

- Default: `../screens/states/button-1-default.png`
- Hover: `../screens/states/button-1-hover.png`
- Focus: `../screens/states/button-1-focus.png`

**On hover:**

```css
/* box-shadow: none → */ box-shadow: rgba(0, 0, 0, 0.04) 999px 999px 0px 0px inset;
```

**On focus:**

```css
/* box-shadow: none → */ box-shadow: rgb(255, 255, 255) 0px 0px 0px 2px inset, rgb(39, 110, 241) 0px 0px 0px 2px;
```

**Transition:** `background 0.2s cubic-bezier(0, 0, 1, 1)`

### Button 2 — `Search here`

**States:**

- Default: `../screens/states/button-2-default.png`
- Hover: `../screens/states/button-2-hover.png`
- Focus: `../screens/states/button-2-focus.png`

**On hover:**

```css
/* background-color: rgb(0, 0, 0) → */ background-color: rgb(40, 40, 40);
```

**Transition:** `all`

### Button 3 — `Opt out`

**States:**

- Default: `../screens/states/button-3-default.png`
- Hover: `../screens/states/button-3-hover.png`
- Focus: `../screens/states/button-3-focus.png`

**On hover:**

```css
/* box-shadow: none → */ box-shadow: rgba(0, 0, 0, 0.04) 999px 999px 0px 0px inset;
```

**On focus:**

```css
/* box-shadow: none → */ box-shadow: rgb(255, 255, 255) 0px 0px 0px 2px inset, rgb(39, 110, 241) 0px 0px 0px 2px;
```

**Transition:** `background 0.2s cubic-bezier(0, 0, 1, 1)`

## Role Button Interactions

### Role Button 1 — `Deliver now`

**States:**

- Default: `../screens/states/role-button-1-default.png`
- Hover: `../screens/states/role-button-1-hover.png`
- Focus: `../screens/states/role-button-1-focus.png`

**Transition:** `all`

_No visible style changes detected for this element._

## Link Interactions

### Link 1 — `Sign up`

**States:**

- Default: `../screens/states/link-1-default.png`
- Focus: `../screens/states/link-1-focus.png`

**Transition:** `all`

_No visible style changes detected for this element._

### Link 2 — `Log in`

**States:**

- Default: `../screens/states/link-2-default.png`
- Focus: `../screens/states/link-2-focus.png`

**Transition:** `all`

_No visible style changes detected for this element._

### Link 3 — `Create a business account`

**States:**

- Default: `../screens/states/link-3-default.png`
- Focus: `../screens/states/link-3-focus.png`

**Transition:** `all`

_No visible style changes detected for this element._

## Input Interactions

### Input 1 — `Enter delivery address`

**States:**

- Default: `../screens/states/input-1-default.png`
- Hover: `../screens/states/input-1-hover.png`
- Focus: `../screens/states/input-1-focus.png`

**Transition:** `all`

_No visible style changes detected for this element._

## Interaction Rules

- Accent color `#dfeffe` is used for focus rings, active states, and hover highlights
- Hover effects include **color transitions** — use the extracted values, not approximations
- Transition durations in use: `0.2s`
- Always respect `prefers-reduced-motion` — set all transitions to `0s` when enabled

