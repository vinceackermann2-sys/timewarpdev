/**
 * Post-check assistant markdown against live connector context to reduce invented file/email titles.
 * Runs when live search returned hits (allowlist), and when lookup returned **no** hits or there
 * are no "### Live Data" rows — to flag lines that still read like fabricated connector items.
 */

function liveSearchReturnedHits(connectionContext: string): boolean {
  if (!connectionContext || connectionContext.length < 80) return false;
  if (/No matching live results|nothing live to look at|Lookup Outcome.*no matches/i.test(connectionContext)) {
    return false;
  }
  return /### Live Data from/i.test(connectionContext);
}

function lookupIndicatesNoRows(connectionContext: string): boolean {
  if (!connectionContext || connectionContext.length < 40) return false;
  return /no matches|no matching|nothing matched|lookup outcome:.*no\b|0\s+matches|returned no rows/i.test(connectionContext);
}

function hasConnectedSourcesSection(connectionContext: string): boolean {
  return /##\s*Connected Sources/i.test(connectionContext);
}

/** Pull quoted subjects and bold titles from injected live blocks (matches our search formatters). */
function buildLiveTitleAllowlist(connectionContext: string): Set<string> {
  const allow = new Set<string>();
  const add = (s: string) => {
    const t = s.trim().toLowerCase();
    if (t.length >= 3 && t.length <= 200) allow.add(t);
  };

  const subjRe = /SUBJECT:\s*"([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = subjRe.exec(connectionContext)) !== null) add(m[1]);

  const boldRe = /\*\*([^*]+)\*\*/g;
  while ((m = boldRe.exec(connectionContext)) !== null) add(m[1]);

  return allow;
}

function lineLooksLiveGrounded(line: string): boolean {
  return /\b(drive|onedrive|gmail|outlook|email|inbox|file|document|slack|hubspot|deal|meeting|calendar|onenote|thread|message from|subject:|sender)\b/i.test(line);
}

function sanitizeLineAgainstAllowlist(line: string, allow: Set<string>): string {
  if (!lineLooksLiveGrounded(line)) return line;
  return line.replace(/\*\*([^*]+)\*\*/g, (full, inner: string) => {
    const key = String(inner).trim().toLowerCase();
    if (key.length < 4 || key.length > 180) return full;
    if (allow.has(key)) return full;
    for (const a of allow) {
      if (a.includes(key) || key.includes(a)) return full;
    }
    return `**${String(inner).trim()}** _(not found in live connector results above — verify)_`;
  });
}

function scrubFabricatedLiveWhenNoHits(assistantText: string): string {
  const lower = assistantText.toLowerCase();
  if (!/\b(gmail|outlook|drive|calendar|slack|hubspot|onedrive|onenote|zoom)\b/.test(lower)) {
    return assistantText;
  }
  if (/>\s*\*No matching rows from connectors/i.test(assistantText)) return assistantText;
  return `> *No matching rows from connectors were returned for this query. Treat any specific email, file, meeting, or deal titles below as **unverified** unless they also appear in Business DNA or user text — do not present them as live search facts.*\n\n${assistantText}`;
}

/**
 * If a line cites live tools and contains **Title** not in allowlist, soften wording.
 * When connectors returned no rows (or no live rows at all), append a guard on suspicious lines.
 */
export function sanitizeAssistantAgainstLiveContext(
  assistantText: string,
  connectionContext: string,
): string {
  if (!assistantText) return assistantText;
  if (!connectionContext || connectionContext.length < 40) return assistantText;

  if (liveSearchReturnedHits(connectionContext)) {
    const allow = buildLiveTitleAllowlist(connectionContext);
    if (allow.size === 0) return assistantText;
    return assistantText
      .split("\n")
      .map((line) => sanitizeLineAgainstAllowlist(line, allow))
      .join("\n");
  }

  if (hasConnectedSourcesSection(connectionContext) && (lookupIndicatesNoRows(connectionContext) || !/### Live Data from/i.test(connectionContext))) {
    return scrubFabricatedLiveWhenNoHits(assistantText);
  }

  return assistantText;
}
