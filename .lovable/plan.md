
# Fix TimeWarp AI Default Mode

## Problem
Currently, when submitting a task, the system always visibly connects to Browserbase and shows connection-related messages even when "Watch Live" is toggled off. The user wants:

- **Default (Watch Live OFF)**: Task runs silently in the background, only showing clean step nodes for actual actions (navigate, click, type, etc.)
- **Watch Live ON**: Show the live browser iframe and connection status messages

## Current Flow Issue
```text
User submits task
    ↓
createBrowserSession() - Shows "Initializing browser..." (conditional)
    ↓
Session created - Shows "Session Ready" (conditional)
    ↓
runAgentLoop() - Shows "Agent Started"
    ↓
executeStep() - Shows action steps
```

The problem: Even with the conditional checks, errors like "Failed to start browser" still show, and the "Agent Started" message references browser internals.

## Solution

### 1. Suppress ALL Browser-Related Messaging in Default Mode

Modify `createBrowserSession` to be completely silent when `isWatchLive` is false:
- No "Initializing..." message
- No "Session Ready" message  
- No error messages about browser (show generic "Failed to start task" instead)

### 2. Clean Up Agent Loop Messages

When `isWatchLive` is false, the `runAgentLoop` should show user-friendly messages:
- Instead of "Agent Started" → "Starting task..."
- Instead of "Resumed" → "Continuing..."
- Filter out any technical/browser-related details

### 3. Only Show Live Browser When Toggled

The `RemoteBrowser` component should only render when:
- `isWatchLive` is true AND
- `liveViewUrl` exists

### 4. Step Node Filtering

Add logic to filter step types when displaying in default mode:
- Show: `action`, `complete`, `error`, `warning`
- Hide (unless Watch Live): `status` type steps that reference browser/session

## Code Changes

### File: `src/components/database/TimeWarpAIView.tsx`

1. **Update `createBrowserSession`**: Make it completely silent by default, only show messages when `isWatchLive` is true

2. **Update `runAgentLoop`**: Change messaging to be user-friendly when Watch Live is off:
   ```tsx
   addStep({
     icon: "✨",
     title: isWatchLive ? "Agent Started" : "Starting",
     message: isWatchLive ? "Beginning task execution..." : "Working on your task...",
     details: isWatchLive ? currentTaskRef.current : undefined,
     type: "action"
   });
   ```

3. **Update error handling**: Show generic errors when Watch Live is off:
   ```tsx
   addStep({
     icon: "❌",
     title: "Error",
     message: isWatchLive 
       ? (err instanceof Error ? err.message : 'Failed to start browser')
       : "Something went wrong. Please try again.",
     type: "error"
   });
   ```

4. **Ensure RemoteBrowser only renders when toggled**:
   ```tsx
   {isWatchLive && liveViewUrl && (
     <div className="w-1/2 border-l border-border/50">
       <RemoteBrowser url={liveViewUrl} />
     </div>
   )}
   ```

## Result

**Default Mode (Watch Live OFF)**:
```text
┌─────────────────────────────────────┐
│ TimeWarp AI              [Live: OFF]│
├─────────────────────────────────────┤
│                                     │
│  ✨ Starting                        │
│     Working on your task...         │
│                                     │
│  🌐 Navigate                        │
│     Opening canva.com               │
│                                     │
│  👆 Click                           │
│     Clicking "Sign Up"              │
│                                     │
│  🔐 Login Required                  │
│     Please sign in to continue      │
│                                     │
└─────────────────────────────────────┘
```

**Watch Live Mode (Toggled ON)**:
```text
┌─────────────────────────────────────────────────────────┐
│ TimeWarp AI                               [Live: ON]    │
├─────────────────────────────────────────────────────────┤
│ ┌───────────────────────┐ ┌───────────────────────────┐ │
│ │                       │ │ 🚀 Starting               │ │
│ │  [LIVE BROWSER VIEW]  │ │    Initializing browser...│ │
│ │                       │ │                           │ │
│ │  canva.com/signup     │ │ 🎥 Session Ready          │ │
│ │                       │ │    Session: abc12345...   │ │
│ │                       │ │                           │ │
│ │                       │ │ 🌐 Navigate               │ │
│ │                       │ │    Opening canva.com      │ │
│ └───────────────────────┘ └───────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Technical Notes

- The Browserbase session is still created in both modes (required for task execution)
- Only the UI messaging and live view are affected by the toggle
- Error handling will show more technical details when Watch Live is on (for debugging)
- All action steps (navigate, click, type, etc.) are always shown regardless of mode
