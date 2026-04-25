import { describe, expect, it } from "vitest";
import { detectDashboardIntent } from "../../../supabase/functions/_shared/dashboard-chat-context.ts";

describe("detectDashboardIntent", () => {
  it("matches briefing asks", () => {
    const r = detectDashboardIntent("What's on my briefing today?");
    expect(r.matched).toBe(true);
    expect(r.tabs).toContain("Briefing");
  });

  it("matches broad dashboard", () => {
    const r = detectDashboardIntent("Show me my dashboard");
    expect(r.matched).toBe(true);
    expect(r.tabs.length).toBeGreaterThanOrEqual(4);
  });

  it("matches todos", () => {
    const r = detectDashboardIntent("List my to-dos");
    expect(r.matched).toBe(true);
    expect(r.tabs).toContain("To-Dos");
  });

  it("ignores unrelated small talk", () => {
    const r = detectDashboardIntent("Hello there");
    expect(r.matched).toBe(false);
  });
});
