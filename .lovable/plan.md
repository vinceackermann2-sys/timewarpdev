
# Migrate TimeWarp AI to Stagehand

## Understanding the Challenge

**Current Architecture:**
- Edge Function (`run-agent`) creates Browserbase session
- Edge Function connects via CDP WebSocket
- Edge Function extracts accessibility tree
- Edge Function sends tree to AI (Gemini) for action decisions
- Edge Function executes CDP commands manually

**Desired Architecture:**
- Use Stagehand SDK for intelligent browser automation
- Let Stagehand handle element finding, action execution, and AI reasoning
- Browser sessions still run on Browserbase infrastructure

## Technical Constraint

**Critical Issue:** Stagehand SDK requires Playwright, which doesn't run in Deno/Supabase Edge Functions because:
- Playwright needs native Node.js binaries
- Deno runtime doesn't support these native modules

## Recommended Solution: Hybrid Architecture

Deploy a lightweight **Node.js Stagehand service** that handles browser automation, while keeping the Edge Function for session management and frontend coordination.

```text
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   Frontend   │────▶│  Edge Function      │────▶│  Stagehand       │
│  TimeWarp AI │     │  (Deno)             │     │  Service (Node)  │
│              │     │  - Auth/Session     │     │  - act/observe   │
│              │◀────│  - Coordination     │◀────│  - extract/agent │
└──────────────┘     └─────────────────────┘     └────────┬─────────┘
                                                          │
                                                          ▼
                                                 ┌──────────────────┐
                                                 │   Browserbase    │
                                                 │   (Cloud Browser)│
                                                 └──────────────────┘
```

## Implementation Plan

### Phase 1: Create Stagehand Worker Service

Create a new edge function that acts as a Stagehand coordinator, or deploy a separate Node.js service.

**Option A: Use Browserbase's Stagehand Cloud (Recommended)**

Browserbase offers a way to run Stagehand directly on their infrastructure. This approach:
- No need for separate Node.js deployment
- Stagehand runs alongside the browser on Browserbase
- You just call their API endpoints

**New file: `supabase/functions/stagehand-agent/index.ts`**
```typescript
// This function will coordinate with Browserbase's Stagehand API
// Create session → Execute task via Stagehand → Return results
```

### Phase 2: Update Edge Function Architecture

**Modify `supabase/functions/run-agent/index.ts`:**

1. **Session Creation (`action: 'create'`)** - Keep as-is, creates Browserbase session

2. **Task Execution (`action: 'execute'`)** - Replace CDP logic with Stagehand calls:
   - Remove: Manual CDP WebSocket connection
   - Remove: Accessibility tree extraction
   - Remove: AI prompt construction
   - Remove: CDP command execution switch
   - Add: Stagehand `act()`, `observe()`, `extract()` calls

### Phase 3: Simplify Frontend Integration

**Update `src/components/database/TimeWarpAIView.tsx`:**

Current flow (step-by-step polling):
```typescript
while (running) {
  result = await executeStep(session, wsUrl);
  addStep(result);
}
```

New flow (task-based execution):
```typescript
// Single call that returns when complete
result = await executeTask(session, task);
// Or streaming updates via SSE
```

## Detailed Code Changes

### File 1: `supabase/functions/run-agent/index.ts`

**Remove (Lines 180-478):**
- CDP WebSocket connection logic
- `sendCDP()` helper functions
- Accessibility tree formatting
- AI prompt construction for action decisions
- Manual action execution (click, type, navigate switch)

**Add:**
```typescript
// Stagehand configuration
const stagehandConfig = {
  env: "BROWSERBASE",
  apiKey: BROWSERBASE_API_KEY,
  projectId: BROWSERBASE_PROJECT_ID,
  modelName: "gpt-4o", // or gemini
  modelClientOptions: {
    apiKey: OPENAI_API_KEY // Add this secret
  }
};

// For each step, use Stagehand primitives:
// - page.act("Click the login button")
// - page.observe("What buttons are visible?")
// - page.extract({ instruction: "Get form data", schema: z.object({...}) })
```

### File 2: New Worker Script (External Deployment)

Since Stagehand can't run in Deno, create a Node.js worker:

**`stagehand-worker/index.js`** (deploy to Railway/Render/Vercel)
```javascript
import { Stagehand } from "@browserbasehq/stagehand";
import express from "express";

const app = express();

app.post("/execute", async (req, res) => {
  const { task, sessionId, role } = req.body;
  
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    browserbaseSessionID: sessionId, // Connect to existing session
  });
  
  await stagehand.init();
  
  // Use agent for complex multi-step tasks
  const result = await stagehand.agent({ task }).run();
  
  await stagehand.close();
  
  res.json({ success: true, result });
});
```

### File 3: Update Frontend

**`src/components/database/TimeWarpAIView.tsx`:**

Simplify the execution loop to work with the new architecture:
```typescript
// Instead of step-by-step polling
const executeTask = async (task: string) => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/run-agent`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'execute-stagehand',
      task,
      sessionId
    })
  });
  return response.json();
};
```

## Required Secrets

Add new environment variable:
- `OPENAI_API_KEY` - For Stagehand's AI model (or use `ANTHROPIC_API_KEY`)

Existing secrets (already configured):
- `BROWSERBASE_API_KEY` ✓
- `BROWSERBASE_PROJECT_ID` ✓

## Alternative: Keep Edge Function + Enhanced AI

If deploying a separate Node.js service is too complex, we can enhance the current architecture:

1. Keep the CDP-based approach in the edge function
2. Improve the AI prompting to be more "Stagehand-like"
3. Add better element targeting using Stagehand's selector strategies

This provides similar benefits without the deployment complexity.

## Recommended Path Forward

**Simplest approach that works:**
1. Deploy a minimal Node.js service (Railway, Render, or Vercel) running Stagehand
2. Edge function creates Browserbase session and delegates task execution to the Stagehand service
3. Stagehand service returns results to edge function
4. Edge function streams results to frontend

This keeps the secure authentication in Lovable Cloud while leveraging Stagehand's powerful automation capabilities.

## Questions to Clarify

Before implementing:
1. Do you want to deploy a separate Node.js service, or prefer keeping everything in edge functions with enhanced CDP logic?
2. Which AI model should Stagehand use - OpenAI GPT-4o or Anthropic Claude?
