import { describe, expect, it } from "vitest";
import { compareWindowAverages, normalizeSigned, scoreIntegrationSignalText } from "@/lib/learning/outcomeScoring";

describe("outcomeScoring", () => {
  it("normalizes signed score with dampener", () => {
    expect(normalizeSigned(6, 6, 3)).toBeGreaterThan(0.6);
    expect(normalizeSigned(-4, 4, 3)).toBeLessThan(-0.4);
  });

  it("compares current and previous window averages", () => {
    const delta = compareWindowAverages([10, 14, 16], [8, 9, 9]);
    expect(delta).toBeGreaterThan(4);
  });

  it("extracts positive integration signals", () => {
    const scored = scoreIntegrationSignalText("Customer approved renewal and said great work. Deal closed won this week.");
    expect(scored.positiveHits).toBeGreaterThan(0);
    expect(scored.score).toBeGreaterThan(0);
    expect(scored.tags).toContain("positive-signal");
  });

  it("extracts negative integration signals", () => {
    const scored = scoreIntegrationSignalText("Client complaint escalated. Renewal at churn risk and project delayed.");
    expect(scored.negativeHits).toBeGreaterThan(0);
    expect(scored.score).toBeLessThan(0);
    expect(scored.tags).toContain("negative-signal");
  });

  it("stays near neutral on sparse text", () => {
    const scored = scoreIntegrationSignalText("quick sync update");
    expect(scored.score).toBeGreaterThanOrEqual(-0.1);
    expect(scored.score).toBeLessThanOrEqual(0.1);
  });
});
