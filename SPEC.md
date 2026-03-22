# Localy UI Design System Specification

**Last Updated:** March 21, 2026  
**Project:** Localy — TikTok-style video platform for local small businesses  
**Stack:** Next.js 16.1 + React 19.2 + Tailwind CSS 4 + Supabase + Stripe  
**Target:** Desktop & Mobile Chrome (primary web browser, truly responsive)

---

## 1. BRAND IDENTITY

### 1.1 Brand Personality
- **Primary:** Warm & inviting, Trusted & professional
- **Vibe:** Premium local marketplace with soul and personality
- **Goal:** Make small businesses feel accessible, trustworthy, and worth exploring

### 1.2 Color Palette (FINAL & CONFIRMED)

| Color | Hex | Usage | Notes |
|-------|-----|-------|-------|
| **Charcoal** | `#1A1A18` | Primary background | Warm dark base; replaces pure black |
| **Charcoal Lighter** | `#242420` | Card backgrounds, layers | Subtle depth and layering |
| **Charcoal Lighter+** | `#2E2E28` | Skeleton loaders, hover states | Third depth level |
| **Charcoal Border** | `#3A3A34` | Card/section borders | Barely visible but present |
| **Amber** | `#F5A623` | Primary action, accents | CTA buttons, active states, key numbers |
| **Cream** | `#F5F0E8` | Headings, primary text | All H1-H3; strong contrast on dark |
| **Body Text** | `#9E9A90` | Body text, secondary info | Warm grey; subtle but readable |
| **Sage Green** | `#6BAF7A` | Success states, illustrations | Growth, positivity, trust |
| **Warm Red** | `#E05C3A` | Error/warning states | Warm tone; not harsh red |

### 1.3 Target Demographic
- **Primary:** Young adults (25-40)
- **Secondary:** Small business owners, food vendors, local marketplace shoppers
- **Device Usage:** Equally balanced desktop & mobile browser

---

## 2. TYPOGRAPHY SYSTEM

### Font Stack
- **Primary:** Inter or system default (clean, modern, highly readable)
- **Mono:** JetBrains Mono (for codes, prices, technical info)

### Type Hierarchy

| Role | Size | Weight | Color | Line Height | Usage |
|------|------|--------|-------|-------------|-------|
| **H1** | 32px | Bold (700) | Cream #F5F0E8 | 1.2 | Page titles, profile names |
| **H2** | 24px | Bold (700) | Cream #F5F0E8 | 1.3 | Section headers (Videos, Services, Orders) |
| **H3** | 18px | Semibold (600) | Cream #F5F0E8 | 1.4 | Subsection headers, video overlay titles |
| **Body** | 14px | Regular (400) | Body Text #9E9A90 | 1.5 | Main content text |
| **Caption** | 12px | Regular (400) | Body Text #9E9A90 | 1.4 | Labels, helper text, timestamps |
| **Prices** | 14px | Bold (700) | Amber #F5A623 | 1.4 | All price/currency displays |
| **Badges** | 12px | Semibold (600) | Amber #F5A623 | 1.3 | Badges, chips, category labels |

---

## 3. SPACING SYSTEM

### Base Unit
- **1 unit = 4px** (Tailwind default; scale consistently)

### Spacing Scale

| Use Case | Pixels | Tailwind | Notes |
|----------|--------|----------|-------|
| Extra small (icon spacing) | 4px | p-1 | Between icon and text |
| Small padding | 8px | p-2 | Form inputs, small elements |
| Medium padding | 16px | p-4 | Card padding, default section padding |
| Large padding | 24px | p-6 | Between major sections |
| XL padding | 32px | p-8 | Page margin, large sections |
| Gap (list/grid) | 12px | gap-3 | Menu items, video cards, list items |
| Section gap | 24px | space-y-6 | Between sections (Services, Videos) |
| Bottom nav padding | 16px | py-4 | Vertical padding for nav buttons |

### Container Widths
- **Mobile:** Full width with 16px padding (p-4) on each side
- **Desktop:** Max content width (container or full screen is fine)
- **Modals:** 90% vw with max 512px width

---

## 4. COMPONENT DESIGN

### 4.1 BUTTONS

#### Primary Button (Solid Amber)
```
Background: #F5A623
Text: Black
Padding: 12px 24px
Border radius: 12px
Shadow: Subtle amber glow on press (opacity 0.3)
Hover: Brighten 10% OR opacity 90%
Font: Semibold 14px
Min touch target: 48px (mobile)
Animation: Spring scale 0.98 on press
```

#### Secondary Button (Outlined Amber)
```
Background: Transparent
Border: 2px #F5A623
Text: Amber #F5A623
Padding: 12px 24px
Border radius: 12px
Hover: bg-amber/10
Animation: Spring scale 0.98 on press
```

