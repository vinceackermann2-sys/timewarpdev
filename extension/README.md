# ⚡ TimeWarp AI Browser Extension

An AI agent that lives in your browser sidebar and can interact with any webpage via chat.

---

## 🚀 Quick Setup (5 minutes)

### Step 1 — Add your Supabase Anon Key

Open `background.js` and replace line 5:
```js
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"; // ← Replace this
```

Find your anon key at: **https://supabase.com/dashboard/project/ohvxqlxugqlzzbmfypiy/settings/api**
It's labeled `anon` `public`.

---

### Step 2 — Create the chat history table in Supabase

Run this SQL in your Supabase SQL editor:

```sql
create table if not exists timewarp_chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  user_message text,
  ai_reply text,
  page_url text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table timewarp_chats enable row level security;

-- Users can only see their own chats
create policy "Users can read own chats"
  on timewarp_chats for select
  using (auth.uid() = user_id);

create policy "Users can insert own chats"
  on timewarp_chats for insert
  with check (auth.uid() = user_id);
```

---

### Step 3 — Load in Chrome / Edge / Brave

1. Go to `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked**
4. Select this entire `timewarp-extension` folder

The ⚡ TimeWarp icon will appear in your toolbar.

---

### Step 4 — Sign in & add your OpenAI key

1. Click the ⚡ icon → **Open Side Panel**
2. Log in with your Supabase email/password
3. Click ⚙️ Settings → paste your **OpenAI API key** (starts with `sk-`)
4. Hit **Save Key**

You're ready! 🎉

---

## 💬 What TimeWarp can do

| Command example | What happens |
|---|---|
| "Click the Sign In button" | Finds and clicks the button |
| "Type 'hello world' in the search box" | Locates input and types |
| "Go to github.com" | Navigates the tab |
| "Scroll to the bottom" | Scrolls the page |
| "What's on this page?" | Reads and summarizes content |
| "Fill in the form with my name John" | Finds form fields and fills them |

---

## 🔧 Architecture

```
User chat → Side Panel (sidepanel.html)
         → Background Worker (background.js)
         → OpenAI GPT-4o (tool calling loop)
         → Content Script (content.js) executes DOM actions
         → Supabase (auth + chat history)
```

---

## ⚠️ Notes

- **Safari**: Not supported (requires Xcode + Apple developer account — separate project)
- **Firefox**: Needs minor MV2 adjustments to manifest.json
- The extension stores your OpenAI key locally in Chrome's storage (never sent to your server)
- Chat history is saved to your Supabase `timewarp_chats` table

---

## 📁 File Structure

```
timewarp-extension/
├── manifest.json      — Extension config & permissions
├── background.js      — Service worker: auth, OpenAI, action routing
├── content.js         — Injected into pages: DOM interaction engine
├── sidepanel.html     — Full chat UI
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```
