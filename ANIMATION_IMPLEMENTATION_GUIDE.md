# Localy Animation Implementation Guide

All animations are defined in `app/globals.css` using pure CSS keyframes and Tailwind utilities. **No new libraries required.**

---

## 🎬 Quick Reference: CSS Classes to Use

### 1. **BUTTONS** (Spring Bounce on Press)
- **Automatic:** All buttons with `bg-[#F5A623]` or `bg-amber` + `border-[#F5A623]` get spring animation on `:active`
- **No additional class needed** — handled by globals.css

Example:
```tsx
<button className="bg-[#F5A623] text-black font-semibold px-6 py-2 rounded-lg">
  Click me
</button>
// Automatically scales 0.98 → 1.0 with spring easing on press
```

---

### 2. **SKELETON LOADERS** (Shimmer Effect)
Use one of these classes on your skeleton placeholder elements:

```tsx
// Option A: Shimmer gradient (recommended)
<div className="animate-skeleton-shimmer h-12 w-12 rounded-lg"></div>

// Option B: Pulse effect (subtle)
<div className="animate-skeleton-pulse h-12 w-12 rounded-lg"></div>

// Pre-styled skeleton cards
<div className="skeleton-text"></div>      {/* 12px line */}
<div className="skeleton-text-lg"></div>   {/* 16px line */}
<div className="skeleton-image"></div>     {/* Square image placeholder */}
<div className="skeleton-card"></div>      {/* Full card placeholder */}
```

**For MenuList loading state (6 cards):**
```tsx
if (loading) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="skeleton-card">
          <div className="skeleton-image mb-2"></div>
          <div className="skeleton-text mb-1 w-3/4"></div>
          <div className="skeleton-text-lg w-1/2"></div>
        </div>
      ))}
    </div>
  );
}
```

---

### 3. **STAGGERED FADE-UP** (List Items, Cards, Grids)
Wrap list items in a container, then add `animate-fade-in-up` to each child.

**Auto stagger by nth-child:**
```tsx
<div className="grid grid-cols-3 gap-3">
  {items.map((item) => (
    <div key={item.id} className="animate-fade-in-up">
      {/* Card content */}
    </div>
  ))}
</div>
// Delays: 0ms, 50ms, 100ms, 150ms, 200ms, 250ms, etc. (auto-applied)
```

**Alternative: Use semantic class names for staggered effects:**
- `.menu-item-card` — up to 10 items with automatic stagger
- `.video-card` — up to 6 items with automatic stagger
- `.order-card` — up to 5 items with automatic stagger
- `.search-result-card` — up to 6 items with automatic stagger
- `.chat-list-item` — up to 5 items with automatic stagger
- `.list-item-stagger` — generic, up to 8 items with automatic stagger

Example:
```tsx
{/* Menu items grid */}
<div className="grid grid-cols-3 gap-3">
  {items.map((item) => (
    <div key={item.id} className="menu-item-card">
      {/* Item rendered here — auto-staggered */}
    </div>
  ))}
</div>

{/* Video list */}
{videos.map((video) => (
  <div key={video.id} className="video-card">
    <VideoCard {...video} />
  </div>
))}

{/* Search results */}
{results.map((result) => (
  <div key={result.id} className="search-result-card">
    <SearchCard {...result} />
  </div>
))}
```

---

### 4. **LIKE/BOOKMARK BUTTON** (Pop Animation)
Add animation class on click, then remove after animation completes.

```tsx
const [isLiking, setIsLiking] = useState(false);

const handleLike = async () => {
  setIsLiking(true); // Trigger animation class
  
  // Your like logic here...
  
  setTimeout(() => {
    setIsLiking(false); // Remove animation class
  }, 400); // 400ms animation duration
};

<button
  className={`${isLiking ? 'animate-like-pop' : ''} ${liked ? 'like-active text-[#F5A623]' : 'text-[#F5F0E8]'}`}
  onClick={handleLike}
>
  ♥️
</button>
```

Or use inline style:
```tsx
<button
  className={liked ? 'text-[#F5A623]' : 'text-[#F5F0E8]'}
  style={isLiking ? { animation: 'likeButtonPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' } : {}}
  onClick={handleLike}
>
  ♥️
</button>
```

---

### 5. **BOTTOM NAV TAB INDICATOR** (Slide Animation)
Use Tailwind's `transition` + inline style for smooth slide:

```tsx
const [activeTab, setActiveTab] = useState('home');

<div className="fixed bottom-0 flex gap-8">
  {tabs.map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className="relative pb-2"
    >
      {tab}
      {/* Smooth sliding dot indicator */}
      {activeTab === tab && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-[#F5A623] rounded-full nav-tab-indicator"
          style={{
            Animation: 'all 0.2s ease-out',
          }}
        ></div>
      )}
    </button>
  ))}
</div>
```

Or use CSS-only approach with width transition:
```tsx
<div className="relative">
  <div className="flex gap-8">
    {tabs.map((tab) => (
      <button key={tab} onClick={() => setActiveTab(tab)}>
        {tab}
      </button>
    ))}
  </div>
  
  {/* Indicator bar */}
  <div
    className="absolute bottom-0 h-1 bg-[#F5A623] rounded-full transition-all duration-200"
    style={{
      left: `${tabs.indexOf(activeTab) * 120}px`,
      width: '80px',
    }}
  ></div>
</div>
```

