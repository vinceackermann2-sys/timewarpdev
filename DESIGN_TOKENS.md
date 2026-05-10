# Design Tokens

Complete design system documentation for TimeWarp.

## Color Palette

### Primary Colors

| Token | Value | CSS | Usage |
|-------|-------|-----|-------|
| Primary | `hsl(217 91% 60%)` | `#3B82F6` | Main interactive elements, buttons, links |
| Primary Foreground | `hsl(0 0% 100%)` | `#FFFFFF` | Text on primary backgrounds |

### Neutral Colors

| Token | Value | CSS | Usage |
|-------|-------|-----|-------|
| Background | `hsl(300 20% 99%)` | `#fdfcfd` | Page background |
| Foreground | `hsl(220 39% 11%)` | Gray-900 | Primary text color |
| Secondary | `hsl(220 13% 96%)` | `#f2f4f6` | Surface backgrounds |
| Secondary Foreground | `hsl(220 39% 11%)` | Gray-900 | Text on secondary |
| Muted | `hsl(220 13% 96%)` | `#f2f4f6` | Disabled/muted elements |
| Muted Foreground | `hsl(220 9% 46%)` | Gray-500 | Text on muted |

### Interactive Colors

| Token | Value | CSS | Usage |
|-------|-------|-----|-------|
| Accent | `hsl(217 91% 96%)` | Light blue | Accent highlights |
| Accent Foreground | `hsl(217 91% 45%)` | Dark blue | Text on accent |
| Border | `hsl(220 14% 94%)` | Gray-100 | Borders, dividers |
| Input | `hsl(220 14% 90%)` | Light gray | Input field backgrounds |
| Ring | `hsl(217 91% 60%)` | `#3B82F6` | Focus rings |

### Status Colors

| Token | Value | CSS | Usage |
|-------|-------|-----|-------|
| Success | `hsl(142 71% 45%)` | Green | Success states |
| Success Foreground | `hsl(0 0% 100%)` | White | Text on success |
| Warning | `hsl(38 92% 50%)` | Orange | Warning states |
| Warning Foreground | `hsl(0 0% 0%)` | Black | Text on warning |
| Error | `hsl(0 84% 60%)` | Red | Error states |
| Error Foreground | `hsl(0 0% 100%)` | White | Text on error |
| Info | `hsl(217 91% 60%)` | Blue | Info states |
| Info Foreground | `hsl(0 0% 100%)` | White | Text on info |

### Sidebar Colors

| Token | Value | CSS | Usage |
|-------|-------|-----|-------|
| Sidebar Background | `hsl(300 20% 99%)` | `#fdfcfd` | Sidebar base |
| Sidebar Foreground | `hsl(220 39% 11%)` | Gray-900 | Sidebar text |
| Sidebar Primary | `hsl(217 91% 60%)` | `#3B82F6` | Active sidebar items |
| Sidebar Primary Foreground | `hsl(0 0% 100%)` | White | Text on active |
| Sidebar Accent | `hsl(220 13% 96%)` | `#f2f4f6` | Sidebar hover |
| Sidebar Accent Foreground | `hsl(220 39% 11%)` | Gray-900 | Text on hover |
| Sidebar Border | `hsl(220 14% 94%)` | Gray-100 | Sidebar dividers |
| Sidebar Ring | `hsl(217 91% 60%)` | `#3B82F6` | Sidebar focus |

### Special Colors

| Token | Value | CSS | Usage |
|-------|-------|-----|-------|
| Card | `hsl(0 0% 100%)` | White | Card backgrounds |
| Card Foreground | `hsl(220 39% 11%)` | Gray-900 | Card text |
| Popover | `hsl(0 0% 100%)` | White | Popover backgrounds |
| Popover Foreground | `hsl(220 39% 11%)` | Gray-900 | Popover text |

### Browser Chrome

| Token | Value | CSS | Usage |
|-------|-------|-----|-------|
| Browser BG | `hsl(300 20% 99%)` | `#fdfcfd` | Browser frame |
| Browser Header | `hsl(220 13% 96%)` | `#f2f4f6` | Browser header bar |
| Browser Dot Red | `hsl(0 84% 60%)` | Red | Close button |
| Browser Dot Yellow | `hsl(38 92% 50%)` | Orange | Minimize button |
| Browser Dot Green | `hsl(142 71% 45%)` | Green | Maximize button |

## Typography

### Font Families

