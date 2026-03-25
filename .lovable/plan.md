

## Plan: Fix progress bar to always move smoothly

### Problem
The current progress animation has two rigid phases:
- **Phase A**: Cubic ease to 75% over 20 seconds — if scrape takes longer, bar freezes at 75%
- **Phase B**: Fixed +0.05/frame crawl to 95% — can appear stuck since it's the same speed regardless of elapsed time

### Solution
Replace the rigid two-phase system with a single continuous asymptotic approach that:
1. Always targets a moving ceiling based on current state (scrape pending → 80%, scrape done → 95%, persistence done → 100%)
2. Uses `lerp` (linear interpolation) so the bar always moves toward its target — never stuck
3. If progress hasn't moved perceptibly in ~2 seconds, applies a minimum bump to guarantee visible motion

### Changes

**File: `src/components/database/BusinessDNAOnboarding.tsx`** — lines 204–236

Replace the `requestAnimationFrame` progress effect with:

```typescript
useEffect(() => {
  if (step < 1 || step > 2) return;
  let rafId: number;
  let lastVisibleChange = Date.now();
  let lastRenderedProgress = 0;

  const tick = () => {
    if (persistenceCompleteRef.current) {
      progressRef.current = 100;
      setProgress(100);
      return;
    }

    // Determine ceiling based on current phase
    const ceiling = scrapeCompleteRef.current ? 95 : 80;

    // Lerp toward ceiling — always closing ~3% of the gap per frame
    let next = progressRef.current + (ceiling - progressRef.current) * 0.03;

    // Guarantee: if bar hasn't moved ≥0.5% in 2 seconds, force a bump
    const now = Date.now();
    if (next - lastRenderedProgress < 0.5) {
      if (now - lastVisibleChange > 2000) {
        next = Math.min(ceiling - 0.5, progressRef.current + 0.8);
        lastVisibleChange = now;
      }
    } else {
      lastVisibleChange = now;
      lastRenderedProgress = next;
    }

    next = Math.min(ceiling, next);
    progressRef.current = next;
    setProgress(next);
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}, [step]);
```

This guarantees:
- The bar always moves toward its target (never freezes)
- If stuck for >2 seconds, it forces a visible bump
- Smooth deceleration as it approaches each ceiling
- Instant jump to 100% when persistence completes

No other files need changes.

