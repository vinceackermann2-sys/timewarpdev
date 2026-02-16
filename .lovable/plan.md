
# Plan: Per-User Business Data Storage with Real Connections

## Overview
Currently, the "Connect your Business DNA" screen is purely cosmetic -- clicking "Connect" just sets a localStorage flag and shows the chat. No actual data gets stored per user, and canvas node data (documents, images, text, websites) lives only in browser memory.

This plan creates a real per-user database to persist all business data and ensures every piece of data added (connections page + canvas nodes) flows into the user's individual storage.

## What Changes

### 1. Database: Create `user_business_data` table
A table to store all user-uploaded/connected data items per user:

```text
user_business_data
- id (uuid, PK)
- user_id (uuid, references auth.users, NOT NULL)
- data_type (text: 'document', 'image', 'text', 'website', 'email', 'calendar', 'integration')
- source (text: 'canvas', 'upload', 'microsoft', 'google', 'slack', 'wordpress', 'fortknox')
- title (text)
- content (text, nullable) -- extracted text / analysis
- metadata (jsonb, nullable) -- extra info (file size, mime type, URL, etc.)
- file_path (text, nullable) -- path in storage bucket if file was uploaded
- analyzed_content (text, nullable) -- AI analysis result
- is_analyzed (boolean, default false)
- created_at (timestamptz, default now())
```

RLS policies: Users can only CRUD their own rows (WHERE user_id = auth.uid()).

### 2. Database: Create `user_connections` table
Track which integrations each user has connected:

```text
user_connections
- id (uuid, PK)
- user_id (uuid, references auth.users, NOT NULL)
- provider (text: 'microsoft', 'google', 'slack', 'wordpress', 'fortknox')
- status (text: 'connected', 'disconnected', default 'connected')
- connected_at (timestamptz, default now())
- metadata (jsonb, nullable)
```

RLS policies: Users can only CRUD their own rows.

### 3. Update ConnectBusinessDNA Component
- When "Connect" is clicked with selected integrations, save each to `user_connections` table
- Show real connection status (check DB on load, not just localStorage)
- Mark integrations as "connected" or "pending" in the UI
- localStorage flag replaced by DB query

### 4. Update Canvas Nodes to Persist Data
When any node analyzes content (document, image, text, website), save the result to `user_business_data`:

- **DocumentNode**: After analysis completes, insert a row with `data_type='document'`, upload file to `business-data` storage bucket under `{user_id}/canvas/`, store `file_path`
- **ImageNode**: Same pattern with `data_type='image'`
- **TextNode**: Save analyzed text with `data_type='text'`
- **WebsiteNode**: Save URL + analysis with `data_type='website'`

### 5. Update BusinessDatabaseNode
Instead of reading from a single `research.json` file, query `user_business_data` table to show counts of stored items per type.

### 6. Update Research & Generation Chat Context
Both `ResearchChatNode` and `ActionChatNode` already build context from connected nodes. The "business-db" context will now query `user_business_data` for the user's full data set instead of a single JSON file.

### 7. Update Edge Function: `analyze-content`
After analysis, the edge function will also persist the result to `user_business_data` (requires auth token, which needs to be sent from the frontend).

## Technical Details

### Migration SQL
```sql
-- user_connections table
CREATE TABLE public.user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'connected',
  connected_at timestamptz DEFAULT now(),
  metadata jsonb
);
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own connections" ON public.user_connections
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- user_business_data table
CREATE TABLE public.user_business_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_type text NOT NULL,
  source text NOT NULL DEFAULT 'canvas',
  title text NOT NULL,
  content text,
  metadata jsonb,
  file_path text,
  analyzed_content text,
  is_analyzed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_business_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own business data" ON public.user_business_data
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### Files to Create/Modify
1. **New migration** -- SQL above
2. **ConnectBusinessDNA.tsx** -- Save connections to DB, check DB for status on load
3. **DatabaseView.tsx** -- Replace localStorage check with DB query for connections
4. **DocumentNode.tsx** -- After analysis, persist to `user_business_data` + upload file to storage
5. **ImageNode.tsx** -- Same persistence pattern
6. **TextNode.tsx** -- Save analyzed text to DB
7. **WebsiteNode.tsx** -- Save URL + analysis to DB
8. **BusinessDatabaseNode.tsx** -- Query `user_business_data` for counts instead of storage JSON
9. **ResearchChatNode.tsx** -- Fetch user's full data from `user_business_data` for business-db context
10. **ActionChatNode.tsx** -- Same DB-based context fetching
11. **analyze-content edge function** -- Accept auth token, persist results to DB after analysis

### Data Flow

```text
User connects integration (ConnectBusinessDNA)
  --> INSERT into user_connections
  --> UI shows connected status

User uploads document on canvas (DocumentNode)
  --> File uploaded to storage: business-data/{user_id}/canvas/{filename}
  --> analyze-content edge function called
  --> Analysis result INSERT into user_business_data

User adds website URL (WebsiteNode)
  --> analyze-content called
  --> Result INSERT into user_business_data

Research/Generation Chat queries user_business_data
  --> Gets ALL user's stored data as context
  --> AI responds grounded in user's actual data
```
