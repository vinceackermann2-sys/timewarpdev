import { describe, it, expect } from "vitest";
import { classifyAssistantReplyContract } from "../../../supabase/functions/_shared/assistant-reply-contract.ts";

describe("classifyAssistantReplyContract", () => {
  it("returns direct for short or non-lookup text", () => {
    expect(classifyAssistantReplyContract("Hi")).toBe("direct");
    expect(classifyAssistantReplyContract("How should we grow?")).toBe("direct");
  });

  it("returns live_lookup when connector triggers match", () => {
    expect(classifyAssistantReplyContract("Find my recent emails about pricing")).toBe("live_lookup");
    expect(classifyAssistantReplyContract("What is on my calendar tomorrow?")).toBe("live_lookup");
  });

  it("returns strategic_plan for complex strategic asks", () => {
    expect(
      classifyAssistantReplyContract("How do we grow revenue in the next 90 days with a clear plan and KPI milestones?"),
    ).toBe("strategic_plan");
    expect(
      classifyAssistantReplyContract("Create an advanced plan mode first principles plan to scale our GTM."),
    ).toBe("strategic_plan");
  });

  it("respects explicit opt-out for quick answers", () => {
    expect(classifyAssistantReplyContract("No plan, quick answer: what is my branding?")).toBe("direct");
  });
});
