export interface PlanAction {
  label: string;
  prefill: string;
  automatable: boolean;
}

const EXEC_SECTION_RE = /##\s*(30\/60\/90\s*Execution Plan|Execution Plan)[\s\S]*?(?=\n##\s|$)/i;

export function extractPlanActions(planMarkdown: string): PlanAction[] {
  const section = planMarkdown.match(EXEC_SECTION_RE)?.[0] || planMarkdown;
  const lines = section
    .split(/\n+/)
    .map((l) => l.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((l) => l.length > 12)
    .slice(0, 10);

  const actions: PlanAction[] = [];
  for (const line of lines) {
    const automatable = /create|launch|publish|build|draft|set up|setup|configure|run|analyze|research/i.test(line);
    const label = `${automatable ? "⚡" : "✏️"} ${line.slice(0, 120)}`;
    actions.push({
      label,
      prefill: `Execute this plan action: ${line}\n\nUse the strategic plan context to complete this step and report what was done.`,
      automatable,
    });
    if (actions.length >= 4) break;
  }
  return actions;
}