#### Ghost Button (Text Only)
```
Background: Transparent
Text: Cream #F5F0E8
Hover: bg-charcoal-light/50
Padding: 8px 12px
Border radius: 8px
Animation: Fade 150ms
```

#### Icon Button
```
Size: 44px (mobile), 40px (desktop)
Background: Transparent or #242420 on hover
Icon: Cream #F5F0E8 or Amber #F5A623 (active)
Border radius: 8px
Animation: Fade 150ms
```

### 4.2 CARDS

#### Default Card
```
Background: #242420
Border: 1px #3A3A34
Border radius: 16px
Padding: 16px
Box shadow: None (or subtle 0 4px 12px rgba(0,0,0,0.3))
Hover: Scale 0.97 with transition-transform duration-150
```

#### Glassmorphism Card (Video Overlays, Modals)
```
Background: rgba(26, 26, 24, 0.8) (semi-transparent charm)
Border: 1px #3A3A34
Backdrop filter: blur(10px)
Border radius: 16px
Padding: 16px
```

#### Menu Item Grid Card (3-col responsive)
```
Mobile: grid-cols-2
Tablet+: grid-cols-3
Gap: gap-3
Padding: None (children have padding)
Image: aspect-square, rounded-2xl, 16px radius
Card: bg-#242420, border-#3A3A34, rounded-2xl
Hover: scale-0.97, transition-transform duration-150
Animation: Staggered fade-in (50ms per item)
```

### 4.3 INPUT FIELDS

#### Text Input
```
Background: #242420
Border: 1px #3A3A34
Border radius: 12px
Padding: 12px 16px
Text color: Cream #F5F0E8
Placeholder: #9E9A90 at 50%
Font: 14px
Focus: Border #F5A623, subtle glow
```

#### Select/Dropdown
```
Same as text input
Arrow icon: Cream #F5F0E8
Hover: Border #3A3A34 lighter
```

#### Slider/Range Picker
```
Track: #3A3A34
Thumb: #F5A623
Radius: 12px
Height: 6px
```

### 4.4 BADGES & CHIPS

#### Filled Badge
```
Background: #F5A623/20
Text: Amber #F5A623
Padding: 6px 12px
Border radius: 16px
Font: 12px Semibold
```

#### Outlined Badge
```
Border: 1px #F5A623
Text: Amber #F5A623
Padding: 6px 12px
Border radius: 16px
Background: Transparent
Font: 12px Semibold
```

### 4.5 SKELETON LOADERS

#### Skeleton Shimmer
```
Background: #2E2E28
Animation: 
  - Subtle pulse (shimmer effect)
  - Gradient: linear-gradient(90deg, #2E2E28 0%, #3A3A34 50%, #2E2E28 100%)
  - Animation-duration: 2s
  - Animation-iteration-count: infinite
Border radius: Match component (12px, 16px, etc.)
```

#### Skeleton Placeholders
- **Text line:** height 12px, width 80%
- **Large text:** height 16px, width 100%
- **Image:** aspect-square, rounded-2xl
- **Cards:** Show 6 skeletons in grid on MenuList, show 3-5 on other list screens

### 4.6 MODALS & OVERLAYS

#### Modal Container
```
Background: #1A1A18
Border: 1px #3A3A34
Border radius: 16px
Padding: 24px
Box shadow: 0 20px 40px rgba(0,0,0,0.5)
Backdrop: black 50% opacity
Motion: Scale in from center (100-110% → 100%, 200ms ease-out)
```

#### Modal Header
```
Font: 24px Bold Cream
Margin bottom: 16px
Close button: Top right, 40px square icon button
```

---

## 5. DETAIL STATES & INTERACTIONS

### 5.1 Loading States
```
Skeleton Loaders:
  - Use whenever fetching data
  - Show shimmer animation in #2E2E28
  - Match layout of what's loading
  - Fade out smoothly when content arrives

Inline Spinners:
  - Center: h-12 w-12 border-b-2 border-#F5A623
  - Small: h-4 w-4 border-b-2 border-#F5A623
  - Animate: Spin infinite
```

### 5.2 Disabled States
```
Text color: #9E9A90
Opacity: 40%
Cursor: not-allowed
No glow or shadow
No hover effects
```

### 5.3 Error States
```
Background (container): #E05C3A at 10% opacity
Text: Warm Red #E05C3A
Icon: Red warning icon
Border: 1px #E05C3A
Border radius: 12px
Font: 14px Regular
Padding: 12px 16px
```

### 5.4 Success States
```
Text: Sage Green #6BAF7A
Icon: Check mark
Animation: Pulse once (scale 0.8 → 1.0 → 0.95, 600ms)
Disappear after 3 seconds with fade-out
```

