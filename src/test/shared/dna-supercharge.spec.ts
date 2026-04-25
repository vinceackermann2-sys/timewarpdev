import { describe, expect, it } from "vitest";
import { extractPeopleSignalsFromRows, getFieldSourceMode, parseMarketEvidenceItems } from "@/lib/dnaSupercharge";

describe("dnaSupercharge helpers", () => {
  it("routes field source policy for market sizing", () => {
    expect(getFieldSourceMode("market.definition.tam")).toBe("web_evidence_required");
    expect(getFieldSourceMode("market.definition.sam")).toBe("web_evidence_required");
    expect(getFieldSourceMode("market.definition.som")).toBe("web_evidence_required");
  });

  it("routes field source policy for people structure", () => {
    expect(getFieldSourceMode("people.org_chart")).toBe("integration_only");
    expect(getFieldSourceMode("people.leadership")).toBe("integration_only");
  });

  it("routes roadmap and growth fields to internal_or_competitor_cited", () => {
    expect(getFieldSourceMode("product.roadmap")).toBe("internal_or_competitor_cited");
    expect(getFieldSourceMode("growth.experiments")).toBe("internal_or_competitor_cited");
    expect(getFieldSourceMode("strategy.bets")).toBe("internal_or_competitor_cited");
  });

  it("parses market evidence safely", () => {
    const parsed = parseMarketEvidenceItems([
      { url: "https://example.com/a", title: "A", excerpt: " Market growth 2026 " },
      { url: "", title: "B", excerpt: "missing url" },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].url).toContain("example.com");
  });

  it("extracts integration people signals from rows", () => {
    const text = extractPeopleSignalsFromRows([
      { data_type: "contact", title: "Jane Doe", content: "Title: VP Sales" },
      { data_type: "message", title: "Slack #sales", content: "@jane closed won deal" },
    ]);
    expect(text).toContain("Contacts");
    expect(text).toContain("Jane Doe");
    expect(text).toContain("Messages");
  });
});
