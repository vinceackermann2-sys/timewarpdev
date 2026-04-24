/**
 * Whether a user message should trigger live connector search.
 * Kept free of OAuth / provider imports so it can be unit-tested from Node/Vitest.
 */

const CONNECTION_TRIGGER_PATTERNS = [
  /\b(collab\w*|collaboration\w*|partnership\w*|partner\w*|meeting\w*|follow.?up|agenda)\b/i,
  /\b(complaint|issue|ticket|support|bug|problem|incident)s?\b/i,
  /\b(email|mail|inbox|message|slack|teams|chat|dm|thread|gmail|outlook)s?\b/i,
  /\b(file|document|doc|sheet|attachment|drive|onedrive|sharepoint|gdrive|gdoc|gsheet|gslide|slides?|presentation)s?\b/i,
  /\b(calendar|schedule|event|appointment|invite|gcal)s?\b/i,
  /\b(customer|client|contact|deal|lead|crm|hubspot)s?\b.{0,40}\b(said|wrote|asked|mentioned|replied|responded|deal|stage|pipeline|value)s?\b/i,
  /\b(hubspot|crm)\b/i,
  /\b(stripe|payment|charge|invoice|mrr|arr|revenue|payout|refund|subscriber|subscription|checkout)s?\b/i,
  /\b(recent|latest|new|incoming|pending|unread|last)\b.{0,30}\b(email|mail|message|file|document|doc|sheet|drive|onedrive|gmail|slack|meeting|event|note|page|ticket|deal|lead|contact|presentation|slide)s?\b/i,
  /\b(my|our|the)\s+(last|latest|recent)\s+\d*\s*(email|mail|message|file|document|doc|sheet|drive|onedrive|gmail|slack|meeting|event|note|page|ticket|deal|lead|contact|presentation|slide)s?\b/i,
  /\b(check|search|find|look\s+up|pull|show|list|get)\s+(me\s+)?(my|our|the)?\s*(email|slack|message|file|document|doc|sheet|drive|gmail|hubspot|crm|note|page|meeting|event|deal|lead|contact|presentation|slide)s?\b/i,
  /\b(what|any)\b.{0,30}\b(coming\s+up|scheduled|planned|pending)\b/i,
  /\b(in|from)\s+my\s+(drive|inbox|mailbox|calendar|slack|hubspot|crm|onedrive|gmail|outlook|notebook|notes)\b/i,
  /\bwhat(?:'s|\s+is|\s+are)\s+(my|our)\s+(meetings|events|calls|appointments)\b/i,
  /\b(do|have)\s+i\s+(have|get)\s+(any\s+)?(meetings|events|calls)\b/i,
  /\b(synced|sync)\s+(emails?|messages?|files?|calendar)\b/i,
  /\bwhy\b.{0,70}\b(delay|delayed|late|slipped|behind|blocked|stuck|at risk|off track|not on track)\b.{0,45}\b(project|launch|release|ship|delivery|milestone|initiative|rollout|timeline)\b/i,
  /\b(project|launch|initiative|milestone|rollout)\b.{0,50}\b(delayed|behind|late|slipped|overdue|blocked|stuck|at risk|off track|status)\b/i,
  /\b(status|health)\b.{0,30}\b(project|initiative|launch|program|workstream)\b/i,
  /\b(blocker|blocked|blocking|hold\s*up|snag)\b.{0,40}\b(project|team|launch|delivery|release)\b/i,
];

export function shouldSearchConnections(query: string): { shouldSearch: boolean; reason: string } {
  if (!query || query.length < 3) {
    return { shouldSearch: false, reason: "Skipped live search — message too short to match tool lookup intent" };
  }
  const q = query.toLowerCase();
  for (const pattern of CONNECTION_TRIGGER_PATTERNS) {
    if (pattern.test(q)) {
      return { shouldSearch: true, reason: "Live tool lookup — searching connected mail, files, calendar, CRM, or chat where applicable" };
    }
  }
  return {
    shouldSearch: false,
    reason: "Skipped live search — strategy or stored business context (connect mail, Drive, or calendar if you need live items)",
  };
}
