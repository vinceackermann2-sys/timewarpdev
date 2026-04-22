export function generateTaskReport(
  agentName: string,
  task: string,
  steps: { step: number; action: string; reasoning: string; result: string; timestamp: string; url?: string }[],
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

  const lines: string[] = [];

  if (finalMessage) {
    lines.push(finalMessage);
  } else {
    const respondSteps = steps.filter(s => s.result === "respond" || s.result === "done");
    if (respondSteps.length > 0) {
      lines.push(respondSteps.map(s => s.reasoning).join("\n\n"));
    } else {
      lines.push("No results were collected for this task.");
    }
  }

  const urls = [...new Set(steps.filter(s => s.url && !s.url.includes("about:blank")).map(s => s.url!))];
  if (urls.length > 0) {
    lines.push(`\n\n---\n**Sources:**`);
    urls.forEach(u => lines.push(`- ${u}`));
  }

  return lines.join("\n");
}
