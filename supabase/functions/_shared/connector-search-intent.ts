/**
 * Heuristic routing for live connector search: broaden recall for execution / delay
 * questions and avoid irrelevant Zoom noise when the user is not asking about meetings.
 */

export type ConnectorSearchIntentId = "default" | "project_execution" | "scheduling_focus";

export type ConnectorSearchIntentProfile = {
  id: ConnectorSearchIntentId;
  /** Query passed to provider search APIs (may include silent recall terms). */
  augmentedQuery: string;
  /** Optional topic hint for buildSearchTerms / extractQueryTopic merge. */
  topicHint?: string;
  /** Skip Zoom meeting fetch when true (project/delay questions without Zoom keyword). */
  omitZoom: boolean;
};

export function buildConnectorSearchIntentProfile(userQuery: string): ConnectorSearchIntentProfile {
  const q = (userQuery || "").trim();
  const low = q.toLowerCase();

  const schedulingStrong =
    /\b(zoom|webinar|gcal|google\s*calendar|outlook\s*calendar|calendar|meeting|appointment|invite|call)\b/i.test(low) &&
    /\b(when|what\s*time|upcoming|next|schedule|today|tomorrow)\b/i.test(low);

  const projectStrong =
    /\b(project|launch|milestone|initiative|rollout|delivery|deploy|release|program|workstream)\b/i.test(low) &&
    /\b(delay|delayed|late|slipped|behind|blocked|stuck|status|risk|why|snag|hold\s*up)\b/i.test(low);

  if (schedulingStrong && !projectStrong) {
    return { id: "scheduling_focus", augmentedQuery: q, topicHint: undefined, omitZoom: false };
  }

  if (projectStrong) {
    const extra = "status timeline blocker risk delay updates standup";
    return {
      id: "project_execution",
      augmentedQuery: `${q} ${extra}`.trim(),
      topicHint: "project execution signals",
      omitZoom: !/\bzoom\b/i.test(low),
    };
  }

  return { id: "default", augmentedQuery: q, topicHint: undefined, omitZoom: false };
}
