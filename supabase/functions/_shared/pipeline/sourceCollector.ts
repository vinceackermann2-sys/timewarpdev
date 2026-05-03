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
}): SourceRegistryPayload {
  const dataSources: PipelineSourceEntry[] = [];
  const conclusionSources: PipelineSourceEntry[] = [];

  for (const p of params.searchedProviders || []) {
    dataSources.push({
      type: "connector",
      label: `Live ${p.replace(/_/g, " ")}`,
      provider: p,
      snippet: params.queryTopic ? `Query focus: ${params.queryTopic}` : undefined,
    });
  }

  if (params.dnaRouterRan) {
    dataSources.push({ type: "internal", label: "Business DNA (routed pillars)" });
    conclusionSources.push({ type: "internal", label: "DNA pillars used for this reply" });
  }

  if (params.performanceRan) {
    dataSources.push({ type: "internal", label: "KPI / performance windows" });
    conclusionSources.push({ type: "internal", label: "Historical performance evidence" });
  }

  if (params.dashboardRan) {
    dataSources.push({ type: "internal", label: "CEO dashboard snapshot" });
    conclusionSources.push({ type: "internal", label: "Dashboard cards (when matched)" });
  }

  if (params.webSnapshotRan) {
    dataSources.push({ type: "external", label: "Web research (Firecrawl or fallback)" });
    conclusionSources.push({ type: "external", label: "Public web snapshot" });
  }

  if (params.queryTopic && !params.searchedProviders?.length) {
    dataSources.push({
      type: "connector",
      label: "Connector query topic",
      snippet: params.queryTopic,
    });
  }

  return { conclusionSources, dataSources };
}