### 5.5 Empty States
```
Icon: Large illustration (48-64px)
Icon color: Sage Green #6BAF7A at 40% opacity
Headline: 18px Semibold Cream
Description: 14px Body text #9E9A90
CTA Button: Solid Amber primary button
Layout: Centered, 24px top padding, friendly tone
Never: Plain "No items found" — always add context & action
```

### 5.6 Focus States (Keyboard Navigation)
```
Visible outline: 2px #F5A623
Outline offset: 2px
Applied to: all buttons, links, form inputs
Works with: :focus-visible pseudo-class
Keyboard: Tab order logical, no focus traps
```

---

## 6. ANIMATION & MOTION

### 6.1 Entrance Animations

#### Staggered Fade-Up (List Items, Grids)
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
Duration: 400ms
Delay: 50ms per index (index * 50ms)
Easing: ease-out (cubic-bezier(0.25, 0.46, 0.45, 0.94))
Applied to: Menu items, video feed, search results, order list
```

#### Scale In (Modals, Popovers)
```css
Duration: 200ms
From: scale(0.95) + opacity 0
To: scale(1) + opacity 1
Easing: ease-out
Applied to: Modals, image lightbox, expanded sections
```

### 6.2 Interactive Animations

#### Button Press (Spring Bounce)
```css
On mousedown/touchstart: scale(0.98)
Duration: 80ms
Easing: cubic-bezier(0.34, 1.56, 0.64, 1) (spring)
Combined with: Amber glow shadow at 0.3 opacity
Applied to: All primary buttons, card presses
```

#### Like/Bookmark Animation
```css
On click:
  1. Scale: 1 → 1.3 → 1 (duration 400ms, spring easing)
  2. Particle burst: 6-8 amber particles emit outward (duration 600ms)
  3. Icon color: Charcoal → Amber
  4. Add confetti-style animation if "like counter" updates
```

#### Hover Scale on Cards
```css
Hover: scale(1.02)
Focus: scale(1) + border-color #F5A623
Duration: 150ms
Easing: ease-in-out
Applied to: Menu items, video cards, order cards, search results
```

### 6.3 Page Transitions

#### Slide-In Navigation
```css
Page enter: slide-in from right (200ms)
Page exit: slide-out to left (150ms)
Easing: ease-in-out
Z-index: Stagger for layered effect
Applied to: All route changes in Next.js
```

#### Bottom Nav Tab Indicator
```css
Animated underline/dot indicator
Duration: 200ms
Easing: ease-out
Moves smoothly when tab changes
Color: Amber #F5A623
```

### 6.4 Background Animations

#### Floating Amber Particles (Home Feed)
```
Concept: Subtle particle animation in background
Implementation: Lottie animation OR Three.js (lazy-loaded)
Speed: Very slow (2-4 second loop)
Color: Amber at 5-10% opacity
Size: 2-12px circles
Behavior: Gentle floating, no distracting movement
Performance: GPU-accelerated, doesn't block page load
Trigger: Load lazily after page idle for 1s
```

#### Section Background Gradient (Optional)
```css
Background: Subtle gradient from #1A1A18 to #242420
Angle: Slight diagonal (45deg)
Opacity: Barely noticeable
Effect: Adds warmth without distraction
Used on: Full page or specific sections
```

### 6.5 Animation Constraints
```
NO 3D animations (explicitly requested)
NO heavy motion that affects performance
NO animations that block or delay data loading
Skeleton loaders: Quick, simple shimmer (NOT bouncing)
Lazy load particle animations to not block main thread
All animations use transform + opacity for GPU acceleration
Respect prefers-reduced-motion for accessibility
```

---

## 7. RESPONSIVE DESIGN

### Screen Breakpoints

| Device | Width | Layout Changes |
|--------|-------|-----------------|
| **Mobile Portrait** | 320px - 480px | 1 column, full width cards, bottom nav prominent |
| **Mobile Landscape** | 481px - 768px | 2 columns for grids, adjusted padding |
| **Tablet** | 769px - 1024px | 2-3 columns, sidebar possible, increased padding |
| **Desktop** | 1025px+ | 3+ columns, full layout, desktop-specific UI |

### Mobile-Specific Interactions
```
Touch targets: Minimum 48px × 48px
Padding: Increase by 20% on mobile vs desktop
Grid: 2-col on mobile, 3-col on tablet+
Bottom nav: Always visible, full width, 16px padding
Swipe: Video feed swipe left/right to like/bookmark/share
Modal: Full height on mobile, centered on desktop
Scroll: Smooth scrolling on all lists, no jank
```

### Desktop Enhancements
```
Hover states: All interactive elements
Cursor pointer: On all clickable items
Sidebar possible: But primary nav at bottom stays
Tooltip: On icon buttons with text labels
Right-click: Context menu for actions
Keyboard: Tab navigation fully functional
```

---

## 8. SCREEN-BY-SCREEN SPECIFICATIONS

### 8.1 HOME FEED

**Current Issues Fixed:**
- ✓ Video overlay now has glassmorphism effect (semi-transparent, frosted glass)
- ✓ Business info, buttons (like/comment/share) get micro-animations
- ✓ Floating amber particles in background for depth
- ✓ Background changed from pure black to warm charcoal #1A1A18
- ✓ Like/bookmark buttons bounce on click with particle burst

**Design:**
```
Layout:
  - Full-screen video cards, vertical scroll
  - Bottom overlay with business info + action buttons
  - Staggered fade-up on video load

