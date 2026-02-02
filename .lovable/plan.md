

# Fix: Add Google Workspace Write Permissions for Action Chat

## Problem Identified
The Google OAuth token has **read-only** scopes. When Action Chat tries to create a Google Doc, the API returns a **401 UNAUTHENTICATED** error because the token lacks write permissions.

## Solution
Add write scopes to the Google OAuth configuration so users can create documents, send emails, and schedule calendar events.

## Changes Required

### 1. Update OAuth Scopes in Auth.tsx
Add these write scopes to the existing read-only scopes:

| Action | Required Scope |
|--------|----------------|
| Create Google Docs | `https://www.googleapis.com/auth/documents` |
| Send/Draft Emails | `https://www.googleapis.com/auth/gmail.send` + `https://www.googleapis.com/auth/gmail.compose` |
| Create Calendar Events | `https://www.googleapis.com/auth/calendar.events` |

### 2. Google Cloud Console Configuration
You may need to add these scopes to your Google Cloud OAuth consent screen:
- Go to Google Cloud Console > APIs & Services > OAuth consent screen
- Add the new scopes to the authorized list
- Since these are sensitive scopes, Google may require verification for production use

## User Impact
- Existing users will need to **re-authenticate** to grant the new permissions
- On next Google sign-in, users will see an updated consent screen with write permissions
- After re-auth, Action Chat will be able to create documents, send emails, and schedule events

## Technical Details

```text
New scopes to add:
+------------------------------------------+------------------------+
| Scope                                    | Purpose                |
+------------------------------------------+------------------------+
| documents                                | Create/edit Google Docs|
| gmail.send                               | Send emails            |
| gmail.compose                            | Create drafts          |
| calendar.events                          | Create calendar events |
+------------------------------------------+------------------------+
```

