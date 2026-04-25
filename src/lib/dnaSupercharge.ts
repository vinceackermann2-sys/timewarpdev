export type FieldSourceMode =
  | "website_or_onboarding"
  | "web_evidence_required"
  | "integration_preferred"
  | "integration_only"
  | "internal_or_competitor_cited";

const POLICY: Record<string, FieldSourceMode> = {
  "market.definition.tam": "web_evidence_required",
  "market.definition.sam": "web_evidence_required",
  "market.definition.som": "web_evidence_required",
  "market.competitors": "internal_or_competitor_cited",
  "financial.unit_economics": "integration_preferred",
  "financial.profitability": "integration_preferred",
  "financial.revenue_arch": "website_or_onboarding",
  "financial.projections": "web_evidence_required",
  "growth.growth_model": "internal_or_competitor_cited",
  "growth.channels": "internal_or_competitor_cited",
  "growth.experiments": "internal_or_competitor_cited",
  "strategy.bets": "internal_or_competitor_cited",
  "strategy.milestones": "internal_or_competitor_cited",
  "product.roadmap": "internal_or_competitor_cited",
  "audience.journey": "internal_or_competitor_cited",
  "people.org_chart": "integration_only",
  "people.leadership": "integration_only",
};

export function getFieldSourceMode(path: string): FieldSourceMode {
  return POLICY[path] || "website_or_onboarding";
}

export function parseMarketEvidenceItems(items: Array<{ url?: string; excerpt?: string; title?: string }>) {
  return items
    .filter((x) => !!x?.url && !!x?.excerpt)
    .map((x) => ({
      url: String(x.url),
      title: String(x.title || "evidence"),
      excerpt: String(x.excerpt).replace(/\s+/g, " ").trim().slice(0, 450),
    }))
    .slice(0, 8);
}

export function extractPeopleSignalsFromRows(rows: Array<{ data_type?: string; source?: string; title?: string; content?: string }>) {
  const contacts = rows.filter((r) => r.data_type === "contact").slice(0, 12);
  const messages = rows.filter((r) => r.data_type === "message").slice(0, 6);
  const lines: string[] = [];
  if (contacts.length > 0) {
    lines.push(`Contacts (${contacts.length}):`);
    for (const c of contacts) lines.push(`- ${c.title || "Unknown"} | ${(c.content || "").slice(0, 140)}`);
  }
  if (messages.length > 0) {
    lines.push(`Messages (${messages.length}):`);
    for (const m of messages) lines.push(`- ${m.title || "Message"} | ${(m.content || "").slice(0, 120)}`);
  }
  return lines.join("\n");
}