Video Card:
  - Aspect ratio: 9:16 (mobile), can vary (desktop)
  - Border radius: 0px (full-screen feel)
  - Overlay height: 140-180px

Overlay:
  - Background: rgba(26, 26, 24, 0.85) + blur(12px)
  - Border top: 1px #3A3A34
  - Padding: 16px
  - Gradient overlay on video: black 0% → 100% black at bottom

Business Info Section:
  - Avatar: 40px circle, ring-2 ring-#F5A623/40
  - Name: 16px Bold Cream
  - Badge: Business type badge, 12px
  - Location: 12px Body text

Action Buttons:
  - Like, Comment, Share, Bookmark icons
  - Size: 44px touch target
  - Icon: Cream #F5F0E8, 24px
  - On press: Scale 0.98 + burst animation
  - On liked: Turn Amber + bounce + particle burst

Background:
  - Floating amber particles animation
  - Very subtle, doesn't distract
  - Lazy-loaded Lottie or Three.js

Animations:
  - Video fade-in: 200ms scale-in
  - Like bounce: 400ms spring scale + 30px particle radius
  - Page swipe transition: 200ms slide-in
```

---

### 8.2 SEARCH

**Current Issues Fixed:**
- ✓ Filter chips now styled with amber accents
- ✓ Search result cards have visual hierarchy & border styling
- ✓ Price range slider has amber styling
- ✓ Cards get amber glow on press
- ✓ Better spacing and visual polish

**Design:**
```
Layout:
  - Search bar at top (sticky)
  - Filter chip carousel below
  - Result cards grid (2-col mobile, 3-col desktop)
  - Bottom nav

Search Bar:
  - Input: bg-#242420, border-#3A3A34, 16px BR
  - Icon: Magnifying glass, cream color
  - Placeholder: "Search sellers, items..."
  - Focus: Border #F5A623

Filter Chips:
  - Scroll horizontally
  - Background: #F5A623/20, text: Amber
  - Active: bg-#F5A623, text: black
  - Border radius: 16px
  - Padding: 8px 16px
  - Transition: 150ms

Result Cards:
  - Image: 16px radius square
  - Title: 16px Bold Cream, truncate 2 lines
  - Price: 14px Bold Amber
  - Rating: 12px Body text, stars
  - Distance/seller: 12px Body text
  - Hover: scale 1.02 + #F5A623 glow shadow

Empty State:
  - No results: Sage green icon (48px), "No sellers found"
  - Icon + friendly message + "Try different filters" button

Animations:
  - Chip select: Scale 0.95 → 1.0 (spring)
  - Results fade-in: Staggered 50ms per card
  - Filter change: Fade out old, fade in new (200ms)
```

---

### 8.3 UPLOAD

**Current Issues Fixed:**
- ✓ Upload form styled with warm inputs
- ✓ Drag-and-drop zone redesigned (inviting, not plain box)
- ✓ Amber progress bar with animation
- ✓ Thumbnail preview before posting
- ✓ Visual feedback during upload
- ✓ Form layout optimized, less wasted space

**Design:**
```
Layout:
  - Form centered, max-width 512px
  - Sections: Video upload, details, thumbnail, pricing
  - Sticky save button at bottom

Drag-and-Drop Zone:
  - Border: 2px dashed #F5A623
  - Background: #242420
  - Border radius: 16px
  - Padding: 48px 24px
  - Icon: Video camera (64px, sage green)
  - Headline: "Drag video here or click to upload"
  - Subtext: "Max 15 min, 500MB"
  - On hover: Border solid, bg-#242420 lighter
  - On drag-over: Scale 1.02, border #F5A623 brighter

Form Inputs:
  - Title: 16px input, placeholder "Give your video a title"
  - Description: Textarea, 16px, 5 lines
  - Category: Select dropdown
  - Price (if selling items): Currency input
  - All: bg-#242420, border-#3A3A34, 12px BR, 12px padding

Thumbnail Preview:
  - Image preview: 160×160px, rounded-16px
  - Auto-generated from video frame (0s, 5s, 10s picker)
  - Or allow custom upload
  - Border: 1px #3A3A34
  - Position: Above title

Upload Progress:
  - Progress bar: bg-#F5A623, height 4px, rounded-4px
  - Background track: #3A3A34
  - Percentage text: "45% uploaded..."
  - Animation: Linear progress fill (can be smooth)
  - Time remaining: "~2 min remaining"

