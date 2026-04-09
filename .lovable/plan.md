

## Plan: Fix Shining Animation Visibility, Slide Visuals, and Business Context in Employee Chat

### Issues Identified

1. **ShiningText animation too subtle** — The gradient uses `muted-foreground` to `foreground` which is low contrast, making the shimmer barely visible.

2. **Slides only produce text, no visuals** — The slide JSON schema only supports `title`, `subtitle`, `bullets`, and `takeaway` — no visual elements like icons, images, accent colors, or layout variations. The `InlineSlide` component renders a basic bullet list with no visual richness.

3. **"Create an investor pitch" doesn't use business data** — When users type requests like "create an investor pitch" without selecting a graphic type, the graphic instructions are NOT appended. Even when Slide is selected, the prompt says "relevant to the user's question" but never explicitly tells the AI to use the business's brand/product/audience data from the Reference Material. The AI treats it as a generic task.

### Changes

#### 1. ShiningText — Higher contrast gradient
**File:** `src/components/ui/shining-text.tsx`
- Change the gradient to use a brighter highlight: swap `hsl(var(--foreground))` for a white/bright highlight (`#fff` or `hsl(var(--foreground))` with a sharper, narrower band)
- Tighten the gradient stops (e.g., `45%,#fff,55%`) so the shine is a crisp flash rather than a broad fade
- Reduce duration from 2s to 1.5s for snappier feel

#### 2. Slide schema — Add visual elements
**File:** `src/components/database/InlineChatGraphics.tsx`
- Extend `SlideConfig` to support: `layout` (title-only, bullets, two-column, stat-callout), `stats` (large number callouts), `accent_color`, `icon` (emoji)
- Update the `InlineSlide` renderer to support these layouts — e.g., stat callouts show big numbers, two-column splits content
- Update PPTX export to match the new layouts

**File:** `src/components/database/AgentChatView.tsx`
- Update the Slide graphic instruction to include the extended JSON schema and tell the AI to use visual layouts, stats, and icons
- Add explicit instruction: "Use the business's brand, product, and audience data from the Reference Material to personalize the slide content"

#### 3. Business context in all graphic outputs + auto-detect graphics
**File:** `src/components/database/AgentChatView.tsx`
- Add to ALL graphic instructions (Document, Slide, Spreadsheet, Analytics, Graph): "You MUST use the business's actual brand name, product details, and audience information from the Reference Material. Never create generic content — personalize everything to this specific business."

**File:** `supabase/functions/run-employee/index.ts`
- Add slide/document/spreadsheet/analytics code block instructions to `buildEmployeeChatPrompt` so the AI knows how to output these formats even when graphic type isn't selected client-side
- Add an instruction: "When the user asks for a pitch, presentation, report, or document, ALWAYS base the content on the business's brand, product, and audience data from the Reference Material. Treat every request as being about THIS business unless the user explicitly says otherwise."

**File:** `supabase/functions/extension-agent/index.ts`
- Same addition as above for the extension-agent system prompt

### Technical Details

**ShiningText gradient change:**
```
bg-[linear-gradient(110deg,hsl(var(--muted-foreground)),45%,#fff,50%,hsl(var(--muted-foreground)),55%,hsl(var(--muted-foreground)))]
```
Narrower bright band + white highlight = more visible flash.

**Extended slide JSON schema:**
```json
{
  "title": "...",
  "subtitle": "...",
  "layout": "stat-callout",
  "bullets": [...],
  "stats": [{"value": "$2.4M", "label": "ARR"}],
  "takeaway": "...",
  "icon": "🚀"
}
```

**System prompt addition (run-employee + extension-agent):**
A paragraph instructing the AI that when users request presentations, pitches, reports, or documents, it must use the business's actual data from Reference Material and personalize all content to that business.

