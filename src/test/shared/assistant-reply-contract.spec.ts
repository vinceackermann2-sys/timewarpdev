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
});