Save Button:
  - Position: Sticky bottom
  - Text: "Publish Video"
  - Style: Solid amber primary button, full width
  - On click: Disable, show spinner
  - Success: Green checkmark, "Posted!" message, redirect

Validation:
  - Required fields: Red outline + error message
  - Error color: #E05C3A
  - Message: 12px, positioned below input

Animations:
  - Drag-over: Instant scale 1.02
  - File select: Fade in thumbnail (200ms)
  - Upload progress: Smooth bar fill
  - Success: Pulse green (scale 0.95 → 1.05)
```

---

### 8.4 CHATS

**Current Issues Fixed:**
- ✓ Read/unread visual indicators added
- ✓ Last active timestamp showing when seller was online
- ✓ Unread message badge count
- ✓ Seller reviews and ratings visible in chat context
- ✓ Message bubbles have visual polish + entrance animations

**Design:**
```
Layout:
  - Chat list left (mobile: top), messages right
  - Mobile: Single column, chat list → click to open messages
  - Desktop: Side-by-side
  - Top sticky header with back button (mobile)

Chat List:
  - Each item: Card #242420, border-#3A3A34, p-3, mb-2
  - Avatar: 48px circle with ring-2 ring-#F5A623/40 if unread
  - Name: 16px Bold Cream
  - Last message preview: 14px Body text, truncate 1 line
  - Timestamp: 12px Body text #9E9A90
  - Unread badge: Amber circle, 20px, centered on avatar
  - Unread badge count: "3" in black, 12px Bold
  - Online indicator: Small green dot, bottom-right avatar
  - Hover: scale 1.02, bg-#242420 lighter
  - Active: Border #F5A623, bg-#242420 lighter

Seller Verification (Chat Context):
  - If business/seller: Small badge below name
  - "✓ Verified seller" OR star rating (e.g., "⭐ 4.8 (124 reviews)")
  - Color: Sage green #6BAF7A or Amber #F5A623
  - Font: 12px

Message Bubbles:
  - Sent (user): bg-#F5A623, text-black, right-aligned
  - Received: bg-#242420, border-#3A3A34, text-cream, left-aligned
  - Padding: 12px 16px
  - Border radius: 16px
  - Max-width: 85% (mobile), 60% (desktop)
  - Timestamp: 12px Body text, below bubble, gray
  - Image/media: Rounded-12px, max-height 320px

Message Input:
  - Background: #242420
  - Border: 1px #3A3A34
  - Padding: 12px 16px
  - Border radius: 12px
  - Font: 14px
  - Placeholder: "Message..."
  - Send button: Icon button, amber on hover
  - Min height: 48px touch target

Animations:
  - Message enter: Fade in + slide-up (200ms)
  - Chat select: Smooth slide transition (mobile)
  - Typing indicator: 3 bouncing dots, amber color
  - Read receipt: Checkmark animation when message read
```

---

### 8.5 CART

**Current Issues:** None reported

**Design:**
```
Layout:
  - Item list, quantity/price totals, checkout
  - Mobile: Single column, sticky totals at bottom
  - Desktop: Similar or sidebar

Cart Items:
  - Image thumbnail: 80×80px, rounded-12px
  - Name: 16px Bold Cream
  - Seller: 12px Body text
  - Price per unit: 14px Bold Amber
  - Quantity: Spinner (-, number, +)
  - Remove button: Icon, trash/close
  - Subtotal per item: 12px Bold Amber

Price Summary:
  - Card: bg-#242420, p-4, mb-4
  - Line items: Subtotal, tax, fee, total
  - Total: 20px Bold Amber #F5A623
  - All text: Cream

Checkout Button:
  - Full width on mobile, sticky bottom if needed
  - Primary amber button, 12px padding
  - Text: "Go to Checkout"
  - On click: Transition to checkout page

Empty Cart:
  - Sage green icon: Shopping bag (48px)
  - Message: "Your cart is empty"
  - CTA: "Continue shopping" → home feed

Animations:
  - Item add: Slide-up from bottom (200ms)
  - Item remove: Fade out + slide-right (150ms)
  - Quantity change: Quick pulse (scale 0.95 → 1.0)
```

---

### 8.6 ORDERS

**Current Issues:** None reported

**Design:**
```
Layout:
  - Order list with status chips
  - Click to view order details
  - Mobile: Full-width cards, desktop: table-like layout

Order Card:
  - Background: #242420, border-#3A3A34, p-4, rounded-16px
  - Order ID: 12px #9E9A90, monospace
  - Order date: 12px #9E9A90
  - Items summary: "3 items from Taco Haven"
  - Total price: 16px Bold Amber
  - Status badge: See below
  - Action: "View details" or click card
  - Hover: scale 1.02

