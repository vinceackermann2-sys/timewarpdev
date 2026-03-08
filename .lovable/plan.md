

## Changes to Branding in Business DNA

### 1. Moodboard: Switch from Pinterest to Cosmos.so

**File:** `supabase/functions/scrape-product/index.ts` (lines 602-694)

Replace the Pinterest/Unsplash search pipeline with Cosmos.so:
- Change the Firecrawl search queries from `site:pinterest.com {term} aesthetic` to `site:cosmos.so {term} aesthetic`
- Update the image URL extraction to look for Cosmos.so image CDN patterns instead of `pinimg.com`
- Keep the Unsplash fallback as-is
- Update all console logs and comments from "Pinterest" to "Cosmos.so"

The AI-generated aesthetic search terms (step 1) remain the same — only the search target and image extraction change.

### 2. Illustrations: Reinforce NO TEXT in prompts

**File:** `supabase/functions/scrape-product/index.ts` (lines 776-870)

Strengthen the no-text instructions in both image generation prompts:

- **Icon grid prompt** (line 780-800): Add explicit negative instructions like "Do NOT include any labels, captions, titles, watermarks, or any form of written language beneath, beside, or on top of the icons." Add a system message reinforcing zero text.

- **Pattern sheet prompt** (line 826-851): Same reinforcement — add "The output must contain ZERO readable characters. No watermarks, no signatures, no annotations." Add system message.

For both, prepend a system message:
```
{ role: "system", content: "You are an image generator. ABSOLUTE RULE: Never include any text, letters, numbers, labels, captions, or words of any kind in generated images. Output pure visual graphics only." }
```

### Deployment

Redeploy the `scrape-product` edge function after changes.

