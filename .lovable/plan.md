

# Fix Slack Email Parsing for Account Linking

## Problem Identified
Slack automatically converts email addresses to `<mailto:email@domain.com|email@domain.com>` format, which the current regex doesn't match properly.

## Solution

### Update the Link Command Regex
Modify `supabase/functions/slack-bot/index.ts` to handle Slack's mailto format:

```text
Current regex (broken):
^link\s+([^\s<>]+@[^\s<>]+)

New regex (handles mailto):
^link\s+(?:<mailto:([^|>]+)\|[^>]+>|([^\s<>]+@[^\s<>]+))
```

### Changes to slack-bot/index.ts

1. **Update the link command matching logic**:
   - Match both plain emails (`link email@test.com`) 
   - AND Slack mailto format (`link <mailto:email@test.com|email@test.com>`)

2. **Extract email from either capture group**:
   - Group 1: email from mailto format
   - Group 2: email from plain format

### Technical Details

```javascript
// Handle both plain email and Slack mailto format
const linkMatch = cleanText.match(/^link\s+(?:<mailto:([^|>]+)\|[^>]+>|([^\s<>]+@[^\s<>]+))/i);
if (linkMatch) {
  const email = (linkMatch[1] || linkMatch[2]).trim();
  // Continue with linking...
}
```

## Expected Outcome
- `@TimeWarpAI link vincentackermann@timewarpdev.com` will work
- Thread replies will start working once the account is linked (they're already being received)