| Type | Font | Fallback Stack |
|------|------|-----------------|
| Sans | Plus Jakarta Sans | `ui-sans-serif, system-ui, sans-serif` |
| Mono | IBM Plex Mono | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas` |
| Serif | Georgia | `ui-serif, Cambria, Times New Roman, Times, serif` |

### Font Weights

```css
IBM Plex Sans: 400, 500, 600, 700
Plus Jakarta Sans: 400+
Montserrat: 400, 500, 600, 700
Cormorant Garamond: 400, 500, 600, 700
IBM Plex Mono: 400, 700
Inter: 400, 500, 600, 700
Lora: 400, 500, 600, 700
Space Mono: 400, 700
```

## Spacing & Border Radius

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| Large (lg) | `1rem` (16px) | Cards, modals, major components |
| Medium (md) | `calc(1rem - 2px)` (14px) | Buttons, inputs |
| Small (sm) | `calc(1rem - 4px)` (12px) | Small interactive elements |

### Container

- Max width: `1400px` (2xl breakpoint)
- Padding: `2rem`

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| 2xs | `0 1px 2px 0 rgba(31, 41, 55, 0.04)` | Minimal elevation |
| xs | `0 1px 2px 0 rgba(31, 41, 55, 0.05)` | Subtle shadows |
| sm | `0 1px 3px 0 rgba(31, 41, 55, 0.06), 0 1px 2px -1px rgba(31, 41, 55, 0.04)` | Small elements |
| md | `0 4px 10px -2px rgba(31, 41, 55, 0.06), 0 2px 6px -2px rgba(31, 41, 55, 0.04)` | Medium depth |
| lg | `0 10px 24px -4px rgba(31, 41, 55, 0.08), 0 4px 10px -4px rgba(31, 41, 55, 0.05)` | Cards, modals |
| xl | `0 20px 40px -8px rgba(31, 41, 55, 0.10), 0 8px 16px -6px rgba(31, 41, 55, 0.06)` | Large elevation |
| 2xl | `0 30px 60px -12px rgba(31, 41, 55, 0.18)` | Maximum elevation |

### Glow Shadows

| Token | Value | Usage |
|-------|-------|-------|
| Shadow Glow | `0 0 12px rgba(59, 130, 246, 0.10)` | Subtle glow |
| Shadow Glow LG | `0 0 24px rgba(59, 130, 246, 0.15)` | Large glow |

## Animations & Keyframes

### Keyframes

#### Accordion
```css
accordion-down: height: 0 → var(--radix-accordion-content-height) | 0.2s
accordion-up: height: var(--radix-accordion-content-height) → 0 | 0.2s
```

#### Fade & Slide
```css
fade-in: opacity(0 → 1), translateY(10px → 0) | 0.5s
fade-in-up: opacity(0 → 1), translateY(20px → 0) | 0.6s
slide-in-right: opacity(0 → 1), translateX(20px → 0) | 0.5s
```

#### Float & Pulse
```css
float: translateY(0 → -10px → 0) | 3s infinite
pulse: opacity(1 → 0.5 → 1) | 2s infinite
```

#### Marquee
```css
marquee: translateX(0% → -50%) | 20s infinite
```

### Orb Animations

```css
orb-pulse: scale(1 → 1.05 → 1), brightness(1 → 1.1 → 1) | 4s infinite
pulse-slow: opacity(0.2 → 0.3 → 0.2) | 4s infinite
shimmer: background-position(-200% → 200%) | 2s infinite
glow: box-shadow expanding | 2s infinite
starfall: translateY(-100vh → 100vh), opacity(1 → 0) | infinite
nebula-drift: translate(0,0) → translate(30px,-20px) → translate(-20px,15px) → translate(0,0) | 20s infinite
pulse-glow: opacity(0.3 → 0.5 → 0.3), scale(1 → 1.1 → 1) | 4s infinite
star-loading: opacity(0 → 1 → 0), scale(0 → 1.2 → 0), rotate(0 → 180 → 360) | 1.5s
```

### Text Animations

```css
onboarding-text-shine: background-position(left → right) | 3s infinite
shimmer-text: gradient animation across text | 2s infinite
text-shine-blue: blue gradient sweep left to right | 3s infinite
shine-sweep: opacity & position sweep | 6s infinite
stream-reveal: translateY(4px → 0), blur(1px → 0) | 0.35s
```

### Edge & Connector Animations

```css
edge-rotate: rotate(0deg → 360deg) | 12s infinite
edge-rotate-seamless: rotate(0deg → 360deg) continuous | 12s infinite
connector-extend-seamless: clip-path circle(0% → 60% → 0%) | variable duration
```

## Gradients

### Primary Gradient
```css
linear-gradient(135deg, hsl(217 91% 60%), hsl(217 91% 50%))
```

### Accent Gradient
```css
linear-gradient(135deg, hsl(217 91% 65%), hsl(217 91% 55%))
```

### Portal Background
```css
linear-gradient(180deg, hsl(300 20% 99%) 0%, hsl(220 13% 97%) 100%)
```

## Orb System

### Orb Core Gradient
```css
radial-gradient(circle at 30% 30%,
  rgba(255, 255, 255, 1) 0%,      /* --orb-core-start */
  rgba(209, 227, 255, 1) 20%,     /* --orb-core-mid1 */
  rgba(133, 176, 255, 1) 50%,     /* --orb-core-mid2 */
  rgba(74, 134, 255, 1) 100%      /* --orb-core-end */
)
```

### Orb Shadows
```css
Inset Dark: rgba(0, 0, 0, 0.1)
Inset Light: rgba(255, 255, 255, 0.8)
Outer: rgba(133, 176, 255, 0.3)
Glow: rgba(133, 176, 255, 0.3)
```

### Orb Trail Colors
```css
--orb-trail-dim: rgba(180, 180, 200, 0.3)
--orb-trail-mid: rgba(200, 200, 220, 0.6)
--orb-trail-bright: rgba(220, 220, 240, 0.9)
--orb-trail-peak: rgba(255, 255, 255, 1)
--orb-trail-bg: white
```

### Orb Shine
```css
--orb-shine: rgba(255, 255, 255, 1)
--orb-shine-mid: rgba(255, 255, 255, 0.9)
--orb-shine-fade: rgba(255, 255, 255, 0.5)
```

## Charts & Data Visualization

| Token | Value | Usage |
|-------|-------|-------|
| Chart 1 | `hsl(217 91% 60%)` | Primary chart color |
| Chart 2 | `hsl(217 91% 75%)` | Secondary chart color |
| Chart 3 | `hsl(220 13% 60%)` | Tertiary chart color |
| Chart 4 | `hsl(220 39% 30%)` | Quaternary chart color |
| Chart 5 | `hsl(220 9% 46%)` | Quinary chart color |

## Portal & Special Effects

### Portal Theme
```css
--portal-accent: hsl(217 91% 60%)              /* Main blue accent */
--portal-accent-bright: hsl(217 91% 70%)       /* Brighter variant */
--portal-glow: hsl(217 91% 60%)                /* Glow color */
--portal-bg-gradient: linear-gradient(180deg, ...)  /* Background */
```

### Utility Classes

```css
.gradient-primary          /* Primary gradient background */
.gradient-accent           /* Accent gradient background */
.text-gradient            /* Gradient text fill */
.text-portal-glow         /* Portal glow text shadow */
.shadow-glow              /* Subtle glow shadow */
.shadow-glow-lg           /* Large glow shadow */
.glass-portal             /* Glassmorphism effect */
.portal-bg                /* Portal background */
.portal-card              /* Portal card styling */
.portal-button            /* Portal button styling */
.canvas-node-smooth       /* Smooth node transitions */
.animate-*                /* Animation utility classes */
.orb-container            /* Orb container base styles */
.orb-core                 /* Orb core element */
.orb-stage                /* Orb stage wrapper */
.orb-glow-aura            /* Orb glow effect */
```

## CSS Variables Reference

```css
/* Root Variables */
:root {
  --sz: 120px;                          /* Orb size reference */
  --radius: 1rem;                       /* Global border radius */
  --spacing: 0.25rem;                   /* Base spacing unit */
  --tracking-normal: 0em;               /* Letter spacing */

  /* All color tokens from above */
  /* All shadow tokens from above */
  /* All gradient tokens from above */
  /* All animation tokens from above */
}
```

## Usage Examples

### Using Color Tokens

```jsx
// Tailwind classes
<button className="bg-primary text-primary-foreground">
  Click me
