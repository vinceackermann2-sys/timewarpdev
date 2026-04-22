/**
 * Post-check assistant markdown against live connector context to reduce invented file/email titles.
 * Only runs when live search returned concrete hits (not inventory-only / no-match shells).
 */

function liveSearchReturnedHits(connectionContext: string): boolean {
  if (!connectionContext || connectionContext.length < 80) return false;
  if (/No matching live results|nothing live to look at|Lookup Outcome.*no matches/i.test(connectionContext)) {
    return false;
  }
  return /### Live Data from/i.test(connectionContext);
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
  return /\b(drive|onedrive|gmail|outlook|email|inbox|file|document|slack|hubspot|deal|meeting|calendar|onenote)\b/i.test(line);
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

/**
 * If a line cites live tools and contains **Title** not in allowlist, soften wording.
 */
export function sanitizeAssistantAgainstLiveContext(
  assistantText: string,
  connectionContext: string,
): string {
  if (!assistantText || !liveSearchReturnedHits(connectionContext)) return assistantText;

  const allow = buildLiveTitleAllowlist(connectionContext);
  if (allow.size === 0) return assistantText;

  return assistantText
    .split("\n")
    .map((line) => sanitizeLineAgainstAllowlist(line, allow))
    .join("\n");
}
