/**
 * Detect when the user is asking about CEO dashboard cards (briefing / updates / to-dos / objectives)
 * and load persisted tab_cards from dashboard_snapshots for prompt + chat UI.
 */

export const DASHBOARD_TAB_KEYS = ["Briefing", "Updates", "To-Dos", "Objectives"] as const;
export type DashboardTabKey = (typeof DASHBOARD_TAB_KEYS)[number];

export type DashboardIntent = {
  matched: boolean;
  /** Tabs to include (subset or all) */
  tabs: DashboardTabKey[];
  /** When true, list several cards per tab; when false, prefer tight match to user wording */
  listMode: "broad" | "specific";
  /** Lowercased tokens (length>=3) for matching a specific card */
  focusTokens: string[];
};

const TAB_TRIGGER: { re: RegExp; tab: DashboardTabKey }[] = [
  { re: /\b(briefing|briefings|today'?s?\s+brief|ceo\s+brief|morning\s+brief)\b/i, tab: "Briefing" },
  { re: /\b(updates?\s+tab|my\s+updates|dashboard\s+updates|waiting\s+on\s+me|blocked\s+on\s+me|who\s+is\s+waiting)\b/i, tab: "Updates" },
  { re: /\b(to-?dos?|todo\s+list|my\s+tasks|action\s+items?|what\s+should\s+i\s+work\s+on)\b/i, tab: "To-Dos" },
  { re: /\b(objectives?|okrs?|strategic\s+outcomes?|north\s+star)\b/i, tab: "Objectives" },
];

const BROAD_DASH_RE = /\b(my\s+)?(dashboard|cockpit|exec\s+dashboard|ceo\s+dashboard|what'?s?\s+on\s+my\s+plate|show\s+me\s+my\s+cards)\b/i;

function tokenizeForFocus(text: string): string[] {
  const stop = new Set([
    "the", "and", "for", "you", "are", "was", "has", "have", "from", "with", "that", "this", "what", "when", "where", "your", "about", "tell", "show", "give", "list", "brief", "update", "todo", "card", "cards",
  ]);
  return text
    .toLowerCase()
    .split(/\W+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stop.has(w));
}

/** Returns matched=true when the message should pull dashboard snapshot cards. */
export function detectDashboardIntent(userMessage: string): DashboardIntent {
  const raw = (userMessage || "").trim();
  if (!raw) return { matched: false, tabs: [], listMode: "broad", focusTokens: [] };

  const tabs = new Set<DashboardTabKey>();
  for (const { re, tab } of TAB_TRIGGER) {
    if (re.test(raw)) tabs.add(tab);
  }
  const broad = BROAD_DASH_RE.test(raw);
  if (broad) {
    for (const t of DASHBOARD_TAB_KEYS) tabs.add(t);
  }

  if (tabs.size === 0) return { matched: false, tabs: [], listMode: "broad", focusTokens: [] };

  const focusTokens = tokenizeForFocus(raw);
  const listMode: "broad" | "specific" = broad || focusTokens.length <= 1 ? "broad" : "specific";

  return {
    matched: true,
    tabs: [...tabs],
    listMode,
    focusTokens,
  };
}

function cardMatchesTokens(card: any, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const hay = `${card?.title || ""} ${card?.description || ""} ${card?.detail || ""}`.toLowerCase();
  return tokens.some((t) => hay.includes(t));
}

function pickCardsFromTabs(
  tabCards: Record<string, any[]>,
  intent: DashboardIntent,
): { cards: any[]; perTab: Record<string, any[]> } {
  const perTab: Record<string, any[]> = {};
  const out: any[] = [];
  const tabOrder = intent.tabs.length ? intent.tabs : [...DASHBOARD_TAB_KEYS];

  for (const tab of tabOrder) {
    const arr = Array.isArray(tabCards[tab]) ? tabCards[tab] : [];
    let slice = arr;
    if (intent.listMode === "specific" && intent.focusTokens.length) {
      slice = arr.filter((c) => cardMatchesTokens(c, intent.focusTokens));
      if (slice.length === 0) slice = arr;
    }
    const capped = slice.slice(0, intent.listMode === "broad" ? 8 : 5);
    perTab[tab] = capped;
    for (const c of capped) {
      out.push({ ...c, tab });
    }
  }
  return { cards: out.slice(0, 24), perTab };
}

function formatCardsMarkdown(perTab: Record<string, any[]>): string {
  const lines: string[] = [];
  lines.push("## CEO Dashboard (saved snapshot — source of truth for dashboard questions)");
  lines.push(
    "Rules: Answer from these cards when they contain the answer. If the user's specific question is not represented on any card, say the current dashboard snapshot does not include that item, then answer generally only if you can do so safely. Never invent cards, names, or metrics not shown below.",
  );
  let any = false;
  for (const tab of DASHBOARD_TAB_KEYS) {
    const rows = perTab[tab] || [];
    if (!rows.length) continue;
    any = true;
    lines.push(`### ${tab}`);
    for (const c of rows) {
      lines.push(
        `- **${String(c.title || "Untitled").replace(/\s+/g, " ").trim()}** (${String(c.priority || "?")}) id=\`${String(c.id || "")}\``,
      );
      if (c.description) lines.push(`  - ${String(c.description).replace(/\s+/g, " ").trim().slice(0, 320)}`);
    }
  }
  if (!any) lines.push("_(No cards in the saved snapshot for the selected tabs.)_");
  return "\n\n" + lines.join("\n");
}

export type DashboardSnapshotRow = {
  tab_cards: Record<string, any[]> | null;
  opening_summary: string | null;
  health_score: unknown;
} | null;

export async function loadDashboardSnapshotRow(
  supabase: any,
  userId: string,
  brandId: string,
): Promise<DashboardSnapshotRow> {
  const { data } = await supabase
    .from("dashboard_snapshots")
    .select("tab_cards, opening_summary, health_score")
    .eq("user_id", userId)
    .eq("brand_id", brandId)
    .maybeSingle();
  return (data as DashboardSnapshotRow) || null;
}

export type ResolveDashboardParams = {
  userId: string;
  brandId: string | null | undefined;
  userMessage: string;
  /** Optional SSE sender (extension-agent / run-employee) */
  send?: (payload: unknown) => void;
};

/**
 * Loads snapshot tab_cards, emits optional SSE for chat UI, returns markdown for system context + cards for client.
 */
export async function resolveDashboardCardsForChat(
  supabase: any,
  params: ResolveDashboardParams,
): Promise<{ markdown: string; clientCards: any[]; openingSummary: string | null; healthScore: unknown }> {
  const intent = detectDashboardIntent(params.userMessage);
  if (!intent.matched || !params.brandId) {
    return { markdown: "", clientCards: [], openingSummary: null, healthScore: null };
  }

  const row = await loadDashboardSnapshotRow(supabase, params.userId, params.brandId);
  const tabCards = (row?.tab_cards || {}) as Record<string, any[]>;
  const hasAny = DASHBOARD_TAB_KEYS.some((k) => Array.isArray(tabCards[k]) && tabCards[k].length > 0);

  if (!hasAny) {
    const md =
      "\n\n## CEO Dashboard\nThe user asked about their dashboard cards, but **no saved dashboard snapshot** was found yet. Tell them to open **Dashboard** and run **Refresh** so cards are generated, then ask again.";
    return { markdown: md, clientCards: [], openingSummary: row?.opening_summary ?? null, healthScore: row?.health_score ?? null };
  }

  const { cards, perTab } = pickCardsFromTabs(tabCards, intent);
  const markdown = formatCardsMarkdown(perTab);

  if (params.send) {
    params.send({
      type: "dashboard_cards",
      cards,
      openingSummary: row?.opening_summary ?? null,
      healthScore: row?.health_score ?? null,
      tabs: intent.tabs,
    });
  }

  return {
    markdown,
    clientCards: cards,
    openingSummary: row?.opening_summary ?? null,
    healthScore: row?.health_score ?? null,
  };
}
