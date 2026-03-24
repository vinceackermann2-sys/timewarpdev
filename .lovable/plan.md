

## Plan: Replace Landing Page with Zip Content

### What Changes

Replace the middle content of the homepage (`/`) with the 4 sections from the uploaded zip, while keeping:
- **Keep**: The existing orb hero with sticky header (HeroSection.tsx) 
- **Keep**: The bottom CTA ("Get to know your company's next decision" + URL input + footer) from ProductDescription.tsx
- **Replace**: Everything between the hero and bottom CTA (HeroBanner, Evolution of Labor, Value Exchange loop, Why AI CEO wins, Who is TimeWarp for) with the zip's sections

### New Sections (from zip)

1. **HowItWorks** - 4-step animated phone mockup with auto-advancing screens (Enter URL → Extract DNA → Deploy AI → Execute)
2. **LifeAndWork** - Two side-by-side photo cards ("When you're enjoying life" / "Your agent is working")
3. **GreaterGood** - "This Is TimeWarp" section with two hover cards (You are offline / Your CEO is working)

### Technical Details

**New dependency**: `motion` (framer-motion) package — used by HowItWorks and GreaterGood for AnimatePresence, motion.div, and whileHover animations.

**Files to create:**
- `src/components/landing/ZipHowItWorks.tsx` — Adapted HowItWorks component (4-step phone mockup with animated screens)
- `src/components/landing/ZipLifeAndWork.tsx` — Two photo cards section
- `src/components/landing/ZipGreaterGood.tsx` — "This Is TimeWarp" hover cards

**Files to modify:**
- `src/components/landing/ProductDescription.tsx` — Remove HeroBanner, Evolution of Labor, Autonomy Loop, Why AI CEO wins, Who is TimeWarp for sections. Replace with imports of the 3 new zip components. Keep the bottom CTA and footer unchanged.

**Adaptations needed:**
- Convert Tailwind v4 class syntax to v3 (the project uses tailwind.config.ts)
- Add `animate-pulse-slow` keyframes to index.css (or reuse existing ones)
- Add orb-related CSS for the mini orb in HowItWorks step 4 (silver connectors, etc.) — these already exist in the project's index.css from the hero
- The zip uses `bg-slate-50`, `text-slate-900` etc. (light-only). Adapt to support dark mode using existing project patterns (`bg-background`, `dark:bg-[hsl(...)]`)