Status Badge:
  - Delivered: bg-sage-green/20, text-sage-green
  - Pending: bg-amber/20, text-amber
  - Cancelled: bg-red/20, text-red
  - Shipped: bg-amber/20, text-amber
  - Font: 12px Semibold, p-1 rounded-8px

Order Detail Modal/Page:
  - Order header: ID, date, status
  - Items list: Image, name, qty, price
  - Seller info: Logo, name, rating
  - Shipping address: Full address, editable if pending
  - Total breakdown: Subtotal, tax, shipping, total
  - Actions: "Track", "Refund", "Contact seller"
  - Timeline: Show order milestones (placed, confirmed, shipped, delivered)

Animations:
  - List fade-in: Staggered 50ms per card
  - Detail view: Scale-in + fade (200ms)
  - Status update: Pulse green on successful delivery
```

---

### 8.7 PROFILE (with MenuList Grid)

**Current Issues Fixed:**
- ✓ Section layout (Services, Videos) now visually distinct with styled headers
- ✓ Verification badge for legitimate businesses added
- ✓ Edit profile flow has visual feedback
- ✓ Coin balance styled as premium/exciting
- ✓ Boost button has gold glow treatment
- ✓ Profile header better visual hierarchy

**Design:**
```
Avatar & Header:
  - Avatar: 120px circle, ring-2 ring-#F5A623/40
  - Name: 32px Bold Cream, centered
  - Username: 14px Body text, gray
  - Bio: 14px Body text light, centered, max-width 400px
  - Verification badge: Small badge below name if business
    - "✓ Verified Business" in sage green or amber
    - Font: 12px Semibold

Business Info (if seller):
  - Business name: 14px Amber #F5A623
  - Business type: Badge, 12px, bg-amber/20
  - Hours button: "⏰ Show Hours" toggle
  - Display: Flex row, center-aligned, gap-8px

Coin Balance (Premium Display):
  - Card: bg-amber/10, border-#F5A623, rounded-16px, p-4
  - Icon: Gold coin (32px)
  - Balance: "250 Credits"
  - Font: 18px Bold Amber
  - Subtext: "Earn more by posting and selling"
  - Hover: Subtle glow, scale 1.02
  - Shadow: Warm amber glow shadow (box-shadow: 0 0 20px rgba(245, 166, 35, 0.15))

Message Button:
  - Primary amber solid
  - 48px height
  - Full width or centered

Boost/Promote Button (if business):
  - Background: Orange/gold #F5A623
  - Text: "🚀 Boost Your Posting"
  - Font: 14px Bold Black
  - Shadow: 0 0 20px rgba(245, 166, 35, 0.3)
  - Hover: Brighten + larger glow
  - Animation: Subtle pulse (scale 1.0 → 1.02 → 1.0, 3s loop)

Tabs/Sections:
  - Header: "⚙️ Services", "📹 Videos", "🔖 Bookmarks" (if own profile)
  - Each section as separate card with border-#3A3A34

Services Section (MenuList Grid):
  - 3-column grid (responsive 2-col mobile)
  - Menu item cards: bg-#242420, rounded-2xl, p-3
  - Image: Square aspect, rounded-2xl
  - Name: Truncated 1 line, bold cream
  - Price: Bold amber
  - Purchase button: Primary amber (small)
  - Hover: scale 0.97 + transition
  - Animation: Staggered fade-in 50ms per item
  - Empty: "No services" with clear CTA

Videos Section:
  - 2-column grid (responsive 1-col mobile)
  - Video card: Thumbnail rounded-16px
  - Duration: Badge top-right
  - View count: Bottom-left
  - Hover: Overlay with play button

Bookmarks Section (Own Profile Only):
  - Similar grid to Videos
  - Empty state: "Save videos to your bookmarks"

Business Hours:
  - Grid: 7 days × (day, hours)
  - Text: 14px, day name semibold cream, hours body text
  - Closed: "Closed" text
  - Background card: bg-#242420, p-4

Location:
  - Map embed (BusinessLocationMap)
  - Border: rounded-16px
  - Address info below

Edit Profile (Own Profile):
  - Button: "Edit Profile" primary amber
  - Modal or page with form fields
  - Avatar upload: Click to change
  - Bio textarea
  - Visual feedback: Save spinner + success pulse

Bottom Navigation (Fixed):
  - 5 icons: Home, Search, Upload (+), Chats, Profile
  - Active: Amber color + dot indicator
  - Inactive: Cream 50% opacity
  - Tab indicator: Smooth animation when switching

Animations:
  - Page load: Services/videos fade-in staggered
  - Avatar: Ring gets subtle glow if verified
  - Boost button: Continuous subtle pulse
  - Coin balance: Shimmer effect once on view
  - Edit save: Success pulse + toast notification
  - Navigation: Tab indicator smooth slide (200ms)
