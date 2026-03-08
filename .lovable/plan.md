

# Visual Identity Pipeline Overhaul

## Summary of Changes

Five changes to the `scrape-product` edge function and one to the `BrandExtendedSections` frontend component.

---

## 1. Moodboard: Download from Pinterest (no AI generation)

**Current**: Search web → screenshot results → AI-recreate each image.
**New**: Search Pinterest specifically → download pin image URLs directly. No AI recreation step.

- Change Firecrawl search queries to `site:pinterest.com {term} aesthetic`
- Extract the actual pin image URL from the scraped page links/metadata instead of screenshots
- Remove the entire "Step 3: AI-recreate" loop — use the Pinterest image URLs directly as moodboard images
- Fallback: if Pinterest fails, try `site:unsplash.com` for direct image URLs

## 2. Illustrations: Icons only (no text), grounded in brand + audience

**Current**: Generates icon grid + pattern sheet as two separate images.
**New**: 
- **Icon grid**: Keep the 3×4 grid approach but strengthen the prompt to explicitly forbid any text, labels, or words. Emphasize icons must represent brand/audience concepts.
- **Pattern sheet**: Keep generating patterns but add explicit "NO TEXT of any kind" instruction. Patterns should be abstract visual patterns only.

## 3. Website & Digital: Screenshot base URL, not product page

**Current**: Screenshots `formattedUrl` (the product page URL the user entered).
**New**: Extract base URL (`new URL(formattedUrl).origin`) and screenshot that instead for both desktop and mobile. This captures the brand's homepage rather than a specific product page.

## 4. Buttons & UI: Style with brand colors

**Current**: Hardcoded Tailwind classes (`bg-primary`, `border-border`, `bg-muted`).
**New**: Apply inline styles from `initialData` brand colors:
- Primary Button: `background: colors.primary`, `color: colors.text` (or white)
- Secondary Button: `border: 1px solid colors.primary`, `color: colors.primary`, transparent bg
- Muted Button: `background: colors.secondary` with reduced opacity, `color: colors.text`
- Keep the rounded-[20px] and font styling

This change is in `BrandExtendedSections.tsx`, reading colors from the brand context.

## 5. Social Media: Generate UGC product images

**Current**: Empty placeholder slots ("Feed post", "Story", "Reel") with no generated content.
**New**: Add three AI image generation calls in `scrape-product/index.ts` that create UGC-style product images:
- **Feed post** (1:1): Product in lifestyle/UGC setting based on audience data
- **Story** (9:16): Vertical UGC-style product shot
- **Reel** (1:1): Product-in-use action shot

Each prompt grounded in audience description, brand colors, and product images. Store as `socialMediaUrls: string[]` in `visualIdentity`.

Update `BrandExtendedSections.tsx` to display these generated images instead of empty placeholders. Update `BusinessDNAContext.tsx` to add `socialMediaUrls` to the interface.

---

## Technical Details

### Edge function changes (`supabase/functions/scrape-product/index.ts`)
- **Moodboard section** (lines ~505-684): Replace AI recreation with direct Pinterest image download
- **Screenshot section** (lines ~46-106): Change `formattedUrl` to `baseUrl` for both desktop and mobile Firecrawl scrape calls
- **Illustrations section** (lines ~752-857): Add "NO TEXT" constraints to both icon and pattern prompts
- **New social media section**: Add 3 parallel AI image gen calls after guideline images, store in `socialMediaUrls`

### Frontend changes
- **`BusinessDNAContext.tsx`**: Add `socialMediaUrls?: string[]` to `VisualIdentityData`
- **`BrandExtendedSections.tsx`**: 
  - Buttons section: apply brand colors via inline styles
  - Social media section: render generated UGC images from `socialMediaUrls`
  - Accept brand colors prop for button styling

