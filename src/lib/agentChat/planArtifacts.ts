export interface PlanArtifact {
  title: string;
  markdown: string;
  evidenceSources: string[];
  confidence: "high" | "medium" | "low" | "unknown";
}

const PLAN_TAG_RE = /\[PLAN_ARTIFACT\]\s*([\s\S]*?)\s*\[\/PLAN_ARTIFACT\]/i;

function detectConfidence(markdown: string): PlanArtifact["confidence"] {
  const text = markdown.toLowerCase();
  if (/\bconfidence\b[\s\S]{0,80}\bhigh\b/.test(text)) return "high";
  if (/\bconfidence\b[\s\S]{0,80}\bmedium\b/.test(text)) return "medium";
  if (/\bconfidence\b[\s\S]{0,80}\blow\b/.test(text)) return "low";
  return "unknown";
}

function parseEvidenceSources(markdown: string): string[] {
  const sectionMatch = markdown.match(/##\s*Evidence Base[\s\S]*?(?=\n##\s|\s*$)/i);
  if (!sectionMatch) return [];
  return sectionMatch[0]
    .split("\n")
    .map((line) => line.replace(/^[\s*-]+/, "").trim())
    .filter((line) => line.length > 2 && !/^##\s*/.test(line))
    .slice(0, 8);
}

export function extractPlanArtifact(text: string): { content: string; artifact: PlanArtifact | null } {
  const match = text.match(PLAN_TAG_RE);
  if (!match) return { content: text, artifact: null };
  const markdown = match[1].trim();
  const artifact: PlanArtifact = {
    title: "Strategic Plan",
    markdown,
    evidenceSources: parseEvidenceSources(markdown),
    confidence: detectConfidence(markdown),
  };
  const content = text.replace(PLAN_TAG_RE, "").trim();
  return { content, artifact };
}