</button>

// CSS
button {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
```

### Using Animations

```jsx
// Tailwind classes
<div className="animate-fade-in">
  Content
</div>

<div className="animate-float">
  Floating element
</div>

// CSS
.element {
  animation: fade-in 0.5s ease-out forwards;
}
```

### Using Shadows

```jsx
// Tailwind classes
<div className="shadow-lg">
  Card with large shadow
</div>

// CSS with glow
<div className="shadow-glow">
  Element with glow effect
</div>
```

### Using Gradients

```jsx
// Tailwind classes
<div className="gradient-primary">
  Primary gradient
</div>

// CSS
.element {
  background: var(--gradient-primary);
}
```

## Theme Modes

### Light Theme (Default)
All tokens are optimized for light mode with:
- Light backgrounds (`#fdfcfd`)
- Dark foreground text
- Blue primary color (`#3B82F6`)
- Subtle shadows

### Dark Mode
Currently aliased to light theme for visual consistency. Can be extended by targeting `.dark` class.

### Force Light
Override theme with `.force-light` class:
```css
.force-light {
  /* All color tokens redefined for forced light appearance */
}
```

## Asset References

- **Favicon**: `/public/favicon.svg`, `.png`, `.ico`
- **Logo**: `/src/assets/timewarp-logo.svg`, `.png`
- **Icons**: `/src/assets/` directory
- **Backgrounds**: Hero images and texture files in `/src/assets/`

---

**Last Updated**: 2026-05-10
**Framework**: Tailwind CSS + Custom CSS Variables
**Font Sources**: Google Fonts
