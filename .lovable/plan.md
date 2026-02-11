

# Fix Unreadable Markdown Tables in Research Chat

## Problem
The AI responds with markdown tables, but the `ResearchChatMessage` component has no table renderers. This causes tables to render with default browser styling -- broken columns, unreadable text, and garbled layout on the dark theme (as seen in the screenshot).

## Solution
Add custom `table`, `thead`, `tbody`, `tr`, `th`, and `td` renderers to the `ReactMarkdown` component in `ResearchChatMessage.tsx`. Also add matching renderers to `DatabaseChatMessage.tsx` for consistency. The tables will be wrapped in a horizontally scrollable container so they don't overflow on mobile.

## Visual Result
- Tables will have proper dark-themed styling with border separators
- Headers will be bold with a subtle background tint
- Cells will have proper padding and text alignment
- On mobile, tables scroll horizontally instead of breaking the layout

## Technical Details

### File: `src/components/database/dataconversion/ResearchChatMessage.tsx`
- Add an `overflow-x-auto` wrapper div around the `table` element
- Add styled renderers for `table`, `thead`, `th`, `tr`, `td`
- Table gets `w-full border-collapse` styling
- Header cells get `bg-card text-foreground font-semibold` with bottom border
- Body cells get `text-muted-foreground` with border separators
- Also add `h1`, `h2` renderers and a `blockquote` renderer (the AI uses these too based on the system prompt)

### File: `src/components/database/DatabaseChatMessage.tsx`
- Add the same table renderers for consistency across both chat interfaces

