import type { AssistantGoal } from "./goalSetter.ts";

/**
 * Concise, rotating progress labels.
 *
 * Goals:
 *  - Don't echo the user's query verbatim every step (felt repetitive / "parrot").
 *  - Don't repeat the exact same phrasing every turn.
 *  - Keep labels short (≤ ~36 chars) so the activity log feels light, not noisy.
 */

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const START_DATA = [
  "Reading the request",
  "Sizing up the ask",
  "Mapping what you need",
  "Locking in the goal",
] as const;

const START_THINK = [
  "Framing the problem",
  "Getting the angle right",
  "Sharpening the question",
  "Lining up the approach",
] as const;

const CONNECTORS = [
  "Checking your connected tools",
  "Sweeping live integrations",
  "Pulling from connected apps",
  "Scanning live sources",
] as const;

const DASHBOARD = [
  "Reading the CEO dashboard",
  "Pulling dashboard snapshot",
  "Checking dashboard signals",
] as const;

const WEB = [
  "Gathering external context",
  "Sweeping the public web",
  "Looking outside for signal",
] as const;

const SKILLS_GENERIC = [
  "Loading playbooks",
  "Calling on specialist guidance",
  "Pulling relevant playbooks",
] as const;

const LLM_ANSWER = [
  "Composing the answer",
  "Drafting the response",
  "Writing it up",
] as const;

const LLM_RECO = [
  "Forming a recommendation",
  "Shaping the call",
  "Making the recommendation",
] as const;

export function buildConnectorProgressLabel(
  phase: "start" | "connectors" | "dashboard" | "web" | "skills" | "llm",
  goal: AssistantGoal,
  _detail?: string,
): { label: string; action: string } {
  switch (phase) {
    case "start":
      return {
        label: pick(goal.type === "data_retrieval" ? START_DATA : START_THINK),
        action: "analysis",
      };
    case "connectors":
      return { label: pick(CONNECTORS), action: "context" };
    case "dashboard":
      return { label: pick(DASHBOARD), action: "context" };
    case "web":
      return { label: pick(WEB), action: "context" };
    case "skills":
      return {
        label: goal.suggestedSkills.length
          ? `Applying ${goal.suggestedSkills[0]}`
          : pick(SKILLS_GENERIC),
        action: "skill",
      };
    case "llm":
      return {
        label: pick(goal.requiresConclusion ? LLM_RECO : LLM_ANSWER),
        action: "response",
      };
    default:
      return { label: "Working on it", action: "process" };
  }
}
