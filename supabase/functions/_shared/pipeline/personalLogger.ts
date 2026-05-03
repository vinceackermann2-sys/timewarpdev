import type { AssistantGoal } from "./goalSetter.ts";

/** Context-aware progress labels (no fixed template array). */
export function buildConnectorProgressLabel(
  phase: "start" | "connectors" | "dashboard" | "web" | "skills" | "llm",
  goal: AssistantGoal,
  detail?: string,
): { label: string; action: string } {
  const g = goal.summary.slice(0, 72);
  switch (phase) {
    case "start":
      return {
        label: goal.type === "data_retrieval" ? `Locating data for: ${g}` : `Understanding your goal: ${g}`,
        action: "analysis",
      };
    case "connectors":
      return {
        label: `Searching connected tools for ${g}${detail ? ` — ${detail}` : ""}`,
        action: "context",
      };
    case "dashboard":
      return { label: `Loading CEO dashboard snapshot for ${g}`, action: "context" };
    case "web":
      return { label: `Gathering external context for ${g}`, action: "context" };
    case "skills":
      return {
        label: goal.suggestedSkills.length
          ? `Applying playbooks: ${goal.suggestedSkills.join(", ")}`
          : `Preparing specialist guidance for ${g}`,
        action: "skill",
      };
    case "llm":
      return { label: `Drafting ${goal.requiresConclusion ? "recommendation" : "answer"} for ${g}`, action: "response" };
    default:
      return { label: `Working on ${g}`, action: "process" };
  }
}
