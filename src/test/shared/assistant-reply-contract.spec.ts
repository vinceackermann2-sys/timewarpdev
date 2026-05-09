import { describe, it, expect } from "vitest";
import {
  classifyAssistantReplyContract,
  resolveAssistantReplyContract,
} from "../../../supabase/functions/_shared/assistant-reply-contract.ts";

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

  it("returns strategic_plan for short explicit growth / plan asks", () => {
    expect(classifyAssistantReplyContract("make a growth plan")).toBe("strategic_plan");
    expect(classifyAssistantReplyContract("Build a marketing plan for Q1")).toBe("strategic_plan");
  });
});

describe("resolveAssistantReplyContract", () => {
  it("uses the original user request for reply shape after a SUGGEST follow-up", () => {
    const history = [
      { role: "user", content: "Make a growth plan for our SaaS" },
      {
        role: "assistant",
        content: "Quick check first.\n[SUGGEST:What timeline?::90 days|6 months|12 months]",
      },
      { role: "user", content: "90 days" },
    ];
    expect(resolveAssistantReplyContract("90 days", history)).toBe("strategic_plan");
  });
});
