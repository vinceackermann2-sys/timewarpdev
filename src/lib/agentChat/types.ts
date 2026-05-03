import type { LiveSourceRegistry } from "@/lib/liveSourceRegistry";
import type { DataSourceAttribution } from "@/lib/agentChat/parseAssistantSources";
import type { SuggestionGroup } from "@/lib/parseSuggestions";

export type SourceEntryType = "internal" | "external" | "connector";

export interface SourceEntry {
  type: SourceEntryType;
  label: string;
  provider?: string;
  url?: string;
  snippet?: string;
}

export interface GoalState {
  id: string;
  type: "data_retrieval" | "analysis" | "action" | "creation" | "planning";
  summary: string;
  status: "active" | "paused_for_question" | "completed";
  requiresConclusion: boolean;
  dataTier: "internal" | "external" | "user_ai" | "mixed";
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /**
   * Raw assistant reply for model replay (includes `[SUGGEST:…]` / plan tags).
   * `content` is stripped for UI; the edge function needs this to detect
   * follow-up answers vs new requests.
   */
  modelTurnContent?: string;
  /** Optional sanitized text shown in the UI for user messages (hides graphic format scaffolding sent to the model). */
  displayContent?: string;
  /** Live connector row metadata for \`twcite:twsrc_N\` links in markdown (Gmail, Drive, Calendar, etc.). */
  liveSourceRegistry?: LiveSourceRegistry;
  /** Populated when assistant loads CEO dashboard snapshot cards (briefing / updates / to-dos / objectives). */
  dashboardCards?: unknown[];
  dashboardOpeningSummary?: string | null;
  dashboardHealthScore?: unknown;
  files?: { name: string; url?: string }[];
  employees?: { id: string; name: string; role: string }[];
  isStreaming?: boolean;
  streamStartTime?: number;
  /** Final elapsed seconds, captured once streaming finishes. Used to display a stable timer after reload. */
  elapsedSeconds?: number;
  taskSteps?: { action: string; label: string; status: "running" | "done" | "error"; detail?: string }[];
  currentStepIndex?: number;
  reportContent?: string;
  reportSavedToDb?: boolean;
  suggestions?: string[];
  /**
   * Per-question groups (one per [SUGGEST:...] block). When present, the UI
   * renders one card per question — used when the assistant asks multiple
   * clarifying questions in a single reply.  Falls back to the flat
   * `suggestions` + `suggestionTitle` for the legacy single-card path.
   */
  suggestionQuestions?: SuggestionGroup[];
  planActionPayloads?: Record<string, string>;
  evidenceAudit?: { status: "pass" | "warn"; score: number; warnings: string[] };
  /** Server post-flight evidence enforcement (assistant-chat SSE). */
  evidenceEnforcement?: { score: number; confidence: string; warnings: string[] };
  /** Tool invocations surfaced from the assistant-chat stream (e.g. memory_write). */
  memoryOps?: { name: string; args: Record<string, unknown> }[];
  replyContract?: "direct" | "live_lookup" | "strategic_plan";
  /** Optional personal title for the suggestions card (set by AI via [SUGGEST:Title::A|B|C]). */
  suggestionTitle?: string;
  /** User rated this assistant reply via thumbs (hidden after submit). */
  insightFeedback?: "helpful" | "not_helpful";
  planContent?: string;
  planSavedToDb?: boolean;
  planEvidenceSources?: string[];
  planConfidence?: "high" | "medium" | "low" | "unknown";
  /** Set when the assistant created an agent or employee on this turn (Option A tool call). */
  createdEntity?: { kind: "agent" | "employee"; id?: string; name?: string };
  /** Parsed from ```assistant_sources``` — shown as icon row when data_backed. */
  dataSourceAttribution?: DataSourceAttribution | null;
  /** Pipeline-attributed sources (connectors, DNA, web) for the Sources panel. */
  sources?: SourceEntry[];
  goalId?: string;
  /** True when this assistant turn is only a clarifying pause (optional client flag). */
  isQuestionPause?: boolean;
}

export type ChatTaskStep = NonNullable<ChatMessage["taskSteps"]>[number];

export type EmployeeContext = { id: string; name: string; role: string };
