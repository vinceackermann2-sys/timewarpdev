/**
 * Structured sources for SSE + Sources panel.
 *
 * We distinguish two layers:
 *  - **conclusionSources**: evidence that actually shaped the reply (contributed
 *    rows / blocks that the model can cite). Connectors only land here when
 *    they returned data.
 *  - **dataSources**: every backend block we *consulted* this turn (including
 *    connectors that were searched but came back empty). Useful for the
 *    "looked here too" detail row, but not the headline attribution.
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
  /** Providers whose API calls actually returned rows that fed connectionContext. */
  contributingProviders?: string[];
  queryTopic: string;
  webSnapshotRan: boolean;
  dnaRouterRan: boolean;
  performanceRan: boolean;
  dashboardRan: boolean;
  skillsApplied?: string[];
}): SourceRegistryPayload {
  const conclusion: PipelineSourceEntry[] = [];
  const data: PipelineSourceEntry[] = [];

  const contributing = new Set((params.contributingProviders || []).filter(Boolean));

  for (const p of params.searchedProviders || []) {
    const entry: PipelineSourceEntry = {
      type: "connector",
      label: `Live ${p.replace(/_/g, " ")}`,
      provider: p,
      snippet: params.queryTopic ? `Query focus: ${params.queryTopic}` : undefined,
    };
    data.push(entry);
    if (contributing.has(p)) conclusion.push(entry);
  }

  if (params.dnaRouterRan) {
    const e: PipelineSourceEntry = { type: "internal", label: "Business DNA" };
    conclusion.push(e); data.push(e);
  }
  if (params.performanceRan) {
    const e: PipelineSourceEntry = { type: "internal", label: "KPI / performance windows" };
    conclusion.push(e); data.push(e);
  }
  if (params.dashboardRan) {
    const e: PipelineSourceEntry = { type: "internal", label: "Dashboard snapshot" };
    conclusion.push(e); data.push(e);
  }
  if (params.webSnapshotRan) {
    const e: PipelineSourceEntry = { type: "external", label: "Public web snapshot" };
    conclusion.push(e); data.push(e);
  }
  const skills = (params.skillsApplied || []).filter(Boolean);
  if (skills.length > 0) {
    const e: PipelineSourceEntry = {
      type: "internal",
      label: `Skill playbook${skills.length > 1 ? "s" : ""}: ${skills.join(", ")}`,
    };
    conclusion.push(e); data.push(e);
  }

  return { conclusionSources: conclusion, dataSources: data };
}
