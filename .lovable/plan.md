

## Plan: Fix Employee Chat Responses + RAG-Style Business Context

### Problem 1: Employee chat doesn't answer user questions
The `run-employee` edge function receives the user's message with file content (including multimodal image markers), but the function sends `stream: false` and returns a non-streaming JSON response. The issue is that:
- The `buildEmployeeChatPrompt` dumps the **entire business context** (brand details, all products, all audiences, all database files) into the system prompt — this can be 20-50KB of text
- This overwhelms the model's attention, causing it to anchor on the business DNA data and generate "strategic business summaries" instead of answering the actual user question
- The multimodal content array (images) is sent correctly but the massive context drowns out the user's simple question

### Problem 2: Business DNA/Database sent on every prompt
Both `run-employee` and `extension-agent` edge functions load ALL business data (brand, products, audiences, database files) and inject it as a massive system prompt block on every single request. This is wasteful and degrades answer quality.

### Solution: RAG-Style "Notebook Lookup" Architecture

Instead of injecting all business data into every prompt, the edge functions will:
1. Only include a **brief business identity** (brand name, category, agent name) in the system prompt
2. Use the user's latest message as a query to **search** the business data and retrieve only the top relevant snippets
3. Inject those snippets as a small "Relevant context" section — only when they match

### Implementation

#### File 1: `supabase/functions/run-employee/index.ts`
- Replace `loadBusinessContext` with a lightweight `loadBusinessIdentity` (brand name, role, category only — ~200 chars)
- Add `retrieveRelevantContext(supabase, employee, userMessage)` that:
  - Loads all business data titles + short summaries into memory
  - Does keyword/term matching against the user's latest message
  - Returns only the top 3-5 matching items (each truncated to ~500 chars)
- In `buildEmployeeChatPrompt`: only include identity + relevant snippets
- Add explicit instruction: "Your primary job is to answer the user's question directly. If relevant business context is provided below, use it — but always prioritize responding to what the user actually asked."

#### File 2: `supabase/functions/extension-agent/index.ts`
- Same pattern: replace `loadBusinessDNA` with `loadBusinessIdentity` + `retrieveRelevantContext`
- `buildChatPrompt`: minimal identity in system prompt, relevant snippets appended only when matched
- `buildBrowserPrompt`/`buildBrowserActionPrompt`: keep business identity brief, relevant context only for matched terms

#### Retrieval Logic (shared in both functions)
```text
1. Load all user_business_data rows (title, content first 200 chars, data_type)
2. Extract keywords from user's latest message (split, lowercase, remove stopwords)
3. Score each data item by keyword overlap with title + content snippet
4. Return top 5 items with score > threshold, each with content truncated to 500 chars
5. If no items match, return empty (no context injected)
```

### Technical Details

**Keyword matching approach** (simple, no embeddings needed):
- Extract meaningful words from user message (>3 chars, not stopwords)
- Check each business data item's title + first 300 chars of content for those keywords
- Score = count of matched keywords / total keywords
- Threshold: score > 0.1 (at least 1 keyword match)
- This is fast (~10ms) and avoids the need for vector embeddings

**System prompt structure change:**
```
Before (every request): 20-50KB of brand + products + audiences + database
After (every request): ~500 chars identity + 0-2500 chars of relevant snippets
```

**Employee chat prompt fix:**
- Add stronger instruction to answer the user's question first
- File analysis sections get priority over business context
- Business context is labeled as "reference material" not primary context

### Files Changed
1. `supabase/functions/run-employee/index.ts` — RAG retrieval + lighter prompts
2. `supabase/functions/extension-agent/index.ts` — RAG retrieval + lighter prompts

Both functions redeployed after changes.

