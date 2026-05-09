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

/** Normalize for substring checks (lowercase, collapse whitespace). */
function normCtx(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Pull subjects, file names, channel titles, etc. from injected live blocks
 * (matches search formatters in connections.ts + live-source-citations).
 */
function buildLiveTitleAllowlist(connectionContext: string): Set<string> {
  const allow = new Set<string>();
  const add = (s: string) => {
    const t = normCtx(s);
    if (t.length >= 3 && t.length <= 220) allow.add(t);
  };

  let m: RegExpExecArray | null;

  const subjRe = /SUBJECT:\s*["'\u201c]([^"'\u201d]+)["'\u201d]/gi;
  while ((m = subjRe.exec(connectionContext)) !== null) add(m[1]);

  const subjPlain = /SUBJECT:\s*([^\n|]+)/gi;
  while ((m = subjPlain.exec(connectionContext)) !== null) {
    const v = m[1].replace(/^["'\s]+|["'\s]+$/g, "");
    if (v && !/^from:\s*$/i.test(v)) add(v);
  }

  const boldRe = /\*\*([^*]+)\*\*/g;
  while ((m = boldRe.exec(connectionContext)) !== null) add(m[1]);

  const tickFile = /`([^`\n]{3,200})`/g;
  while ((m = tickFile.exec(connectionContext)) !== null) add(m[1]);

  return allow;
}

function lineLooksLiveGrounded(line: string): boolean {
  return /\b(drive|onedrive|gmail|outlook|email|inbox|file|document|docs?|sheets?|slides?|slack|hubspot|deal|meeting|calendar|onenote|thread|message from|subject:|sender|zoom|stripe|twsrc_\d+)\b/i
    .test(line);
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

/** Catches invented titles written in quotes without bold (common LLM pattern). */
function annotateUnverifiedQuotesInLiveLine(line: string, ctxNorm: string): string {
  if (!lineLooksLiveGrounded(line)) return line;
  return line.replace(/"([^"]{10,240})"/g, (full, inner: string) => {
    const raw = String(inner).trim();
    const key = normCtx(raw);
    if (key.length < 10) return full;
    if (ctxNorm.includes(key)) return full;
    for (let i = 0; i <= key.length - 24; i += 8) {
      const slice = key.slice(i, i + 48);
      if (slice.length >= 12 && ctxNorm.includes(slice)) return full;
    }
    return `"${raw}" _(not found verbatim in Connected Sources above — verify)_`;
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

const LIVE_VERIFY_PREAMBLE =
  "> *Connected Sources returned rows this turn. Only treat an email/file/meeting name as a **live fact** if that exact label appears in the Connected Sources block above (or is marked verify below).*\n\n";

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
    const ctxNorm = normCtx(connectionContext);
    const body = assistantText
      .split("\n")
      .map((line) => sanitizeLineAgainstAllowlist(line, allow))
      .map((line) => annotateUnverifiedQuotesInLiveLine(line, ctxNorm))
      .join("\n");
    if (allow.size === 0) {
      return `${LIVE_VERIFY_PREAMBLE}> *Could not extract stable title tokens from the live rows for auto-verification — confirm any specific names in your apps before acting.*\n\n${body}`;
    }
    return body;
  }

  if (hasConnectedSourcesSection(connectionContext) && (lookupIndicatesNoRows(connectionContext) || !/### Live Data from/i.test(connectionContext))) {
    return scrubFabricatedLiveWhenNoHits(assistantText);
  }

  return assistantText;
}
