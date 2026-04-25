/**
 * Windowed objective outcomes for KPI evidence packs and outcome scoring.
 */

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function normalizeSigned(numerator: number, denominator: number, dampener = 4): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  const denom = Math.max(denominator + dampener, 1);
  return clamp(numerator / denom, -1, 1);
}

type OutcomeRow = {
  delta_value: number | null;
  current_value: number | null;
  target_value: number | null;
  metric_name: string | null;
  created_at: string;
};

function summarizeSubset(subset: OutcomeRow[]) {
  const deltas = subset.map((r) => Number(r.delta_value)).filter((v) => Number.isFinite(v));
  const progress = subset
    .map((r) => {
      const cur = Number(r.current_value);
      const target = Number(r.target_value);
      if (!Number.isFinite(cur) || !Number.isFinite(target) || Math.abs(target) < 0.0001) return null;
      return clamp(cur / target, -2, 2);
    })
    .filter((v): v is number => v !== null);

  const byMetric = new Map<string, { deltas: number[]; progress: number[] }>();
  for (const r of subset) {
    const name = String(r.metric_name || "unknown").trim() || "unknown";
    if (!byMetric.has(name)) byMetric.set(name, { deltas: [], progress: [] });
    const bucket = byMetric.get(name)!;
    const d = Number(r.delta_value);
    if (Number.isFinite(d)) bucket.deltas.push(d);
    const cur = Number(r.current_value);
    const target = Number(r.target_value);
    if (Number.isFinite(cur) && Number.isFinite(target) && Math.abs(target) > 0.0001) {
      bucket.progress.push(clamp(cur / target, -2, 2));
    }
  }

  return {
    deltaAvg: average(deltas),
    progressAvg: average(progress),
    count: subset.length,
    byMetric,
  };
}

async function loadOutcomeRows(supabase: any, businessId: string, days: number): Promise<OutcomeRow[]> {
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;
  const previousStart = new Date(now - (windowMs * 2)).toISOString();
  const nowIso = new Date(now).toISOString();

  const { data: rows } = await supabase
    .from("dashboard_objective_outcomes")
    .select("delta_value, current_value, target_value, metric_name, created_at")
    .eq("business_id", businessId)
    .gte("created_at", previousStart)
    .lt("created_at", nowIso)
    .limit(400);

  return (rows || []) as OutcomeRow[];
}

/** Same scoring semantics as legacy fetchObjectiveSignal in business-brain. */
export async function fetchObjectiveSignal(
  supabase: any,
  businessId: string,
  days: number,
): Promise<{ score: number; count: number }> {
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;
  const currentStart = new Date(now - windowMs).toISOString();

  const allRows = await loadOutcomeRows(supabase, businessId, days);
  const currentRows = allRows.filter((r) => String(r.created_at) >= currentStart);
  const previousRows = allRows.filter((r) => String(r.created_at) < currentStart);

  const curr = summarizeSubset(currentRows);
  const prev = summarizeSubset(previousRows);
  const deltaShift = curr.deltaAvg - prev.deltaAvg;
  const progressShift = curr.progressAvg - prev.progressAvg;
  const combined = normalizeSigned((deltaShift * 0.7) + (progressShift * 0.3), 1.2, 0.8);

  return { score: combined, count: curr.count + prev.count };
}

function topMetricShifts(
  curr: ReturnType<typeof summarizeSubset>,
  prev: ReturnType<typeof summarizeSubset>,
  max = 5,
): { improving: string[]; declining: string[] } {
  const names = new Set<string>([...curr.byMetric.keys(), ...prev.byMetric.keys()]);
  const scored: { name: string; shift: number }[] = [];
  for (const name of names) {
    const c = curr.byMetric.get(name) || { deltas: [], progress: [] };
    const p = prev.byMetric.get(name) || { deltas: [], progress: [] };
    const cDelta = average(c.deltas.length ? c.deltas : [0]);
    const pDelta = average(p.deltas.length ? p.deltas : [0]);
    const cProg = average(c.progress.length ? c.progress : [0]);
    const pProg = average(p.progress.length ? p.progress : [0]);
    const shift = (cDelta - pDelta) * 0.65 + (cProg - pProg) * 0.35;
    if (Number.isFinite(shift) && (c.deltas.length + p.deltas.length + c.progress.length + p.progress.length) > 0) {
      scored.push({ name, shift });
    }
  }
  scored.sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift));
  const improving = scored.filter((s) => s.shift > 0.02).sort((a, b) => b.shift - a.shift).map((s) => s.name).slice(0, max);
  const declining = scored.filter((s) => s.shift < -0.02).sort((a, b) => a.shift - b.shift).map((s) => s.name).slice(0, max);
  return { improving, declining };
}

/**
 * Markdown block for LLM context: current vs prior window KPI summary + sparse-data warnings.
 */
export async function buildPerformanceEvidenceMarkdown(
  supabase: any,
  businessId: string,
  days = 30,
): Promise<string> {
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;
  const currentStart = new Date(now - windowMs).toISOString();

  const allRows = await loadOutcomeRows(supabase, businessId, days);
  const currentRows = allRows.filter((r) => String(r.created_at) >= currentStart);
  const previousRows = allRows.filter((r) => String(r.created_at) < currentStart);

  const curr = summarizeSubset(currentRows);
  const prev = summarizeSubset(previousRows);
  const { improving, declining } = topMetricShifts(curr, prev);

  const lines: string[] = [];
  lines.push(`Windows: current = last ${days}d (${currentRows.length} samples), prior = previous ${days}d (${previousRows.length} samples).`);

  if (curr.count + prev.count === 0) {
    lines.push("**Sparse:** no objective outcome rows in the last two windows — treat internal KPI path as empty.");
    return lines.join("\n");
  }

  if (curr.count < 3 || previousRows.length < 3) {
    lines.push("**Sparse:** low sample count — use directional language only; prefer hypothesis labels for forward bets.");
  }

  lines.push(
    `Blended averages — current window: delta_avg=${curr.deltaAvg.toFixed(4)}, progress_ratio_avg=${curr.progressAvg.toFixed(4)}; prior: delta_avg=${prev.deltaAvg.toFixed(4)}, progress_ratio_avg=${prev.progressAvg.toFixed(4)}.`,
  );
  const netShift = (curr.deltaAvg - prev.deltaAvg) * 0.7 + (curr.progressAvg - prev.progressAvg) * 0.3;
  lines.push(`Net momentum (heuristic): ${netShift >= 0 ? "+" : ""}${netShift.toFixed(4)} (positive suggests improving vs prior window).`);

  if (improving.length) lines.push(`Metrics relatively up vs prior: ${improving.join(", ")}.`);
  if (declining.length) lines.push(`Metrics relatively down vs prior: ${declining.join(", ")}.`);

  return lines.join("\n");
}
