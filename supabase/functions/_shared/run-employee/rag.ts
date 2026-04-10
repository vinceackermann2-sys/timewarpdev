import { STOPWORDS } from "./connections.ts";

// --- RAG Helpers ---

export function extractKeywords(text: string): string[] {
  const normalized = text.toLowerCase();
  const baseKeywords = normalized.split(/\W+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
  const expanded = [...baseKeywords];

  if (/\bprice|pricing|cost|plan|plans|package|packages|offer|offers|subscription|subscriptions|tier|tiers\b/i.test(text)) {
    expanded.push("price", "pricing", "cost", "plan", "plans", "offer", "offers", "subscription", "subscriptions", "tier", "tiers");
  }
  if (/\bmrr|arr|revenue|profit|margin|ltv|cac|arpu\b/i.test(text)) {
    expanded.push("mrr", "arr", "revenue", "profit", "margin", "ltv", "cac", "arpu");
  }
  if (/\bcustomer|customers|client|clients|lead|leads|close|closing|deal|deals|sale|sales\b/i.test(text)) {
    expanded.push("customer", "customers", "client", "clients", "lead", "leads", "close", "closing", "deal", "deals", "sale", "sales");
  }

  return [...new Set(expanded)];
}

export function extractLastUserMessage(messages: any[]): string {
  if (!messages || messages.length === 0) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      const c = messages[i].content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) return c.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ");
    }
  }
  return "";
}

