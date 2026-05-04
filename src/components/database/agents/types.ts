/**
 * Shared types for ai_agents — pure-executor automations.
 *
 * Mirrors the ai_agents Postgres schema (see migration
 * 20260430120000_add_ai_agents_and_employee_domain_lens.sql).  The Supabase
 * generated types use Json for JSONB columns; we narrow them here so UI code
 * doesn't have to repeat the casts.
 */

export type AgentTriggerType = "manual" | "event" | "schedule" | "threshold";
export type AgentStatus = "draft" | "active" | "paused";
export type AgentRunStatus = "running" | "success" | "failure" | "escalated";
export type AgentExecutionMode = "api" | "computer";

/** One step in an agent's SOP. Atomic + testable, no ambiguity. */
export interface AgentSopStep {
  /** Short imperative label, e.g. "Read incoming message". */
  label: string;
  /** Optional longer detail / acceptance criteria. */
  detail?: string;
}

/** Full agent record as stored in the database. */
export interface AIAgent {
  id: string;
  user_id: string;
  workspace_id: string | null;
  linked_business_id: string | null;
  supervisor_employee_id: string | null;

  name: string;
  description: string | null;
  status: AgentStatus;

  trigger_type: AgentTriggerType;
  trigger_source: string | null;
  trigger_condition: string | null;
  trigger_schedule: string | null;
  required_integrations: string[];

  sop_steps: AgentSopStep[];
  sop_output: string | null;

  safety_can_do: string[];
  safety_cannot_do: string[];
  safety_escalation_path: string | null;

  last_run_at: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}

/** A single execution log row from ai_agent_runs. */
export interface AgentRun {
  id: string;
  agent_id: string;
  user_id: string;
  status: AgentRunStatus;
  trigger_kind: string;
  step_label: string | null;
  message: string | null;
  output: unknown;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

/** Friendly labels for the UI. */
export const TRIGGER_TYPE_LABEL: Record<AgentTriggerType, string> = {
  manual: "Manual — user clicks Run now",
  event: "Event — an integration emits something",
  schedule: "Schedule — runs on a cadence",
  threshold: "Threshold — a metric crosses a value",
};

export const STATUS_LABEL: Record<AgentStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
};

/**
 * Normalize a row coming back from supabase (where JSONB columns are typed as
 * Json) into a typed AIAgent.  Defaults match the DB column defaults.
 */
export function normalizeAgentRow(row: any): AIAgent {
  return {
    id: row.id,
    user_id: row.user_id,
    workspace_id: row.workspace_id ?? null,
    linked_business_id: row.linked_business_id ?? null,
    supervisor_employee_id: row.supervisor_employee_id ?? null,
    name: row.name ?? "Untitled agent",
    description: row.description ?? null,
    status: (row.status as AgentStatus) ?? "draft",
    trigger_type: (row.trigger_type as AgentTriggerType) ?? "manual",
    trigger_source: row.trigger_source ?? null,
    trigger_condition: row.trigger_condition ?? null,
    trigger_schedule: row.trigger_schedule ?? null,
    required_integrations: Array.isArray(row.required_integrations)
      ? (row.required_integrations as string[])
      : [],
    sop_steps: Array.isArray(row.sop_steps) ? (row.sop_steps as AgentSopStep[]) : [],
    sop_output: row.sop_output ?? null,
    safety_can_do: Array.isArray(row.safety_can_do) ? (row.safety_can_do as string[]) : [],
    safety_cannot_do: Array.isArray(row.safety_cannot_do)
      ? (row.safety_cannot_do as string[])
      : [],
    safety_escalation_path: row.safety_escalation_path ?? null,
    last_run_at: row.last_run_at ?? null,
    run_count: row.run_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
