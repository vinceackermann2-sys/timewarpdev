import { describe, it, expect } from "vitest";
import { sanitizeAssistantAgainstLiveContext } from "../../../supabase/functions/_shared/live-response-guard.ts";

const liveBlock = (body: string) =>
  `${"x".repeat(90)}\n\n### Live Data from Gmail\n${body}\n`;

describe("sanitizeAssistantAgainstLiveContext", () => {
  it("no-ops when connection context is not a live hit", () => {
    const text = "See **Fake Doc** in Drive.";
    expect(sanitizeAssistantAgainstLiveContext(text, "")).toBe(text);
    expect(sanitizeAssistantAgainstLiveContext(text, "short")).toBe(text);
  });

  it("no-ops on explicit no-match shells", () => {
    const ctx = liveBlock("No matching live results for your request.");
    const text = "**Anything** in email";
    expect(sanitizeAssistantAgainstLiveContext(text, ctx)).toBe(text);
  });

  it("when allowlist is empty but live rows exist, still flags suspicious bold on live-grounded lines", () => {
    const ctx = liveBlock("Some text without SUBJECT or bold titles.");
    const text = "Email line with **Unknown**";
    const out = sanitizeAssistantAgainstLiveContext(text, ctx);
    expect(out).toContain("not found in live connector");
    expect(out).toContain("Could not extract stable title tokens");
  });

  it("keeps bold titles that appear in SUBJECT allowlist", () => {
    const ctx = liveBlock('SUBJECT: "Q4 Plan"\n- thread');
    const text = "From Gmail: **Q4 Plan** looks important.";
    expect(sanitizeAssistantAgainstLiveContext(text, ctx)).toBe(text);
  });

  it("flags invented bold on live-grounded lines", () => {
    const ctx = liveBlock('SUBJECT: "Real Subject"\n');
    const text = "In your inbox the file **Totally Made Up Title** matters.";
    const out = sanitizeAssistantAgainstLiveContext(text, ctx);
    expect(out).toContain("not found in live connector");
    expect(out).toContain("Totally Made Up Title");
  });

  it("does not touch bold on non-tool lines", () => {
    const ctx = liveBlock('SUBJECT: "Only This"\n');
    const text = "Strategically **Bold Idea** for go-to-market clarity.";
    expect(sanitizeAssistantAgainstLiveContext(text, ctx)).toBe(text);
  });
});
