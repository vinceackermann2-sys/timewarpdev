import { describe, it, expect } from "vitest";
import { buildConnectorSearchIntentProfile } from "../../../supabase/functions/_shared/connector-search-intent.ts";

describe("buildConnectorSearchIntentProfile", () => {
  it("returns default for generic text", () => {
    const p = buildConnectorSearchIntentProfile("What is our positioning?");
    expect(p.id).toBe("default");
    expect(p.augmentedQuery).toBe("What is our positioning?");
    expect(p.omitZoom).toBe(false);
  });

  it("scheduling_focus when calendar/meeting intent without project delay", () => {
    const p = buildConnectorSearchIntentProfile("What meeting do I have tomorrow?");
    expect(p.id).toBe("scheduling_focus");
    expect(p.augmentedQuery).toContain("tomorrow");
    expect(p.omitZoom).toBe(false);
  });

  it("project_execution augments query and omits Zoom without zoom keyword", () => {
    const p = buildConnectorSearchIntentProfile("Why is the launch project delayed?");
    expect(p.id).toBe("project_execution");
    expect(p.augmentedQuery).toMatch(/delay/i);
    expect(p.augmentedQuery).toMatch(/status timeline blocker/i);
    expect(p.topicHint).toBe("project execution signals");
    expect(p.omitZoom).toBe(true);
  });

  it("project_execution keeps Zoom when user says zoom", () => {
    const p = buildConnectorSearchIntentProfile("Project Alpha is blocked — check Zoom too");
    expect(p.id).toBe("project_execution");
    expect(p.omitZoom).toBe(false);
  });

  it("scheduling wins when both scheduling and project signals (schedulingStrong && !projectStrong)", () => {
    const p = buildConnectorSearchIntentProfile(
      "When is my next meeting and what is on the calendar today?",
    );
    expect(p.id).toBe("scheduling_focus");
  });
});