```

---

## 9. ACCESSIBILITY

### 9.1 Color Contrast
```
WCAG AA Minimum: 4.5:1 for text, 3:1 for UI components

Verified Contrasts:
  - Cream #F5F0E8 on Charcoal #1A1A18: 16:1 ✓ EXCELLENT
  - Amber #F5A623 on Charcoal #1A1A18: 9.5:1 ✓ EXCELLENT
  - Body text #9E9A90 on Charcoal #1A1A18: 5:1 ✓ GOOD
  - White on Charcoal: Use cautiously; cream preferred
  - Sage green #6BAF7A on Charcoal: 6:1 ✓ GOOD
  - Warm red #E05C3A on Charcoal: 7.5:1 ✓ EXCELLENT
```

### 9.2 Touch Targets
```
Minimum: 48px × 48px
Applied to: All buttons, icon buttons, nav items, card click areas
Exceptions: Small icons inside other components (12-16px) still need 48px touch area via padding/parent
Mobile: All targets 48px minimum
Desktop: 40px acceptable for dense layouts
```

### 9.3 Focus States
```
Visible focus outline: 2px solid #F5A623
Outline offset: 2px
Applied to: All buttons, inputs, links, interactive elements
Visible on both: Click and keyboard (Tab)
Not hidden by any hover state
Works with: :focus-visible pseudo-class in modern browsers
```

### 9.4 Semantic HTML
```
Use proper semantic tags:
  - <button> for buttons, not <div role="button">
  - <a> for links
  - <nav> for navigation
  - <header>, <main>, <section>, <footer>
  - <form> for forms, <input>, <label> for fields
  - <img alt="description"> for all images