export function stringifyContent(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

export function tryParseJson(value: unknown): any | null {
  if (typeof value !== "string") return value && typeof value === "object" ? value : null;
  try { return JSON.parse(value); } catch { return null; }
}

function getLogicalBrandIdFromRow(row: any): string | null {
  const parsed = tryParseJson(row?.content);
  return typeof parsed?.id === "string" && parsed.id.trim() ? parsed.id : null;
}

function getItemLogicalBrandId(item: any): string | null {
  if (typeof item?.metadata?.brandId === "string" && item.metadata.brandId.trim()) return item.metadata.brandId;
  const parsedContent = tryParseJson(item?.content);
  if (typeof parsedContent?.brandId === "string" && parsedContent.brandId.trim()) return parsedContent.brandId;
  return null;
}

export function getVerificationIntent(userQuery: string) {
  const normalized = userQuery.toLowerCase();
  const hasPricingTerms = /\b(price|pricing|prices|cost|costs|plan|plans|package|packages|offer|offers|subscription|subscriptions|tier|tiers)\b/.test(normalized);
  const asksPricingLookup = (hasPricingTerms && /\b(what(?:'s| is)?|show|list|tell|check|verify|find|give)\b/.test(normalized))
    || /\b(my|our|current)\s+(pricing|prices|plans|packages|offers|subscriptions|tiers)\b/.test(normalized)
    || /\bwhat(?:'s| is)\s+(my|our|the)\s+(price|pricing)\b/.test(normalized)
    || /\bwhat\s+(offers|plans|packages)\s+(do|does)\s+(i|we)\s+have\b/.test(normalized);
  const mentionsRevenue = /\b(mrr|arr|revenue)\b/.test(normalized);
  const asksCustomerMath = mentionsRevenue
    && ((/\b(customer|customers|client|clients|deal|deals)\b/.test(normalized) && /\b(need|needs|needed|close|closing|get|reach|hit|make)\b/.test(normalized))
      || /\bhow many\b/.test(normalized));
  const asksRevenueVerification = mentionsRevenue && /\b(what(?:'s| is)?|show|tell|check|verify|calculate|calc|need|reach|get|hit)\b/.test(normalized);

  return {
    asksPricingLookup,
    asksCustomerMath,
    asksRevenueVerification,
    needsStrictVerification: asksPricingLookup || asksCustomerMath || asksRevenueVerification,
  };
}

export async function loadScopedBusinessItems(supabase: any, employee: any, strictBusinessScope = false): Promise<{ items: any[]; selectedBusinessTitle: string; warning: string | null }> {
  const wsFilter = employee.workspace_id || null;
  let query = supabase
    .from("user_business_data")
    .select("id, title, content, analyzed_content, data_type, source, metadata");

  if (wsFilter) query = query.eq("workspace_id", wsFilter);
  else query = query.eq("user_id", employee.user_id);

  const { data: allItems } = await query.limit(500);
  const items = allItems || [];

  if (!employee.linked_business_id) {
    if (strictBusinessScope) {
      return { items: [], selectedBusinessTitle: "", warning: "No specific business is selected for this employee, so I can't safely verify pricing or offer data from the database without guessing." };
    }
    return { items, selectedBusinessTitle: "", warning: null };
  }

  const brandRow = items.find((item: any) => item.id === employee.linked_business_id)
    || (await supabase.from("user_business_data").select("id, title, content").eq("id", employee.linked_business_id).maybeSingle()).data;

  const selectedBusinessTitle = brandRow?.title || "";
  const logicalBrandId = getLogicalBrandIdFromRow(brandRow);
  const scopedItems = logicalBrandId
    ? items.filter((item: any) => item.id === employee.linked_business_id || getItemLogicalBrandId(item) === logicalBrandId)
    : items.filter((item: any) => item.id === employee.linked_business_id);

  if (strictBusinessScope && scopedItems.length === 0) {
    return { items: [], selectedBusinessTitle, warning: `I checked the selected business${selectedBusinessTitle ? ` (${selectedBusinessTitle})` : ""} but couldn't find any verified brand or product records to answer from.` };
  }

  return { items: scopedItems, selectedBusinessTitle, warning: null };
}

function parseNumberish(value: string): number | null {
  let normalized = value.replace(/[^0-9,.-]/g, "").trim();
  if (!normalized) return null;
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.lastIndexOf(".") > normalized.lastIndexOf(",") ? normalized.replace(/,/g, "") : normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = /,\d{3}(,|$)/.test(normalized) ? normalized.replace(/,/g, "") : normalized.replace(",", ".");
  }
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function extractMoneyValue(rawValue: unknown): { raw: string; amount: number | null; currency: string | null } | null {
  if (typeof rawValue !== "string" && typeof rawValue !== "number") return null;
  const raw = String(rawValue).trim();
  if (!raw) return null;
  const amount = parseNumberish(raw);
  if (amount === null) return null;
  const currencyMatch = raw.match(/(\$|€|£|\bUSD\b|\bEUR\b|\bGBP\b|\bSEK\b|\bKR\b)/i);
  const currency = currencyMatch ? currencyMatch[1].toUpperCase() : null;
  return { raw, amount, currency };
}

function parseTargetAmount(userQuery: string): { amount: number; label: string; metric: string } | null {
  const match = userQuery.match(/([$€£])?\s?(\d[\d.,]*)\s*([km])?\s*(mrr|arr|revenue)\b/i);
  if (!match) return null;
  const baseAmount = parseNumberish(match[2]);
  if (baseAmount === null) return null;
  const multiplier = match[3]?.toLowerCase() === "m" ? 1_000_000 : match[3]?.toLowerCase() === "k" ? 1_000 : 1;
  const prefix = match[1] || "";
  const metric = match[4].toUpperCase();
  return { amount: baseAmount * multiplier, label: `${prefix}${match[2]}${match[3] || ""} ${metric}`.trim(), metric };
}

function escapeTableCell(value: unknown): string {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

function extractVerifiedPricingFacts(items: any[]) {
  const pricedOffers: any[] = [];
  const partialOffers: any[] = [];

  for (const item of items) {
    if (!["product", "brand"].includes(item.data_type)) continue;
    const parsedContent = tryParseJson(item.content);
    if (!parsedContent || typeof parsedContent !== "object") continue;
    const productTitle = String((parsedContent as any).name || item.title || "Untitled").trim();
    const offers = Array.isArray((parsedContent as any).offers) ? (parsedContent as any).offers : [];

    for (const offer of offers) {
      const offerTitle = String(offer?.title || "Offer").trim();
      const price = extractMoneyValue(offer?.salePrice) || extractMoneyValue(offer?.originalPrice) || extractMoneyValue(offer?.price);
      const detailText = [offerTitle, offer?.bundleDetails, offer?.discount].filter(Boolean).join(" ");
      const recurringLikely = /\b(month|monthly|subscription|recurring|per month|\/mo|mo\b)\b/i.test(detailText);

      if (price) {
        pricedOffers.push({ productTitle, offerTitle, priceLabel: price.raw, amount: price.amount, currency: price.currency, discount: String(offer?.discount || "").trim(), bundleDetails: String(offer?.bundleDetails || "").trim(), recurringLikely, sourceTitle: item.title });
      } else if (offerTitle || offer?.discount || offer?.bundleDetails) {
        partialOffers.push({ productTitle, offerTitle, discount: String(offer?.discount || "").trim(), bundleDetails: String(offer?.bundleDetails || "").trim(), sourceTitle: item.title });
      }
    }

    for (const [fieldKey, rawValue] of Object.entries(parsedContent as Record<string, unknown>)) {
      if (!["price", "salePrice", "originalPrice", "monthlyPrice", "annualPrice"].includes(fieldKey)) continue;
      const price = extractMoneyValue(rawValue);
      if (!price) continue;
      pricedOffers.push({ productTitle, offerTitle: fieldKey, priceLabel: price.raw, amount: price.amount, currency: price.currency, discount: "", bundleDetails: "", recurringLikely: /monthly/i.test(fieldKey), sourceTitle: item.title });
    }
  }

  const dedupe = (rows: any[]) => {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = [row.productTitle, row.offerTitle, row.priceLabel || "", row.discount || "", row.bundleDetails || ""].join("|").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return { pricedOffers: dedupe(pricedOffers), partialOffers: dedupe(partialOffers) };
}

function buildVerificationFailureResponse(reason: string, selectedBusinessTitle: string): string {
  return `## I can't verify that from your database\n\n${reason}\n\n### What to do next\n- Link this employee to the correct business or select the right business in chat\n- Add the exact price inside **Product → Offers** for that business\n- Ask again once the verified offer is saved${selectedBusinessTitle ? ` for **${selectedBusinessTitle}**` : ""}`;
}

function buildVerifiedPricingResponse(selectedBusinessTitle: string, pricedOffers: any[], partialOffers: any[]): string {
  if (pricedOffers.length === 0) {
    const partialNote = partialOffers.length > 0 ? `\n\nI did find offer records, but they only contain discounts or labels without an explicit numeric price, so I won't guess the missing amount.` : "";
    return `## I can't verify your exact pricing\n\nI checked the stored brand/product records${selectedBusinessTitle ? ` for **${selectedBusinessTitle}**` : ""}, but there are no explicit offer prices saved that I can trust enough to answer with numbers.${partialNote}\n\n### What to do next\n- Open **Product → Offers** and add the exact price for each offer\n- Or send me the exact plan price you want me to use`;
  }
  const rows = pricedOffers.map((offer) => `| ${escapeTableCell(offer.productTitle)} | ${escapeTableCell(offer.offerTitle)} | ${escapeTableCell(offer.priceLabel)} | ${escapeTableCell(offer.discount || "—")} | ${escapeTableCell(offer.bundleDetails || "—")} |`).join("\n");
  let response = `## Verified pricing${selectedBusinessTitle ? ` for ${selectedBusinessTitle}` : ""}\n\nI checked your saved business records and only listed prices that are explicitly stored in the database.\n\n| Product | Offer | Verified price | Discount | Details |\n| --- | --- | --- | --- | --- |\n${rows}`;
  if (partialOffers.length > 0) {
    const partialRows = partialOffers.slice(0, 8).map((offer) => `| ${escapeTableCell(offer.productTitle)} | ${escapeTableCell(offer.offerTitle)} | ${escapeTableCell(offer.discount || "—")} | ${escapeTableCell(offer.bundleDetails || "—")} |`).join("\n");
    response += `\n\n### Offer records missing an exact price\n| Product | Offer | Discount | Details |\n| --- | --- | --- | --- |\n${partialRows}`;
  }
  response += "\n\n> I only used exact prices stored in your business database. I did not fill in any missing numbers.";
  return response;
}

function buildVerifiedCustomerMathResponse(userQuery: string, selectedBusinessTitle: string, pricedOffers: any[]): string {
  const target = parseTargetAmount(userQuery);
  if (!target) return `## I need the target amount to calculate this\n\nI can only do this from verified pricing, but your message didn't include a target like **10k MRR** or **$20k revenue**.\n\n### What to send\n- The exact target amount\n- Which saved offer or monthly plan I should use`;
  const mentionsMrr = /\bmrr\b/i.test(userQuery);
  const usableOffers = pricedOffers.filter((offer) => offer.amount > 0 && (!mentionsMrr || offer.recurringLikely));
  if (usableOffers.length === 0) return `## I can't verify that calculation yet\n\nI found price-like data${selectedBusinessTitle ? ` for **${selectedBusinessTitle}**` : ""}, but none of it is clearly stored as a recurring monthly plan price, so I won't convert it into MRR math by guessing.\n\n### What I need\n- The exact monthly recurring price for the offer or plan\n- Or save that monthly price in **Product → Offers** and ask again`;
  const rows = usableOffers.map((offer) => { const customersNeeded = Math.ceil(target.amount / offer.amount); return `| ${escapeTableCell(offer.productTitle)} | ${escapeTableCell(offer.offerTitle)} | ${escapeTableCell(offer.priceLabel)} | ${customersNeeded} |`; }).join("\n");
  return `## Verified customer math${selectedBusinessTitle ? ` for ${selectedBusinessTitle}` : ""}\n\nTarget: **${escapeTableCell(target.label)}**\n\nI used only explicit prices saved in your database and calculated **target ÷ verified price**, rounded up to the next whole customer.\n\n| Product | Offer | Verified price used | Customers needed |\n| --- | --- | --- | --- |\n${rows}\n\n> If these are not the correct plans to use, send me the exact saved offer name and I'll calculate from that only.`;
}

export async function buildVerifiedBusinessAnswer(supabase: any, employee: any, userQuery: string): Promise<string | null> {
  const intent = getVerificationIntent(userQuery);
  if (!intent.needsStrictVerification) return null;
  const { items, selectedBusinessTitle, warning } = await loadScopedBusinessItems(supabase, employee, true);
  if (warning) return buildVerificationFailureResponse(warning, selectedBusinessTitle);
  const businessItems = items.filter((item: any) => ["product", "brand"].includes(item.data_type));
  if (businessItems.length === 0) return buildVerificationFailureResponse("I found no brand or product records for the selected business that I can use as a verified source.", selectedBusinessTitle);
  const { pricedOffers, partialOffers } = extractVerifiedPricingFacts(businessItems);
  if (intent.asksPricingLookup) return buildVerifiedPricingResponse(selectedBusinessTitle, pricedOffers, partialOffers);
  if (intent.asksCustomerMath) return buildVerifiedCustomerMathResponse(userQuery, selectedBusinessTitle, pricedOffers);
  return buildVerificationFailureResponse("I couldn't find a verified revenue metric stored in the structured business records, so I won't answer with invented numbers.", selectedBusinessTitle);
}

function buildSearchText(item: any): string {
  return [item.title, item.data_type, item.source, stringifyContent(item.metadata), stringifyContent(item.analyzed_content), stringifyContent(item.content)].filter(Boolean).join("\n").toLowerCase().slice(0, 16000);
}

function extractRelevantSnippet(text: string, keywords: string[], maxChars = 1400): string {
  if (!text) return "";
  const normalized = text.toLowerCase();
  let matchIndex = -1;
  for (const keyword of [...keywords].sort((a, b) => b.length - a.length)) {
    const index = normalized.indexOf(keyword.toLowerCase());
    if (index !== -1) { matchIndex = index; break; }
  }
  if (matchIndex === -1) { const priceIndex = normalized.search(/\$\s?\d|€\s?\d|£\s?\d|\b\d+(?:[.,]\d+)?\s?(?:usd|eur|sek|kr)\b/i); matchIndex = priceIndex; }
  if (matchIndex === -1) return text.slice(0, maxChars);
  const start = Math.max(0, matchIndex - Math.floor(maxChars * 0.25));
  const end = Math.min(text.length, start + maxChars);
  return (start > 0 ? "... " : "") + text.slice(start, end) + (end < text.length ? " ..." : "");
}

function scoreItem(keywords: string[], searchText: string, item: any, userQuery: string): number {
  if (keywords.length === 0) return 0;
  let score = 0;
  for (const kw of keywords) { if (searchText.includes(kw)) score += kw.length > 4 ? 1.25 : 1; }
  if (/\bprice|pricing|cost|plan|offer|subscription|mrr|arr|revenue|customer|customers|deal|deals\b/i.test(userQuery)) {
    if (item.data_type === "product" || item.data_type === "brand") score += 1.5;
    if (/\$\s?\d|€\s?\d|£\s?\d|\b\d+(?:[.,]\d+)?\s?(?:usd|eur|sek|kr)\b/i.test(searchText)) score += 2;
  }
  return score / keywords.length;
}

export async function loadBusinessIdentity(supabase: any, employee: any): Promise<{ identity: string; safetySettings: any | null }> {
  let identity = "";
  let safetySettings: any = null;
  if (!employee.linked_business_id) return { identity, safetySettings };
  const { data: bizData } = await supabase.from("user_business_data").select("title, content, data_type").eq("id", employee.linked_business_id).single();
  if (bizData) {
    identity = `Business: ${bizData.title}`;
    if (bizData.content) {
      try {
        const parsed = JSON.parse(bizData.content);
        if (parsed?.safetySettings) safetySettings = parsed.safetySettings;
        if (parsed.name) identity += ` | Brand: ${parsed.name}`;
        if (parsed.category) identity += ` | Category: ${parsed.category}`;
        if (parsed.agentName) identity += ` | Agent: ${parsed.agentName}`;
      } catch {}
    }
  }
  return { identity, safetySettings };
}

export async function retrieveRelevantContext(supabase: any, employee: any, userQuery: string): Promise<string> {
  const keywords = extractKeywords(userQuery);
  const intent = getVerificationIntent(userQuery);
  const isContentCreation = /\b(slide|pitch|present|report|document|graphic|chart|spreadsheet|analytics|brand|investor|deck|proposal|summary|overview)\b/i.test(userQuery);
  if (keywords.length === 0 && !isContentCreation) return "";
  const { items: initialItems, selectedBusinessTitle, warning } = await loadScopedBusinessItems(supabase, employee, intent.needsStrictVerification);
  if (warning) return `\n\n## Reference Material\n${warning} Ask the user for the missing business-specific source instead of estimating.`;
  if (!initialItems || initialItems.length === 0) return "";
  let scopedItems = intent.needsStrictVerification ? initialItems.filter((item: any) => ["product", "brand"].includes(item.data_type)) : initialItems;
  if (intent.needsStrictVerification && scopedItems.length === 0) return `\n\n## Reference Material\nNo verified brand or product records were found for the selected business${selectedBusinessTitle ? ` (${selectedBusinessTitle})` : ""}. Ask the user for the exact missing price or offer instead of estimating.`;

  const allScored = scopedItems.map((item: any) => {
    const searchText = buildSearchText(item);
    return { ...item, score: keywords.length > 0 ? scoreItem(keywords, searchText, item, userQuery) : (["brand","product","audience"].includes(item.data_type) ? 1 : 0.5), searchText };
  }).sort((a: any, b: any) => b.score - a.score);

  const scored = allScored.filter((i: any) => i.score > 0.1);
  const top = scored.slice(0, 5);
  const requiredTypes = ["brand", "product", "audience"];
  for (const dt of requiredTypes) {
    if (!top.some((i: any) => i.data_type === dt)) {
      const candidate = allScored.find((i: any) => i.data_type === dt && !top.includes(i));
      if (candidate) { if (top.length >= 5) top.pop(); top.push(candidate); }
    }
  }

  if (top.length === 0) return "";
  let context = `\n\n## Reference Material (${employee.linked_business_id ? "verified records from the selected business database" : "from your business database"})\n`;
  for (const item of top) {
    context += `\n### ${item.title} (${item.data_type})\n`;
    if (item.source) context += `Source: ${item.source}\n`;
    const text = stringifyContent(item.analyzed_content || item.content || "");
    const isDnaType = ["brand", "product", "audience"].includes(item.data_type);
    const snippetLimit = (isContentCreation && isDnaType) ? 4000 : 1400;
    const excerpt = (isContentCreation && isDnaType && keywords.length === 0) ? text.slice(0, snippetLimit) : extractRelevantSnippet(text, keywords, snippetLimit);
    context += excerpt + "\n";
  }
  return context;
}
