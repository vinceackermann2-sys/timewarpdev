import { describe, expect, it } from "vitest";
import { buildAssistantGroundingBlock } from "../../../supabase/functions/_shared/assistant-grounding.ts";

describe("buildAssistantGroundingBlock", () => {
  it("includes strategic plan instructions for strategic_plan contract", () => {
    const out = buildAssistantGroundingBlock("strategic_plan");
    expect(out).toContain("Advanced strategic plan mode");
    expect(out).toContain("[PLAN_ARTIFACT]");
    expect(out).toContain("Never fabricate numbers");
  });
});

