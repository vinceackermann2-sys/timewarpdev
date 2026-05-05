/**
 * Structured sources for SSE + Sources panel (conclusion vs raw data).
 */

export type PipelineSourceEntry = {
  type: "internal" | "external" | "connector";
  label: string;
  provider?: string;
  url?: string;
  snippet?: string;
};

export type SourceRegistryPayload = {
  conclusionSources: PipelineSourceEntry[];
  dataSources: PipelineSourceEntry[];
};

export function buildSourceRegistryPayload(params: {
  searchedProviders: string[];
  queryTopic: string;
  webSnapshotRan: boolean;
  dnaRouterRan: boolean;
  performanceRan: boolean;
  dashboardRan: boolean;
  skillsApplied?: string[];
}): SourceRegistryPayload {
  // Single deduped list — only surface tiers/blocks that ACTUALLY contributed
  // to forming the reply this turn. No placeholder/topic-only entries.
  const sources: PipelineSourceEntry[] = [];

  for (const p of params.searchedProviders || []) {
    sources.push({
      type: "connector",
      label: `Live ${p.replace(/_/g, " ")}`,
      provider: p,
      snippet: params.queryTopic ? `Query focus: ${params.queryTopic}` : undefined,
    });
  }

  if (params.dnaRouterRan) {
    sources.push({ type: "internal", label: "Business DNA" });
  }

  if (params.performanceRan) {
    sources.push({ type: "internal", label: "KPI / performance windows" });
  }

  if (params.dashboardRan) {
    sources.push({ type: "internal", label: "Dashboard snapshot" });
  }

  if (params.webSnapshotRan) {
    sources.push({ type: "external", label: "Public web snapshot" });
  }

  const skills = (params.skillsApplied || []).filter(Boolean);
  if (skills.length > 0) {
    sources.push({
      type: "internal",
      label: `Skill playbook${skills.length > 1 ? "s" : ""}: ${skills.join(", ")}`,
    });
  }

  // Keep both keys in payload for back-compat with the SSE client; both point
  // to the same deduped list so the UI never shows a duplicate.
  return { conclusionSources: sources, dataSources: sources };
}
