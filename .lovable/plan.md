

## Problem

The `complete_referral` database function tries to grant 125 bonus actions by **decrementing** `actions_used` by 125. This doesn't work correctly because:

- A free-plan referrer with `actions_used = 18` gets set to `GREATEST(0, 18 - 125) = 0`. Their limit is still 20, so they only get 20 actions back — not 125 bonus.
- The referred user gets inserted with `actions_used = -125`, which accidentally works because negative usage means extra headroom.

The root cause: there's no concept of **bonus actions**. The system only has a fixed plan limit and a usage counter.

## Fix

1. **Add a `bonus_actions` column** to `user_subscriptions` (default 0) to track earned bonus actions separately from the plan limit.

2. **Update `complete_referral` RPC** to add 125 to `bonus_actions` for both referrer and referred user, instead of manipulating `actions_used`.

3. **Update `increment_actions_used` RPC** to factor in `bonus_actions` when checking the limit: `action_limit = plan_limit + bonus_actions`.

### Database Migration

```sql
ALTER TABLE public.user_subscriptions 
  ADD COLUMN bonus_actions integer NOT NULL DEFAULT 0;
```

### Updated `complete_referral` — key change

```sql
-- Grant 125 bonus actions to referrer
INSERT INTO public.user_subscriptions (user_id, plan, actions_used, bonus_actions)
VALUES (ref.referrer_id, 'co_founder', 0, 125)
ON CONFLICT (user_id) DO UPDATE
SET bonus_actions = user_subscriptions.bonus_actions + 125;

-- Grant 125 bonus actions to referred user  
INSERT INTO public.user_subscriptions (user_id, plan, actions_used, bonus_actions)
VALUES (_referred_user_id, 'co_founder', 0, 125)
ON CONFLICT (user_id) DO UPDATE
SET bonus_actions = user_subscriptions.bonus_actions + 125;
```

### Updated `increment_actions_used` — key change

```sql
-- Add bonus_actions to the effective limit
SELECT plan, actions_used, COALESCE(bonus_actions, 0) 
INTO current_plan, current_actions, current_bonus
FROM public.user_subscriptions WHERE user_id = _user_id;

-- action_limit = plan_limit + bonus
IF current_actions >= (action_limit + current_bonus) THEN
  RETURN json_build_object('allowed', false, ...);
END IF;
```

### Frontend update

Update `ActionsCard.tsx` to fetch and display `bonus_actions` in the remaining count so users see the correct number.

No new tables, no new edge functions — just a column addition and two RPC updates in a single migration.

