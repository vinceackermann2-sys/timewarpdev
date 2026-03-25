

# Fix: Scrape-Product Client Timeout (CORS Error)

## Root Cause

The function **works correctly** — logs show "Extraction successful" after ~2.5 minutes. But the Supabase JS client's `functions.invoke()` uses the browser's default `fetch` which times out after ~2 minutes. When the connection drops before the response arrives, the browser sees no response headers at all, which it reports as a CORS error.

## Solution

Replace `supabase.functions.invoke("scrape-product", ...)` with a raw `fetch()` call that has an explicit `AbortController` timeout of 5 minutes (300 seconds). This applies to all 5 files that call the function.

### Implementation

Create a shared helper function in a utility file:

```typescript
// src/lib/invokeWithTimeout.ts
export async function invokeEdgeFunction(
  functionName: string, 
  body: Record<string, unknown>, 
  timeoutMs = 300_000
) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        ...(session?.access_token 
          ? { "Authorization": `Bearer ${session.access_token}` } 
          : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await response.json();
    if (!response.ok) return { data: null, error: new Error(data.error || response.statusText) };
    return { data, error: null };
  } catch (err) {
    clearTimeout(timer);
    return { data: null, error: err };
  }
}
```

Then update the 5 call sites to use `invokeEdgeFunction("scrape-product", { url })` instead of `supabase.functions.invoke("scrape-product", { body: { url } })`.

## Files to Edit

| File | Change |
|------|--------|
| `src/lib/invokeWithTimeout.ts` | New helper with 5-minute timeout |
| `src/components/database/BusinessDNAOnboarding.tsx` | Use helper |
| `src/components/database/AddProductURLView.tsx` | Use helper |
| `src/components/database/ProductListView.tsx` | Use helper |
| `src/components/database/AudienceListView.tsx` | Use helper |
| `src/components/database/BrandingEditor.tsx` | Use helper |

