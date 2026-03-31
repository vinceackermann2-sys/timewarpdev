

## Plan: Unified "How would you like to get started?" Entry Screen

### What Changes
The onboarding flow (both first-time and add-business) will always start with the "How would you like to get started?" method picker screen, showing two cards: "From Scratch" (Coming Soon) and "From Existing". The backend processing remains identical.

### Current Behavior
- **First-time onboarding**: Goes directly to URL input (step 0)
- **Add-business mode**: Shows the method picker, then URL input

### New Behavior
- **Both flows**: Always show the method picker first → user clicks "From Existing" → URL input → analysis → agent naming → done
- "From Scratch" stays disabled with "Coming Soon" badge
- Back button on method picker: hidden for first-time onboarding, shown for add-business mode

### Technical Changes

**File: `src/components/database/BusinessDNAOnboarding.tsx`**

1. Change `showMethodPicker` initialization from `isAddBusiness && !initialUrl` to `!initialUrl` — this makes the method picker appear for all users (first-time and add-business) unless a URL was pre-passed
2. On the method picker screen, only show the "Back" button if `isAddBusiness && onBack` is provided (keeps current behavior for add-business, hides it for first-time onboarding)
3. No other changes needed — the rest of the flow (URL input, scraping, persistence, agent naming) stays exactly the same

This is a single-line change in the component initialization.

