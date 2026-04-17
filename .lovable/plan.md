

# Goal
Reduce text density and visual noise in the 4 dashboard cards and the right-side detail panel. Keep the personality and structure we just shipped — just trim, tighten, and let whitespace do more work.

# Current pain points
After re-reading `ManageDashboardView.tsx` and `DashCardDetailPanel.tsx`:
- Cards repeat info: eyebrow chip + priority badge + source label + time + signal block + description + footer meta = 6+ text rows competing.
- Long verbose strings: "Discuss in Assistant", "Recommended response", intent lines like "Read this to stay informed. No immediate action needed."
- Detail panel hero blocks restate what the title/source already shows.
- Source-context section in panel duplicates sender/email/subject that's already in the metadata strip.
- Description shown both on card AND as first thing in panel body.

# Trim strategy

## Cards — fewer rows, bigger hierarchy
**Shared changes**
- Drop the eyebrow chip text — keep only the colored accent rail + priority dot. Tab identity comes from color, not words.
- Description: clamp-2 → clamp-1 on cards (full text lives in panel).
- Remove footer "source label" text when a source logo is already shown — logo alone is enough.
- Time ago: only show if < 24h, else hide on card (keep in panel).

**Per tab**
- **Briefing**: kill the "Signal" type pill if it duplicates the title. Show source logo (20px) inline next to title, no separate row.
- **Updates**: drop "is waiting" suffix → just `Maria Chen · 3d`. Hide consequence on card (panel only). Avatar 32px → 28px.
- **To-Dos**: remove duration emoji label text, keep only emoji + leverage dots. Single line: `[✓] Title  ⚡ ●●●○○`.
- **Objectives**: remove "Linked to-dos" chip on card (panel only). Progress ring 32px with % inside, metric one line: `$12k → $20k`.

## Right-side panel — compress hero + collapse repeats
- **Drop the "intent" sentence** at the top ("Read this to stay informed..."). The eyebrow + accent already convey it.
- **Drop the eyebrowFull** ("Briefing · What changed") — use short eyebrow only.
- **Hero block**: keep but tighten — single line where possible. Updates hero becomes one line `[Avatar] Maria Chen · waiting 3d`.
- **Remove "Why it matters" / "Recommended response" / "Recommended approach" / "Strategic rationale" labels** — just show the description as a clean lead paragraph. The accent color is the framing.
- **Metadata strip**: dedupe — if `metadata.senderEmail` is shown, don't repeat in source-context section.
- **Source context section**: rename to just "Source" and only show if there's actual unique content beyond what's in the metadata strip.
- **Footer CTA**: shorter labels — "Discuss in Assistant" → "Discuss", "Plan execution" → "Plan", "Respond now" → "Respond". Keep icons.
- Increase vertical spacing between sections (`space-y-5` → `space-y-6`), reduce internal padding density.

## Empty states
Already short. Keep title, drop body to a single sentence ≤10 words.

# Files to change
1. **`src/components/database/dashboardTypes.ts`** — shorten `ctaLabel` strings, optionally remove `intent` and `summaryLabel` (or keep but stop rendering).
2. **`src/components/database/ManageDashboardView.tsx`** — trim each of the 4 card components per above; tighten `CardShell` paddings.
3. **`src/components/database/DashCardDetailPanel.tsx`** — remove intent line, remove summaryLabel headers, compress hero blocks to single-line where possible, dedupe source section, shorter footer labels.

# Out of scope
- Changing colors / accent system (already approved)
- Removing tab differentiation
- Data model changes