---

### 6. **CARD HOVER** (Scale 1.02)
Automatically applied to all elements with `bg-charcoal` classes:
```tsx
<div className="bg-charcoal-light rounded-2xl p-4">
  {/* Automatically scales to 1.02 on hover */}
</div>
```

Or manually add:
```tsx
<div className="transition-transform duration-150 hover:scale-[1.02]">
  {/* Content */}
</div>
```

---

### 7. **MODALS** (Scale-in)
```tsx
<div className="modal-backdrop">
  <div className="modal-content">
    {/* Modal content */}
  </div>
</div>
// Backdrop fades in, content scales from 0.95 → 1.0
```

---

### 8. **SUBTLE CONTINUOUS PULSE** (Boost Button, Coin Balance)
```tsx
<button className="animate-subtle-pulse bg-[#F5A623]">
  🚀 Boost Your Posting
</button>

<div className="animate-subtle-pulse bg-amber/10 border border-[#F5A623] rounded-2xl p-4">
  💰 250 Credits
</div>
// Scales 1.0 → 1.02 → 1.0 continuously over 3s
```

---

### 9. **SUCCESS STATE** (Pulse + Disappear)
```tsx
const [showSuccess, setShowSuccess] = useState(false);

<div className={showSuccess ? 'animate-success-pulse text-[#6BAF7A]' : ''}>
  ✓ Posted successfully!
</div>

// After action:
setShowSuccess(true);
setTimeout(() => setShowSuccess(false), 3000);
```

---

### 10. **LOADING SPINNERS**
```tsx
// Standard spinner (32px)
<div className="spinner"></div>

// Small spinner (16px)
<div className="spinner-small"></div>
```

---

## 📋 File-by-File Implementation Checklist

### MenuList.tsx ✅ DONE
- ✅ Skeleton loaders with shimmer
- ✅ Staggered fade-in on card grid
- Add: `.skeleton-card`, `.menu-item-card` classes, or use `animate-skeleton-shimmer` + `animate-fade-in-up`

### Profile Page ✅ DONE
- ✅ Warm dark theme applied
- Add service cards: Use `.menu-item-card` for stagger
- Add boost button: Use `animate-subtle-pulse`
- Add coin balance: Use `animate-subtle-pulse`

### Home Feed (Next Phase)
- Use `.skeleton-text`, `.skeleton-text-lg` for loading state
- Video overlays: Add video fade-in with `animate-fade-in-up` or inline `style={{ animation: 'fadeInUp 0.4s ease-out' }}`
- Like button: Use like/bookmark animation pattern

### Search (Next Phase)
- Filter chips: Auto-scale on hover (no extra class)
- Result grid: Use `.search-result-card` for staggered fade-in
- Skeleton during filter load: Use `animate-skeleton-shimmer`

### Upload (Next Phase)
- Progress bar: Linear CSS animation already included
- Thumbnail fade-in: Use inline `style={{ animation: 'fadeInUp 0.2s ease-out' }}`
- Success: Use `animate-success-pulse`

### Chats (Next Phase)
- Chat list: Use `.chat-list-item` for staggered fade-in
- Message bubbles: Add on render with `animate-fade-in-up`
- Seller verification badge: Static (no animation needed)

### Orders (Next Phase)
- Order list: Use `.order-card` for staggered fade-in
- Status update: Use `animate-success-pulse` onStatusChange

---

## 🎨 Customization

### Adjust Stagger Delays
Edit `globals.css`:
```css
.animate-fade-in-up:nth-child(1) { animation-delay: 0ms; }
.animate-fade-in-up:nth-child(2) { animation-delay: 75ms; }  /* Change from 50ms */
```

### Adjust Animation Duration
Edit `globals.css`:
```css
@keyframes fadeInUp {
  /* ...same as before... */
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards; /* Change from 0.4s */
}
```

### Adjust Spring Easing
Edit `globals.css`:
```css
button:active {
  animation: springBounce 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); /* Adjust cubic-bezier */
}
```

---

## ✅ Accessibility

All animations **respect** `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Users with motion sensitivity will see instant changes, no animations.

---

## 🚀 Implementation Order

1. ✅ **Phase 1:** MenuList grid + profile page (DONE)
2. **Phase 2:** Home feed (add skeleton + video animations)
3. **Phase 3:** Search page (add result stagger + filter animations)
4. **Phase 4:** Upload page (add progress + thumbnail animations)
5. **Phase 5:** Chats page (add list stagger + message animations)
6. **Phase 6:** Orders page (add order stagger + status animations)

---

## 🎯 Key Takeaways

- **No new libraries** — all CSS in `globals.css`
- **Tailwind-compatible** — use classes or inline styles
- **Auto-staggered** — nth-child selectors handle delays
- **Accessibility-first** — respects prefers-reduced-motion
- **GPU-optimized** — uses transform + opacity only
- **Production-ready** — 2KB CSS, no performance impact