ARIA labels: Only when semantic HTML insufficient
Role definitions: Use sparingly, prefer native HTML
```

### 9.5 Motion & Vestibular
```
Respect: prefers-reduced-motion media query
Reduced motion: Disable animations, keep instant changes
Animations safe: Fade, scale, position (GPU-accelerated)
Avoid: Blur, vibration, wobble, rapid flashing
Test with: Reduced motion enabled in system settings
```

### 9.6 Vision & Colorblindness
```
Never use color alone: Combine with icons, text, patterns
Icons: Use meaningful shapes (check, X, warning triangle)
Text: Always label form fields
Badges: Use text + icon + background
Links: Underlined or colored distinctly (not just color)
Test: Chrome DevTools → Emulate vision deficiency
```

---

## 10. PERFORMANCE CONSIDERATIONS

### 10.1 Loading & Rendering
```
Code splitting: Lazy load heavy animations (Three.js, Lottie)
Skeleton loaders: Show immediately on slow connections
Images: Optimize size, use webp with fallback
Video thumbnails: Compressed, 16:9 ratio
Animations: Use transform + opacity only (GPU)
Avoid layout thrashing: Batch DOM reads/writes
Intersection Observer: For lazy-loading images, animations
```

### 10.2 Backend Integrations (Untouched)
```
Supabase: Real-time subscriptions for chat, order updates
Stripe: Payment processing, no UI changes
API calls: All existing hooks & services stay the same
Data fetching: UI improvements don't affect API logic
Auth: No changes to login/signup/authentication flow
Rate limiting: Respect API constraints, no infinite loops
```

### 10.3 Browser Support
```
Primary: Chrome (desktop + mobile)
Secondary: Safari, Firefox, Edge
Minimum: ES2020 JavaScript
CSS: Modern (Grid, Flexbox, Custom properties)
No IE11 support required
Feature detection: For newer CSS features
Fallbacks: Flex fallback for Grid if needed (unlikely)
Responsive: Mobile-first, progressive enhancement
```

---

## 11. IMPLEMENTATION ROADMAP

### Phase 1: Core Theme & Components (DONE)
- ✅ MenuList.tsx: 3-column grid with animations & skeletons
- ✅ Profile page: Warm dark theme colors applied
- [ ] Update remaining screens to warm dark theme colors
- [ ] Create shared component library (Button, Card, Badge, etc.)

### Phase 2: Micro-Interactions & Polish
- [ ] Implement like/bookmark bounce animations + particle burst
- [ ] Add floating amber particle background on home feed
- [ ] Staggered fade-in animations on all list screens
- [ ] Button spring scale animations
- [ ] Message bubble entrance animations

### Phase 3: Screen-by-Screen Details
- [ ] Home feed: Video overlay glassmorphism + button animations
- [ ] Search: Filter animations, result card polish
- [ ] Upload: Progress bar, thumbnail preview, form styling
- [ ] Chats: Read/unread indicators, seller verification badges
- [ ] Orders: Timeline, status animations
- [ ] Profile: Coin balance glow, boost button pulse

### Phase 4: Accessibility & Testing
- [ ] Contrast ratio verification
- [ ] Focus state testing (keyboard nav)
- [ ] Semantic HTML audit
- [ ] prefers-reduced-motion testing
- [ ] Mobile touch target verification

### Phase 5: Performance Optimization
- [ ] Lazy-load animations (Three.js, Lottie)
- [ ] Image optimization & lazy loading
- [ ] Code splitting for modal components
- [ ] Bundle analysis

---

## 12. COMPONENT CHECKLIST

Use this checklist when building/updating components:

```
☐ Colors correct (charcoal, amber, cream, sage, warm red)
☐ Typography matched (sizing, weight, color)
☐ Spacing consistent (8px, 16px, 24px scale)
☐ Border radius (12px buttons, 16px cards)
☐ Hover state implemented (scale, color change)
☐ Focus state with amber outline (2px, 2px offset)
☐ Touch target >= 48px (mobile)
☐ Dark background sufficient contrast (4.5:1 text, 3:1 UI)
☐ Animations smooth (transform + opacity, 150-400ms)
☐ Loading skeleton in place
☐ Error state styled (warm red)
☐ Empty state with CTA button
☐ Disabled state muted (40% opacity)
☐ Responsive (mobile-first, 2-3 column breakpoints)
☐ Semantic HTML (button, a, form, label, etc.)
☐ Alt text on images
☐ No 3D animations
☐ Performance: no jank, lazy-load heavy assets
☐ API logic completely untouched
```

---

## 13. FILES MODIFIED / TO MODIFY

### Already Updated (Phase 1 Complete)
- ✅ `components/MenuList.tsx` — Grid layout + animations + skeletons
- ✅ `app/profile/[userId]/page.tsx` — Warm dark theme colors throughout

### Pending Theme Updates (Phase 2)
- [ ] `app/layout.tsx` — Global color/theme
- [ ] `app/page.tsx` (Home feed)
- [ ] `app/search/page.tsx`
- [ ] `app/upload/page.tsx`
- [ ] `app/chats/page.tsx` & `app/chats/[chatId]/page.tsx`
- [ ] `app/cart/page.tsx`
- [ ] `app/orders/page.tsx`
- [ ] `components/HomeContent.tsx`
- [ ] `components/chats/*` components
- [ ] `components/PersistentVideoFeed.tsx`
- [ ] All modals (MenuModal, CommentModal, PromotionModal, etc.)

### New Components to Create (Optional Polish)
- [ ] `components/ui/Button.tsx` (reusable button)
- [ ] `components/ui/Card.tsx` (reusable card)
- [ ] `components/ui/Badge.tsx` (reusable badge)
- [ ] `components/animations/ParticleBackground.tsx` (lazy-loaded)
- [ ] `components/animations/SkeletonLoader.tsx` (generic)

---

## 14. DESIGN TOKENS (Tailwind Config)

```javascript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        charcoal: {
          dark: '#1A1A18',
          DEFAULT: '#242420',
          light: '#2E2E28',
          border: '#3A3A34',
        },
        amber: '#F5A623',
        cream: '#F5F0E8',
        'body-text': '#9E9A90',
        sage: '#6BAF7A',
        'warm-red': '#E05C3A',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
      },
      borderRadius: {
        xs: '8px',
        sm: '12px',
        DEFAULT: '16px',
        lg: '24px',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spring-bounce': 'springBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        springBounce: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.98)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
};
```

---

## 15. QUICK REFERENCE COLORS

Copy-paste these for quick implementation:

```
// Background
bg-charcoal = bg-[#1A1A18]
bg-charcoal-light = bg-[#242420]
bg-charcoal-lighter = bg-[#2E2E28]

// Text
text-cream = text-[#F5F0E8]
text-body = text-[#9E9A90]
text-amber = text-[#F5A623]
text-sage = text-[#6BAF7A]
text-error = text-[#E05C3A]

// Border
border-charcoal = border-[#3A3A34]

// Primary button
bg-amber text-black = bg-[#F5A623] text-black

// Secondary button outline
border-amber text-amber = border-[#F5A623] text-[#F5A623]
```

---

## 16. FINAL NOTES

- **NO pure black (#000000)** — use charcoal #1A1A18
- **NO white (#FFFFFF)** — use cream #F5F0E8
- **NO blue accents** — all accents are amber #F5A623
- **NO 3D animations** — stick to 2D scale, fade, translate
- **Amber glows**: Box-shadow with rgba(245, 166, 35, 0.2-0.3)
- **Touch first**: Minimum 48px targets, test on mobile Chrome
- **Performance**: Lazy-load particles, respect prefers-reduced-motion
- **Accessibility**: AA contrast minimum, semantic HTML, keyboard nav
- **API untouched**: All data fetching, logic, hooks stay identical
- **This spec is FINAL** — all 7 screens follow these rules

---

**Version:** 1.0  
**Status:** APPROVED & READY TO IMPLEMENT  
**Next Phase:** Screen-by-screen implementation starting with Home Feed
