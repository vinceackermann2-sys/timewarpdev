

## Fix: Run Employee "Unauthorized" Error

### Root Cause
In `EmployeeDetailView.tsx` line 106, the `Authorization` header uses the anon key (`VITE_SUPABASE_PUBLISHABLE_KEY`) instead of the user's actual session access token. The edge function calls `supabase.auth.getUser(token)` which fails because the anon key is not a valid user JWT.

### Change
**File:** `src/components/database/EmployeeDetailView.tsx` (line 106)

Replace:
```typescript
Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
```

With:
```typescript
Authorization: `Bearer ${session.access_token}`,
apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
```

The `session` object is already available from line 90. The `apikey` header is required by the edge function gateway, while `Authorization` must carry the user's JWT for authentication.

