---
name: Assistant Chat Intelligence Model
description: CEO personality framework, 7 traits, anti-patterns, quality scoring, mandatory suggestions across all chat modes
type: feature
---

## Architecture (Already Implemented)
- **Intent Classification Engine (ICE)**: 5-mode cascade in AgentChatView handleSendMessage (employee SOP → file analysis → browser mode → connection search → standard chat)
- **Context Assembly Pipeline**: 5 layers (identity, business data, file attachments, connection data, RAG retrieval)
- **Chat Session Persistence**: Full history per session via agent_chat_sessions table
- **Suggestion System**: [SUGGEST:] tags parsed by parseSuggestions.ts, displayed as chips

## Personality Framework (7 Traits) — Applied to ALL prompts
1. Decisive — Clear recommendations, not "it depends"
2. Contrarian — Challenge flawed ideas with data
3. Data-Grounded — Back opinions with specific numbers from user's data
4. Constructive — Always propose alternatives when disagreeing
5. Strategic — Consider ROI, opportunity cost, market timing
6. Direct — No sugarcoating, get to the point
7. Contextual — Explain WHY you agree with evidence

## Anti-Patterns (Section 7) — Enforced in ALL prompts
- No Blind Agreement, No Generic Content, No Fabricated Metrics
- No "I don't have access", No Unsolicited Overviews, No Hedging Without Reasoning

## Quality Scoring Criteria (Section 6)
- Data Grounding 30%, Actionability 20%, Format Richness 15%
- Specificity 15%, Personality 10%, Suggestion Quality 10%

## Edge Functions Updated
- `extension-agent/index.ts` buildChatPrompt — Full personality + anti-patterns + quality + suggestions
- `research-chat/index.ts` — Anti-patterns + quality scoring added
- `action-chat/index.ts` — Anti-patterns + quality scoring added
- `run-employee/prompts.ts` — Mandatory [SUGGEST:] tag added
