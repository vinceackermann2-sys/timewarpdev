export interface TaskReportStep {
  step: number;
  action: string;
  reasoning: string;
  result: string;
  timestamp: string;
  url?: string;
}

function summarizeSteps(steps: TaskReportStep[]): string {
  if (!steps.length) return "";

  const lines: string[] = ["## Task summary (what was done / found)"];

  for (const s of steps) {
    const url = s.url && !s.url.includes("about:blank") ? ` — ${s.url}` : "";
    const outcome = s.result && s.result !== "pending" ? ` → _${s.result}_` : "";
    const reasoning = (s.reasoning || "").replace(/\s+/g, " ").trim().slice(0, 220);
    const action = s.action || "step";
    lines.push(`- **Step ${s.step}** (${action})${outcome}: ${reasoning || "(no description)"}${url}`);
  }

  return lines.join("\n");
}

export function generateTaskReport(
  agentName: string,
  task: string,
  steps: TaskReportStep[],
  startTime: Date,
  endTime: Date,
  durationSec: number,
  finalMessage?: string,
): string {
  void agentName;
  void task;
  void startTime;
  void endTime;
  void durationSec;

  const sections: string[] = [];

  const stepSummary = summarizeSteps(steps);
  if (stepSummary) sections.push(stepSummary);

  if (finalMessage) {
    sections.push("## Result\n" + finalMessage);
  } else {
    const respondSteps = steps.filter((s) => s.result === "respond" || s.result === "done");
    if (respondSteps.length > 0) {
      sections.push("## Result\n" + respondSteps.map((s) => s.reasoning).join("\n\n"));
    } else {
      sections.push("## Result\nNo structured results were collected for this task.");
    }
  }

  const urls = [...new Set(steps.filter((s) => s.url && !s.url.includes("about:blank")).map((s) => s.url!))];
  if (urls.length > 0) {
    sections.push(`## Sources\n` + urls.map((u) => `- ${u}`).join("\n"));
  }

  return sections.filter(Boolean).join("\n\n");
}

/** Short bullets for the main chat bubble (in addition to reportContent). */
export function buildChatTaskSummaryPreview(steps: TaskReportStep[], maxBullets = 5): string {
  const done = steps.filter((s) => s.reasoning && s.result !== "pending");
  if (!done.length) return "";
  const tail = done.slice(-maxBullets);
  const lines = tail.map((s) => {
    const act = s.action ? `${s.action}: ` : "";
    return `- ${act}${s.reasoning.replace(/\s+/g, " ").trim().slice(0, 200)}`;
  });
  return ["**What we found**", ...lines].join("\n");
}
