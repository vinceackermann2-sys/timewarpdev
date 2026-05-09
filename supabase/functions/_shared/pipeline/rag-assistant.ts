/** Brand-scoped RAG snippets for the main assistant (no employee row). */
import { STOPWORDS } from "../run-employee/connections.ts";

function extractKeywords(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

function scoreItem(keywords: string[], title: string, contentSnippet: string): number {
  if (keywords.length === 0) return 0;
  const haystack = (title + " " + contentSnippet).toLowerCase();
  let matches = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw)) matches++;
  }
  return matches / keywords.length;
}

export async function retrieveRelevantContextForAssistant(
  supabase: any,
  userId: string,
  workspaceId: string | undefined,
  userQuery: string | undefined,
  brandId: string | undefined,
  browserMode?: boolean,
): Promise<string> {
  const keywords = extractKeywords(userQuery || "");
  const isContentCreation =
    /\b(slide|pitch|present|report|document|graphic|chart|spreadsheet|analytics|brand|investor|deck|proposal|summary|overview)\b/i.test(
      userQuery || "",
    );
  if (keywords.length === 0 && !browserMode && !isContentCreation) return "";

  let brandLogicalId: string | null = null;
  if (brandId) {
    const { data: brandRow } = await supabase.from("user_business_data").select("content").eq("id", brandId).single();
    if (brandRow?.content) {
      try {
        brandLogicalId = JSON.parse(brandRow.content)?.id || null;
      } catch { /* noop */ }
    }
  }

  let query = supabase.from("user_business_data").select("id, title, content, analyzed_content, data_type, source");
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  else query = query.eq("user_id", userId);

  const { data: items } = await query.limit(200);
  if (!items || items.length === 0) return "";

  let filtered = items;
  if (brandId || brandLogicalId) {
    filtered = items.filter((item: any) => {
      if (item.id === brandId) return true;
      if (brandLogicalId && item.content) {
        try {
          const parsed = JSON.parse(item.content);
          if (parsed.brandId === brandLogicalId) return true;
        } catch { /* noop */ }
      }
      if (item.content?.includes(brandLogicalId || "")) return true;
      return false;
    });
  }

  const scoreThreshold = browserMode ? 0.0 : 0.1;
  const maxResults = browserMode ? 8 : 5;
  const snippetLen = browserMode ? 800 : 500;

  const allScored = filtered.map((item: any) => {
    const snippet = (item.analyzed_content || item.content || "").slice(0, 300);
    return {
      ...item,
      score: keywords.length > 0
        ? scoreItem(keywords, item.title || "", snippet)
        : (["brand", "product", "audience"].includes(item.data_type) ? 1 : 0.05),
    };
  }).sort((a: any, b: any) => b.score - a.score);

  const top = allScored.filter((i: any) => i.score >= scoreThreshold).slice(0, maxResults);

  const requiredTypes = ["brand", "product", "audience"];
  for (const dt of requiredTypes) {
    if (!top.some((i: any) => i.data_type === dt)) {
      const candidate = allScored.find((i: any) => i.data_type === dt && !top.includes(i));
      if (candidate) {
        if (top.length >= maxResults) top.pop();
        top.push(candidate);
      }
    }
  }

  if (top.length === 0) return "";

  let context =
    "\n\n## Reference Material (from your business database)\nUse this knowledge to inform HOW you execute the task.\n";
  for (const item of top) {
    context += `\n### ${item.title} (${item.data_type})\n`;
    const text = item.analyzed_content || item.content || "";
    context += text.slice(0, snippetLen) + "\n";
  }
  return context;
}

export async function loadAssistantBrandIdentity(supabase: any, userId: string, brandId?: string): Promise<string> {
  if (!brandId) return "";
  const { data: brandRow } = await supabase.from("user_business_data").select("title, content").eq("id", brandId).single();
  if (!brandRow) return "";
  let identity = `Business: ${brandRow.title}`;
  if (brandRow.content) {
    try {
      const parsed = JSON.parse(brandRow.content);
      if (parsed.name) identity += ` | Brand: ${parsed.name}`;
      if (parsed.category) identity += ` | Category: ${parsed.category}`;
      if (parsed.agentName) identity += ` | Agent: ${parsed.agentName}`;
    } catch { /* noop */ }
  }
  return identity;
}
