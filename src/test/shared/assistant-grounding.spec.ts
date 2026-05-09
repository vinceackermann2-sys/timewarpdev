import { describe, expect, it } from "vitest";
import { buildAssistantGroundingBlock } from "../../../supabase/functions/_shared/assistant-grounding.ts";

describe("buildAssistantGroundingBlock", () => {
  it("includes strategic plan instructions for strategic_plan contract", () => {
    const out = buildAssistantGroundingBlock("strategic_plan");
    expect(out).toContain("Advanced strategic plan mode");
    expect(out).toContain("[PLAN_ARTIFACT]");
    expect(out).toContain("Never fabricate numbers");
  });

  it("includes data-backed decision triad for direct contract", () => {
    const out = buildAssistantGroundingBlock("direct");
    expect(out).toContain("Data-backed decisions");
    expect(out).toContain("Path 1");
    expect(out).toContain("Path 2");
    expect(out).toContain("Path 3");
  });

  it("includes user-facing self-identity rules for all contracts", () => {
    for (const contract of ["direct", "live_lookup", "strategic_plan"] as const) {
      const out = buildAssistantGroundingBlock(contract);
      expect(out).toContain("How you refer to yourself");
      expect(out).toContain("only as **an AI**");
    }
  });
});

