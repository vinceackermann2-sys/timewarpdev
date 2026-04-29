// Skill router for the assistant chat intelligence model v2.
// Loads all 70 skill .md files at module init, parses YAML frontmatter,
// builds a trigger-keyword index, and exposes matchSkill() for prompt assembly.

interface SkillFrontmatter {
  name: string;
  pillars?: string[];
  surface?: string;
  trigger?: string[];
}

export interface Skill {
  slug: string;
  name: string;
  pillars: string[];
  surface: string;
  triggers: string[];
  body: string; // full markdown after frontmatter
  raw: string; // entire file
}

// --- Frontmatter parser (minimal YAML for our schema) ---
function parseFrontmatter(raw: string): { fm: SkillFrontmatter; body: string } {
  if (!raw.startsWith("---")) return { fm: { name: "" }, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: { name: "" }, body: raw };
  const fmText = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\s*\n/, "");
  const fm: any = {};
  for (const line of fmText.split("\n")) {
    const m = line.match(/^([a-zA-Z_]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim();
    if (key === "pillars" || key === "trigger") {
      fm[key] = val.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    } else {
      fm[key] = val;
    }
  }
  return { fm: fm as SkillFrontmatter, body };
}

// --- Load every skill at module init ---
const SKILL_FILES = [
  "ab-test-setup","ad-creative","agents","ai-seo","analytics-tracking","aso-audit",
  "audience-awareness-pyramid","briefing","ceo-advisor","cfo-advisor","churn-prevention",
  "cmo-advisor","cold-email-writing","community-marketing","competitor-alternative-pages",
  "competitor-profiling","content-strategy","copy-editing","copywriting","cto-advisor",
  "customer-research","directory-submissions","email-sequence-design","employees",
  "external-research","form-cro","free-tool-strategy","graphics","growth-strategy-roadmaps",
  "image-creation","internal-data","launch-strategy","lead-magnets","marketing-ideas-saas",
  "marketing-psychology","memory-feedback","nueeph-framework","objectives","onboarding-cro",
  "page-cro","paid-ads","paywall-upgrade-cro","pillar-audience","pillar-brand","pillar-financial",
  "pillar-growth","pillar-market","pillar-operations","pillar-people","pillar-product",
  "pillar-strategy","popup-cro","pricing-strategy","product-marketing-context","programmatic-seo",
  "questions","references","referral-affiliate","revops","sales-enablement","schema-markup",
  "seo-audit","signup-flow-cro","site-architecture","skill-creator","social-content","to-dos",
  "updates","video-production",
];

const skills: Skill[] = [];

for (const slug of SKILL_FILES) {
  try {
    const url = new URL(`./${slug}.md`, import.meta.url);
    const raw = Deno.readTextFileSync(url);
    const { fm, body } = parseFrontmatter(raw);
    skills.push({
      slug,
      name: fm.name || slug,
      pillars: fm.pillars || [],
      surface: fm.surface || "assistant-chat",
      triggers: (fm.trigger as any) || [],
      body,
      raw,
    });
  } catch (e) {
    console.warn(`[skill-router] failed to load ${slug}:`, (e as Error).message);
  }
}

console.log(`[skill-router] loaded ${skills.length} skills`);

// --- Matching ---
export function matchSkill(message: string): Skill | null {
  if (!message) return null;
  const lower = message.toLowerCase();
  let best: { skill: Skill; score: number } | null = null;
  for (const skill of skills) {
    for (const trigger of skill.triggers) {
      if (!trigger) continue;
      if (lower.includes(trigger)) {
        const score = trigger.length; // longer phrase = more specific
        if (!best || score > best.score) best = { skill, score };
      }
    }
  }
  return best?.skill ?? null;
}

export function getSkill(slug: string): Skill | null {
  return skills.find((s) => s.slug === slug) ?? null;
}

export function listSkills(): Skill[] {
  return skills;
}

// Build the inject block for the system prompt.
export function buildSkillBlock(skill: Skill): string {
  return `\n\n## Active Skill: ${skill.name}\n*Pillars: ${skill.pillars.join(", ") || "none declared"}*\n\n${skill.body.trim()}\n`;
}
