

## Plan: Agent Name in Onboarding + Sticky Right Sidebars with Breadcrumb Path

### 1. Replace "AI CEO" with configured agent name in onboarding

**Problem**: When adding a business, the onboarding flow and various views fallback to showing "AI CEO" as the default agent name instead of using the name the user configured.

**Fix**: In `BusinessDNAOnboarding.tsx`, the agent naming step (step 6) currently defaults to placeholder text "e.g. My Agent...". The "AI CEO" references throughout the app (in `AgentChatView.tsx`, `BusinessDNAView.tsx`) already use `brand.agentName || "AI CEO"` as fallback — this is correct behavior for when no name is set. The key fix is ensuring the agent name persisted during onboarding is immediately reflected in all views by updating the brand context after saving.

No code changes needed for the fallback pattern — "AI CEO" is the correct default when no agent name exists. The onboarding already saves `agentName` to the database on step 6.

### 2. Make right-side sidebars (Brand, Audience, Product) sticky

**Problem**: The sidebar wrapper divs use `self-start` which collapses their height, preventing `sticky` from working properly as the user scrolls the content area.

**Files to change**:
- `src/components/database/BrandListView.tsx` (line 70)
- `src/components/database/AudienceDetailView.tsx` (line 611)
- `src/components/database/ProductDetailView.tsx` (line 758)

**Change**: Replace `self-start` with `sticky top-6` on the sidebar wrapper `<div>`, and remove `sticky top-6` from inside the `<nav>` element in each sidebar component to avoid double-sticky. Actually, since the `<nav>` already has `sticky top-6`, the issue is that `self-start` on the parent collapses it. Change the parent wrapper to use `h-fit` instead of `self-start`, so the inner `sticky` works against the scroll container.

Wait — `sticky` requires the element to be inside a scrollable container and the parent to have enough height. The scroll container is on line 420 of `BusinessDNAView.tsx` (`overflow-y-auto`). The sidebar wrapper uses `self-start` which makes it shrink. The fix: remove `self-start` from the wrapper div so it stretches to the full height of the flex row, then the inner `<nav className="sticky top-6">` will stick properly.

**Changes per file**:
- Remove `self-start` from the sidebar wrapper div (keep `shrink-0`)

### 3. Add breadcrumb path to right sidebars

**Problem**: The right-side "On This Page" sidebars lack a breadcrumb showing the current navigation path (e.g., "Business DNA > Brand" or "Business DNA > Product > Model Y").

**Files to change**:
- `src/components/database/BrandPageSidebar.tsx`
- `src/components/database/AudiencePageSidebar.tsx`
- `src/components/database/ProductPageSidebar.tsx`

**Change**: Add a breadcrumb above the "On This Page" heading showing the current path. Each sidebar will accept optional `brandName` and `itemName` props to build the path:
- Brand sidebar: "Business DNA › {brandName} › Brand"
- Audience sidebar: "Business DNA › {brandName} › {audienceName}"
- Product sidebar: "Business DNA › {brandName} › {productName}"

The parent views (`BrandListView`, `AudienceDetailView`, `ProductDetailView`) will pass the brand/item names to their respective sidebars.

### Summary of files changed
1. `BrandListView.tsx` — remove `self-start`, pass `brandName` to sidebar
2. `AudienceDetailView.tsx` — remove `self-start`, pass names to sidebar
3. `ProductDetailView.tsx` — remove `self-start`, pass names to sidebar
4. `BrandPageSidebar.tsx` — add breadcrumb path, accept `brandName` prop
5. `AudiencePageSidebar.tsx` — add breadcrumb path, accept `brandName`/`itemName` props
6. `ProductPageSidebar.tsx` — add breadcrumb path, accept `brandName`/`itemName` props

