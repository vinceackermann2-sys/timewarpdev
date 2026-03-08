

## Problem

The `research-chat` and `action-chat` edge functions return 500 because the AI gateway responds with **400 Bad Request**. Root cause: when workspace data is loaded (up to 500 items with full `content` and `analyzed_content`), the system prompt exceeds the AI model's input token limit.

The previous security fix also stripped the error body logging, making the 400 invisible — it just falls through to a generic 500.

## Plan

### 1. Add context size limiting in both edge functions

**Files**: `supabase/functions/research-chat/index.ts`, `supabase/functions/action-chat/index.ts`

In `formatContextItems`, add a running character count and stop adding items once total context exceeds ~200,000 characters (~50k tokens). This prevents the system prompt from exceeding the model's context window.

```typescript
function formatContextItems(items: any[]): string {
  const MAX_CONTEXT_CHARS = 200000;
  let context = "\n\n## User's Business Data\n\n";
  let totalChars = 0;
  // ... group by source as before ...
  for (const item of sourceItems) {
    const itemText = /* build item string */;
    if (totalChars + itemText.length > MAX_CONTEXT_CHARS) break;
    context += itemText;
    totalChars += itemText.length;
  }
  return context;
}
```

### 2. Add better error logging for debugging

Log the actual status and a truncated response body when the AI gateway returns non-ok, so future issues are diagnosable:

```typescript
if (!response.ok) {
  const errorBody = await response.text().catch(() => "");
  console.error("AI gateway error: status", status, "body:", errorBody.slice(0, 200));
  // ... existing status-specific handling ...
}
```

### 3. Truncate individual item content

Cap each item's `content` and `analyzed_content` to 2000 characters in `formatContextItems` to prevent a single large document from consuming the entire context budget.

This is a minimal, targeted fix — no frontend changes needed. Both edge functions get the same treatment.

