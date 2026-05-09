import { describe, expect, it } from "vitest";
import { buildPerformanceEvidenceMarkdown } from "../../../supabase/functions/_shared/performance-evidence.ts";

function mockSupabase(rows: unknown[]) {
  return {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: string) => ({
          gte: (_c: string, _v: string) => ({
            lt: (_c2: string, _v2: string) => ({
              limit: async (_n: number) => ({ data: rows }),
            }),
          }),
        }),
      }),
    }),
  };
}

describe("buildPerformanceEvidenceMarkdown", () => {
  it("reports sparse state when no rows", async () => {
    const md = await buildPerformanceEvidenceMarkdown(mockSupabase([]) as any, "biz-1", 30);
    expect(md).toContain("Sparse");
    expect(md).toContain("no objective outcome rows");
  });

  it("summarizes current vs prior windows when samples exist", async () => {
    const now = new Date();
    const cur = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const prev = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const rows = [
      { delta_value: 1, current_value: 10, target_value: 100, metric_name: "m1", created_at: cur },
      { delta_value: 2, current_value: 20, target_value: 100, metric_name: "m1", created_at: cur },
      { delta_value: 0.5, current_value: 5, target_value: 100, metric_name: "m1", created_at: prev },
      { delta_value: 0.5, current_value: 5, target_value: 100, metric_name: "m1", created_at: prev },
      { delta_value: 0.5, current_value: 5, target_value: 100, metric_name: "m1", created_at: prev },
    ];
    const md = await buildPerformanceEvidenceMarkdown(mockSupabase(rows) as any, "biz-1", 30);
    expect(md).toContain("current = last 30d");
    expect(md).toContain("Blended averages");
    expect(md).toContain("Net momentum");
  });
});
