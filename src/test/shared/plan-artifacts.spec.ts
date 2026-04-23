import { describe, it, expect } from "vitest";
import { extractPlanArtifact } from "../../lib/agentChat/planArtifacts";

describe("extractPlanArtifact", () => {
  it("extracts tagged plan artifact and cleans content", () => {
    const input = `Short intro\n\n[PLAN_ARTIFACT]
## Plan Overview
Test plan

## Evidence Base
- Business DNA: positioning
- Dashboard: conversion down 12%

## Confidence & Data Gaps
Confidence: Medium
[/PLAN_ARTIFACT]\n\n[SUGGEST:A|B|C]`;

    const parsed = extractPlanArtifact(input);
    expect(parsed.artifact).not.toBeNull();
    expect(parsed.artifact?.confidence).toBe("medium");
    expect(parsed.artifact?.evidenceSources.length).toBeGreaterThan(0);
    expect(parsed.content).toContain("Short intro");
    expect(parsed.content).not.toContain("[PLAN_ARTIFACT]");
  });

  it("returns null artifact when no tag exists", () => {
    const parsed = extractPlanArtifact("Plain answer only");
    expect(parsed.artifact).toBeNull();
    expect(parsed.content).toBe("Plain answer only");
  });
});

