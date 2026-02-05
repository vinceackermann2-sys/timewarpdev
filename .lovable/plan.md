

# TimeWarp AI Chat Interface Redesign

## Overview

Transform the current 3-step wizard into a conversational chat interface with two viewing modes: a default "Step View" showing AI actions as logic nodes, and a toggle-on "Watch Live" mode that streams the browser session.

## Current vs New Design

```text
CURRENT FLOW:
+------------------+     +------------------+
|  Step 1: Role    | --> |  Step 2: Task    | --> Step 3: Time --> LiveBrowserView
|  (CEO/CMO/CFO)   |     |  (Textarea)      |
+------------------+     +------------------+

NEW FLOW:
+-------------------------------------------------------+
|  Chat Interface                          [Watch Live] |
|-------------------------------------------------------|
|  AI: Hi! What would you like me to do?                |
|  User: Create a Notion workspace for project mgmt     |
|  AI: Got it! Starting task... (shows step nodes)      |
|                                                       |
|  [====== Step Nodes / Logic View ======]              |
|  | 1. Navigate to notion.com          |               |
|  | 2. Click "Get Started"             |               |
|  | 3. LOGIN REQUIRED - Please sign in |               |
|                                                       |
|  [Type your task...]                     [Send]       |
+-------------------------------------------------------+
```

## Key Features

### 1. Chat-Based Input
- Simple text input to describe tasks naturally
- No role selection required (AI infers from context, defaults to general assistant)
- Optional quick suggestions for common tasks

### 2. Two Viewing Modes (Toggle Switch)

**Default: Step View (Logic Nodes)**
- Shows agent actions as step cards/nodes
- Lightweight, no browser iframe loaded
- Displays: action icon, title, description, timestamp
- Progress indicator for overall task

**Toggle On: Watch Live**
- Full Browserbase live view in iframe
- Real-time browser interaction visible
- Step nodes appear in a sidebar panel

### 3. Safety Controls (Manual Handoff)

The AI will automatically pause and request manual intervention for:
- Login pages (OAuth, email/password forms)
- Payment/checkout pages
- 2FA/verification prompts
- CAPTCHAs
- Any page with sensitive data entry

When paused, user sees:
- Clear instructions on what action is needed
- "Continue" button to resume after completing the action
- Option to take full control and stop automation

## Component Structure

### Files to Create/Modify

1. **`src/components/database/TimeWarpAIView.tsx`** (Major Rewrite)
   - Chat interface with message history
   - Toggle switch for viewing mode
   - Input field at bottom
   - Integrates step nodes or browser view based on mode

2. **`src/components/database/AgentStepView.tsx`** (New)
   - Standalone step nodes display (without activity log sidebar styling)
   - Full-width layout optimized for chat context
   - Clear visual hierarchy for completed/running/pending steps

3. **`src/components/database/AgentChatMessage.tsx`** (New)
   - Chat bubble component for user and assistant messages
   - Assistant messages can embed step nodes inline
   - Handles handoff UI (login required banner)

### State Management

```text
State:
- messages: ChatMessage[] (role, content, steps?)
- isAgentRunning: boolean
- viewMode: "steps" | "live"
- currentSession: { sessionId, connectUrl, liveViewUrl } | null
- handoffRequired: { type: string, instructions: string } | null
```

## UI Layout

### Step View Mode (Default)
```text
+----------------------------------------------------------+
| TimeWarp AI                              [Toggle: Steps] |
|----------------------------------------------------------|
|                                                          |
|  [Assistant bubble]                                      |
|  What would you like me to help you with today?          |
|                                                          |
|  [User bubble - right aligned]                           |
|  Sign up for Canva and create a social media template    |
|                                                          |
|  [Assistant bubble with embedded steps]                  |
|  Starting task...                                        |
|  +--------------------------------------------------+    |
|  | Step 1: Navigate to canva.com            [Done]  |    |
|  | Step 2: Click "Sign Up"                  [Done]  |    |
|  | Step 3: LOGIN REQUIRED                   [Waiting]|    |
|  +--------------------------------------------------+    |
|                                                          |
|  [HANDOFF BANNER - Yellow warning]                       |
|  Please sign in to Canva, then click Continue            |
|  [Continue After Login]                                  |
|                                                          |
|----------------------------------------------------------|
| [Type what you'd like to accomplish...]        [Send]    |
+----------------------------------------------------------+
```

### Watch Live Mode (Toggled On)
```text
+----------------------------------------------------------+
| TimeWarp AI                              [Toggle: Live]  |
|----------------------------------------------------------|
| +--------------------------------+ +-------------------+ |
| |                                | | Activity Log      | |
| |   [BROWSERBASE LIVE VIEW]      | |                   | |
| |                                | | Step 1: Navigate  | |
| |   https://canva.com            | | Step 2: Click     | |
| |                                | | Step 3: Waiting   | |
| |                                | |                   | |
| +--------------------------------+ +-------------------+ |
|----------------------------------------------------------|
| [Type what you'd like to accomplish...]        [Send]    |
+----------------------------------------------------------+
```

## Technical Implementation

### 1. TimeWarpAIView.tsx Changes

- Remove role selection cards
- Remove time estimate selector
- Add chat message list with ScrollArea
- Add view mode toggle (Switch component)
- Input at bottom with send button
- Conditionally render AgentStepView or LiveBrowserView

### 2. Agent Execution Flow

1. User types task and hits send
2. Message added to chat history
3. Browser session created (always, for potential live view toggle)
4. Agent loop starts, executing steps
5. Steps displayed inline in chat (Step View) or in sidebar (Live View)
6. On handoff triggers, pause with clear UI
7. User completes action and clicks "Continue"
8. On completion, show summary in chat

### 3. Safety Checks (Existing Logic - Enhanced UI)

The `run-agent` edge function already detects:
- Login pages, OAuth prompts
- 2FA/verification screens
- CAPTCHAs

Enhancement: Add detection for:
- Payment forms (credit card inputs)
- Sensitive forms (SSN, personal info)

Handoff banner shows contextual instructions based on type.

## Summary

This redesign simplifies the user experience from a 3-step wizard to a natural chat interface, while adding flexibility with the view mode toggle. The default "Step View" is lightweight and shows clear progress, while "Watch Live" provides full visibility for users who want to see exactly what the AI is doing. Safety remains a priority with automatic pauses for any sensitive operations.

