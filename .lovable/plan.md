

## Pricing Page Plan

### What to Build

A dedicated `/pricing` page matching the reference image design with three plans: **Co Founder** ($69/mo), **Aristotle** ($109/mo, most popular), and **TimeWarp OG** ($999/mo). The page includes a billing toggle (monthly/quarterly/annually) and a warm beige card style. A database table will store user subscriptions to enforce plan permissions.

### Plans & Features (from image)

| Feature | Co Founder ($69) | Aristotle ($109) | TimeWarp OG ($999) |
|---|---|---|---|
| Team members | Unlimited | Unlimited | Unlimited |
| Connected data | 5GB | 10GB | Unlimited |
| Actions/month | 100 | 1,000 | Unlimited |
| AI CEO | Yes | Yes | Yes |
| Business Brain | Yes | Yes | Yes |
| Developer Line | No | Yes | Yes |
| Scale assistance | No | No | Yes |

- Co Founder: "Launching next month" badge, disabled Get Started button
- Aristotle: "Access today" badge, blue Get Started button, "Most Popular" label
- TimeWarp OG: "Access today" badge

### Billing Periods
- Monthly: $69 / $109 / $999
- Quarterly: ~10% discount
- Annually: ~20% discount

### Technical Changes

1. **Database migration** -- Create `user_subscriptions` table:
   - `id`, `user_id`, `plan` (enum: co_founder, aristotle, timewarp_og), `billing_period`, `status`, `actions_used`, `data_used_bytes`, `created_at`, `updated_at`
   - RLS policies for users to read their own subscription
   - Default free users to no subscription (treated as no access / trial)

2. **New file: `src/pages/PricingPage.tsx`** -- Standalone pricing page with:
   - Billing toggle tabs (monthly/quarterly/annually)
   - Three plan cards matching the beige/warm style from the image
   - Check/X marks for features
   - "Get Started" buttons linking to `/auth?mode=signup`
   - Co Founder card shows "Launching next month" with disabled button

3. **Update `src/components/landing/Pricing.tsx`** -- Replace current plans data with the new three plans to match the image

4. **Update `src/App.tsx`** -- Add `/pricing` route

5. **Update footer links** -- Change `/#pricing` to `/pricing` in:
   - `src/components/database/MyBusinessesView.tsx`
   - `src/components/landing/Footer.tsx`
   - `src/components/landing/Header.tsx`
   - `src/components/landing/CTA.tsx`

6. **Create `src/hooks/useSubscription.ts`** -- Hook to fetch user's current plan and expose permission checks like `canUseDevLine`, `getActionLimit`, `getDataLimit` for use across the app.

