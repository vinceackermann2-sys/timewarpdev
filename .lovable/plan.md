

## Plan: Swap Default Robot Image, Reposition Icons Around Card

### Changes to `src/components/landing/ProductDescription.tsx`

#### 1. Swap robot images
- Make `robotImg2` (blue robot) the default visible image
- Make `robotImg` (original) the scan-reveal image that appears on scroll
- Swap the `src` attributes on the two `<img>` tags

#### 2. Reposition three icons around the card edges (not stacked together)
- Remove the current left-side stacked icon column from the text area
- Place all three icons as absolutely-positioned elements around the image card:
  - **Brain / "Analyzing everything"** → top-left, outside the card (e.g., `top: 5%, left: -60px`)
  - **Eye / "Logging everything"** → middle-right, outside the card (e.g., `top: 45%, right: -60px`)
  - **Monitor / "Powering your CEO"** → bottom-left, outside the card (e.g., `top: 80%, left: -60px`)
- Each icon still syncs its opacity/translate to `iconProgress` (appears with the scan filter)

#### 3. Fix arrows to match new icon positions
- **Top-left icon**: arrow points right and down toward the robot's head
- **Middle-right icon**: arrow points left toward the robot's eyes
- **Bottom-left icon**: arrow points right toward the robot's arm/hand
- Use SVG lines with arrowheads, each with appropriate viewBox and path direction

#### 4. Layout adjustment
- Change the flex layout so text stays on the left (without icons) and the image container on the right holds all three floating annotations
- The image container needs `overflow-visible` to allow icons to float outside

### Files Changed
- `src/components/landing/ProductDescription.tsx`

