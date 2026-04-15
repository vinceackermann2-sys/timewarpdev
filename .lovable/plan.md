

# Upgrade Assistant Chat to Match Intelligence Model PDF

## Summary

The PDF is largely a specification of the existing architecture, but there are concrete gaps in the system prompts (personality enforcement, anti-patterns, quality rules) and the `buildChatPrompt` in extension-agent which is notably weaker than the research-chat/action-chat prompts. The key changes are upgrading all system prompts to match the PDF's quality standards.

## What Already Works (No Changes Needed)

- Intent Classification Engine (5-mode cascade in `handleSendMessage`) — matches PDF exactly
- Context Assembly Pipeline (5 layers) — all implemented
- File/URL processing — implemented
- Employee delegation framework — implemented
- Computer Mode execution — implemented
- Chat session persistence — implemented
- Suggestion system (`[SUGGEST:]` tags + `parseSuggestions.ts`) — implemented
- Safety guardrails (pre/post-flight) — implemented
- Connection search intelligence — implemented

## What Needs Upgrading

### 1. `extension-agent/index.ts` — `buildChatPrompt()` (lines 623-681)

The main agent chat prompt is significantly weaker than the PDF specification. Currently it says "You are an intelligent AI assistant" — generic and missing the CEO personality framework entirely. Upgrade to match:

- **Personality Framework**: Add the 7 personality traits (Decisive, Contrarian, Data-Grounded, Constructive, Strategic, Direct) from PDF Section 3.1
- **Anti-Pattern Rules**: Add explicit "NEVER do" rules from PDF Section 7 (no blind agreement, no generic content, no fabricated metrics, no "I don't have access")
- **Mandatory Suggestions**: Add the `[SUGGEST:]` tag requirement (currently missing from this prompt — only research-chat and action-chat have it)
- **Quality Scoring Awareness**: Add quality criteria from PDF Section 6 (Data Grounding 30%, Actionability 20%, Format Richness 15%, Specificity 15%, Personality 10%, Suggestion Quality 10%)
- **Response Format Rules**: Strengthen table usage, blockquote usage, and horizontal rule usage per PDF Section 3.2

### 2. `research-chat/index.ts` — System Prompt (lines 178-210)

Already strong but missing:
- Explicit anti-pattern list from PDF Section 7
- Quality scoring criteria awareness
- The personality trait "Contrarian" — current prompt says "challenge weak assumptions" but PDF is more explicit

### 3. `action-chat/index.ts` — System Prompt (lines 177-212)

Already strong but missing:
- Explicit anti-pattern list
- Quality scoring criteria awareness
- Stronger personality enforcement

### 4. `run-employee/prompts.ts` — `buildEmployeeChatPrompt()` (lines 144-223)

Missing the mandatory `[SUGGEST:]` tag at the end of responses. The PDF specifies ALL modes must include suggestions.

### 5. Update Memory

Save the Assistant Chat Intelligence Model architecture to memory.

## Files Changed

1. `supabase/functions/extension-agent/index.ts` — Rewrite `buildChatPrompt()` with full CEO personality, anti-patterns, quality criteria, and mandatory suggestions
2. `supabase/functions/research-chat/index.ts` — Add anti-pattern rules and quality scoring awareness to system prompt
3. `supabase/functions/action-chat/index.ts` — Add anti-pattern rules and quality scoring awareness to system prompt
4. `supabase/functions/_shared/run-employee/prompts.ts` — Add mandatory `[SUGGEST:]` tag to employee chat prompt
5. `mem://features/assistant-chat-intelligence-model` — New memory file

## What Will NOT Change

- Frontend routing logic in `AgentChatView.tsx` — already matches the PDF's ICE cascade
- RAG retrieval in `_shared/run-employee/rag.ts` — already implements the PDF's Layer 5
- Connection search in `_shared/run-employee/connections.ts` — already matches PDF's Layer 3
- File processing logic — already matches PDF's Layer 4
- Chat session persistence — already matches PDF's Section 5
- Browser mode prompts — already comprehensive
- Safety guardrails — already implemented

