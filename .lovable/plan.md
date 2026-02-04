
# Blue Corp Pastel Theme Implementation

## Overview
Transform the entire application from the current Cosmic Purple theme to a professional Blue Corporate Pastel theme. This involves updating CSS variables, replacing hardcoded purple colors, and adjusting gradients/glows throughout the codebase.

## Color Palette - Blue Corp Pastel

### Light Mode
- **Background**: Clean white with subtle blue tint (`210 40% 98%`)
- **Primary**: Corporate blue (`210 100% 50%`)
- **Accent**: Soft pastel blue (`210 80% 90%`)
- **Accent foreground**: Deep corporate blue (`210 100% 40%`)

### Dark Mode
- **Background**: Deep navy blue (`215 25% 8%`)
- **Primary**: Bright corporate blue (`210 100% 60%`)
- **Accent**: Muted navy accent (`215 50% 20%`)
- **Accent foreground**: Light sky blue (`210 100% 70%`)

---

## Files to Update

### 1. Core Theme Configuration (`src/index.css`)
- Replace purple HSL values with blue corporate pastel values
- Update `:root` (light mode) CSS variables:
  - `--primary`: Change from `218 100% 65%` to `210 100% 50%`
  - `--accent`: Change from purple to soft blue pastel
  - `--portal-accent`: Change from `250 89%` purple to `210 100%` blue
  - `--gradient-primary`: Update from purple gradient to blue gradient
  - `--shadow-glow`: Change purple glow to blue glow
  - `--sidebar-primary`: Update to corporate blue
- Update `.dark` CSS variables:
  - Similar blue adjustments for dark mode
  - `--portal-bg-gradient`: Change from purple nebula to blue corporate gradient

### 2. QuizFunnel Component (`src/components/landing/QuizFunnel.tsx`)
- Replace hardcoded purple color `#A78BFA` with corporate blue `#60A5FA`
- Update nebula orb colors:
  - `rgba(139, 92, 246, 0.3)` to `rgba(96, 165, 250, 0.3)`
  - `rgba(167, 139, 250, 0.25)` to `rgba(147, 197, 253, 0.25)`
  - `rgba(76, 29, 149, 0.4)` to `rgba(30, 64, 175, 0.4)`
- Update underline accent colors

### 3. Hero Component (`src/components/landing/Hero.tsx`)
- Already uses semantic tokens (good)
- No changes needed

### 4. DatabaseView Component (`src/components/database/DatabaseView.tsx`)
- Update nebula background colors to blue tones
- Already uses semantic status colors (good)

### 5. CTA Component (`src/components/landing/CTA.tsx`)
- Uses semantic `gradient-primary` class (will auto-update)
- No manual changes needed

### 6. Utility Classes (`src/index.css` - @layer utilities)
- Update `.portal-card` background from purple to blue tones
- Update `.text-portal-glow` shadow color

---

## CSS Variable Changes Summary

```text
Light Mode (:root):
  --primary:           218 100% 65%  ->  210 100% 50%
  --accent:            269 100% 98%  ->  210 100% 95%
  --accent-foreground: 218 100% 65%  ->  210 100% 40%
  --portal-accent:     250 89% 66%   ->  210 100% 55%
  --sidebar-primary:   258 89% 66%   ->  210 100% 50%
  --ring:              218 100% 65%  ->  210 100% 50%

Dark Mode (.dark):
  --primary:           218 100% 65%  ->  210 100% 60%
  --accent:            273 86% 20%   ->  215 50% 20%
  --accent-foreground: 218 100% 65%  ->  210 100% 70%
  --portal-accent:     250 89% 76%   ->  210 100% 65%
  --sidebar-primary:   255 91% 76%   ->  210 100% 65%
  --sidebar-accent:    270 95% 75%   ->  210 80% 60%
```

---

## Technical Details

### Gradient Updates
Replace all purple gradients with blue equivalents:
```css
/* Before */
--gradient-primary: linear-gradient(135deg, hsl(250 89% 76%), hsl(250 89% 66%));

/* After */
--gradient-primary: linear-gradient(135deg, hsl(210 100% 65%), hsl(210 100% 50%));
```

### Glow/Shadow Updates
```css
/* Before */
--shadow-glow: 0 0 30px hsl(250 89% 66% / 0.2);

/* After */
--shadow-glow: 0 0 30px hsl(210 100% 55% / 0.2);
```

### Portal Background Gradient (Dark Mode)
```css
/* Before - Purple cosmic */
--portal-bg-gradient: linear-gradient(135deg, hsl(218 25% 6%) 0%, hsl(250 40% 15%) 50%, hsl(270 40% 20%) 100%);

/* After - Blue corporate */
--portal-bg-gradient: linear-gradient(135deg, hsl(215 25% 6%) 0%, hsl(210 40% 12%) 50%, hsl(215 50% 15%) 100%);
```

---

## Implementation Order
1. Update `src/index.css` with new Blue Corp Pastel CSS variables
2. Update `src/components/landing/QuizFunnel.tsx` hardcoded colors
3. Update `src/components/database/DatabaseView.tsx` nebula colors
4. Test light/dark/system theme switching in settings

---

## Expected Result
- Clean, professional blue corporate aesthetic
- Soft pastel blues in light mode
- Deep navy with bright blue accents in dark mode
- All existing theme switching functionality preserved
- Consistent blue branding across all pages and components
