import type { PillarDefinition, FieldType } from "./pillarTypes";

// Empty-shape factory for each field type. The UI renders an empty placeholder
// when the value is empty.
const empty = (type: FieldType): any => {
  switch (type) {
    case "text":
    case "long-text":
      return "";
    case "tags":
    case "list":
    case "gallery":
    case "personas":
    case "pricing-tiers":
    case "tech-stack":
    case "kpi-grid":
    case "timeline":
    case "funnel":
    case "colors":
      return [];
    case "table":
      return { columns: [], rows: [] };
    case "typography":
      return { family: "", weight: "" };
    case "org-chart":
      return null;
    case "2x2-grid":
      return { xLabel: "", yLabel: "", points: [] };
    case "tam-sam-som":
      return {
        tam: { label: "TAM", value: "" },
        sam: { label: "SAM", value: "" },
        som: { label: "SOM", value: "" },
      };
    default:
      return null;
  }
};

const f = (id: string, name: string, type: FieldType, span: 1 | 2 | 3 = 3): any => ({
  id,
  name,
  type,
  span,
  value: empty(type),
});

// Field IDs and names mirror the TimeWarp Business DNA Model document EXACTLY
// (86 fields across 9 pillars). Value formulas (table columns) follow the
// document's prescribed schemas — e.g. Brand Voice = [Component, What It Is, How Determined].
export const PILLARS: PillarDefinition[] = [
  // ── 1. BRAND ─────────────────────────────────────────────────────────────
  {
    id: "brand",
    number: 1,
    name: "Brand DNA",
    domain: "Identity & Perception",
    description: "Who you are and how the world sees you.",
    sections: [
      {
        id: "brand_main",
        title: "Brand Overview",
        fields: [
          f("b1", "1. Brand Description", "long-text", 3),
          f("b2", "2. Mission Statement", "text", 1),
          f("b3", "3. Vision Statement", "text", 1),
        ],
      },
      {
        id: "brand_values",
        title: "Values & Principles",
        fields: [f("b4", "4. Brand Values", "table", 3)],
      },
      {
        id: "brand_identity",
        title: "Voice & Visuals",
        fields: [
          f("b5", "5. Brand Voice", "table", 3),
          f("b6", "6. Visual Identity", "table", 2),
          f("b8", "8. Brand Personality", "tags", 1),
        ],
      },
      {
        id: "brand_market",
        title: "Market & Perception",
        fields: [
          f("b7", "7. Brand Positioning", "long-text", 2),
          f("b9", "9. Tagline & Power Lines", "list", 1),
          f("b10", "10. Brand Perception", "table", 2),
          f("b11", "11. Brand Refinement Checklist", "table", 3),
        ],
      },
    ],
  },

  // ── 2. PRODUCT ───────────────────────────────────────────────────────────
  {
    id: "product",
    number: 2,
    name: "Product DNA",
    domain: "What You Build & Deliver",
    description: "What you make, sell, and how it works.",
    sections: [
      {
        id: "product_main",
        title: "Product Overview",
        fields: [
          f("p1", "1. Product Description", "long-text", 3),
          f("p2", "2. Product Catalogue", "pricing-tiers", 3),
        ],
      },
      {
        id: "product_features",
        title: "Capabilities & Mechanics",
        fields: [
          f("p3", "3. Features", "list", 1),
          f("p4", "4. Benefits", "list", 1),
          f("p5", "5. Mechanism", "text", 1),
        ],
      },
      {
        id: "product_strategy",
        title: "Market Logic & Value",
        fields: [
          f("p6", "6. Pricing Architecture", "table", 2),
          f("p8", "8. Value Proposition", "long-text", 2),
          f("p9", "9. Unique Selling Points (USPs)", "list", 1),
          f("p11", "11. Pain Points Solved", "list", 1),
        ],
      },
      {
        id: "product_validation",
        title: "Proof & Roadmap",
        fields: [
          f("p7", "7. Use Cases", "tags", 1),
          f("p10", "10. Competitive Advantages", "table", 2),
          f("p12", "12. Objections & Responses", "table", 1),
          f("p13", "13. Social Proof", "table", 2),
          f("p14", "14. Product Roadmap", "timeline", 3),
          f("p15", "15. Product Refinement Checklist", "table", 3),
        ],
      },
    ],
  },

  // ── 3. AUDIENCE ──────────────────────────────────────────────────────────
  {
    id: "audience",
    number: 3,
    name: "Audience DNA",
    domain: "Who You Serve",
    description: "Personas, journey, and psychology of the people you serve.",
    sections: [
      {
        id: "audience_main",
        title: "Audience Overview",
        fields: [
          f("a1", "1. Audience Description", "long-text", 3),
          f("a2", "2. Segmentation Model", "table", 3),
          f("a3", "3. Buyer Persona", "personas", 3),
        ],
      },
      {
        id: "audience_journey",
        title: "Journey & Triggers",
        fields: [
          f("a4", "4. Buying Triggers", "list", 1),
          f("a5", "5. Customer Journey Map", "timeline", 3),
          f("a6", "6. Decision Criteria", "table", 2),
        ],
      },
      {
        id: "audience_psychographics",
        title: "Language & Proof",
        fields: [
          f("a7", "7. Pain Point Architecture", "list", 1),
          f("a8", "8. Objections & Responses", "table", 1),
          f("a9", "9. Engagement Patterns", "text", 1),
          f("a10", "10. Language Patterns", "table", 2),
          f("a11", "11. Proof Hierarchy", "list", 1),
          f("a12", "12. Retention & Loyalty Drivers", "text", 1),
          f("a13", "13. Audience Refinement Checklist", "table", 3),
        ],
      },
    ],
  },

  // ── 4. MARKET ────────────────────────────────────────────────────────────
  {
    id: "market",
    number: 4,
    name: "Market DNA",
    domain: "Where You Compete",
    description: "Industry, competitors, and external forces.",
    sections: [
      {
        id: "market_main",
        title: "Market Overview",
        fields: [
          f("m1", "1. Market Definition", "tam-sam-som", 2),
          f("m2", "2. Competitive Landscape", "table", 3),
        ],
      },
      {
        id: "market_competition",
        title: "Competitive Map",
        fields: [
          f("m3", "3. Competitive Positioning Map", "2x2-grid", 3),
          f("m4", "4. Competitive Advantages (Sustainable)", "table", 3),
        ],
      },
      {
        id: "market_forces",
        title: "Forces & Trends",
        fields: [
          f("m5", "5. Industry Forces Analysis", "table", 3),
          f("m6", "6. Market Trends", "list", 1),
        ],
      },
      {
        id: "market_future",
        title: "Future & Opportunities",
        fields: [
          f("m7", "7. Market Timing Assessment", "text", 1),
          f("m8", "8. White Space Opportunities", "text", 2),
          f("m9", "9. Market Refinement Checklist", "table", 3),
        ],
      },
    ],
  },

  // ── 5. FINANCIAL ─────────────────────────────────────────────────────────
  {
    id: "financial",
    number: 5,
    name: "Financial DNA",
    domain: "How You Make Money",
    description: "Revenue, costs, margins, and financial trajectory.",
    sections: [
      {
        id: "financial_main",
        title: "Financial Overview",
        fields: [
          f("f1", "1. Business Model", "table", 2),
          f("f2", "2. Revenue Architecture", "table", 1),
        ],
      },
      {
        id: "financial_costs",
        title: "Costs & Economics",
        fields: [
          f("f3", "3. Cost Structure", "table", 3),
          f("f4", "4. Unit Economics", "kpi-grid", 3),
        ],
      },
      {
        id: "financial_projections",
        title: "Future & Capital",
        fields: [
          f("f5", "5. Profitability Profile", "table", 3),
          f("f6", "6. Cash Flow Profile", "text", 2),
          f("f7", "7. Financial Projections", "list", 1),
          f("f8", "8. Funding & Capital Structure", "text", 1),
          f("f9", "9. Financial Refinement Checklist", "table", 3),
        ],
      },
    ],
  },

  // ── 6. OPERATIONS ────────────────────────────────────────────────────────
  {
    id: "operations",
    number: 6,
    name: "Operations DNA",
    domain: "How You Work",
    description: "Processes, systems, tools, and workflows.",
    sections: [
      {
        id: "operations_main",
        title: "Operations Overview",
        fields: [
          f("o1", "1. Operating Model", "long-text", 3),
          f("o2", "2. Core Processes", "table", 3),
        ],
      },
      {
        id: "operations_tech",
        title: "Technology & Stack",
        fields: [
          f("o3", "3. Technology Stack", "tech-stack", 3),
          f("o4", "4. Supply Chain & Vendors", "table", 2),
        ],
      },
      {
        id: "operations_standards",
        title: "Standards & KPIs",
        fields: [
          f("o5", "5. Quality Standards", "list", 1),
          f("o6", "6. Operational KPIs", "kpi-grid", 3),
        ],
      },
      {
        id: "operations_risk",
        title: "Risk & Compliance",
        fields: [
          f("o7", "7. Risk Register", "table", 2),
          f("o8", "8. Compliance & Regulatory", "tags", 1),
          f("o9", "9. Operations Refinement Checklist", "table", 3),
        ],
      },
    ],
  },

  // ── 7. PEOPLE ────────────────────────────────────────────────────────────
  {
    id: "people",
    number: 7,
    name: "People DNA",
    domain: "Who Runs It",
    description: "Team, culture, hiring, and organizational mapping.",
    sections: [
      {
        id: "people_main",
        title: "People Overview",
        fields: [
          f("pe1", "1. Organizational Structure", "org-chart", 3),
          f("pe2", "2. Leadership Profiles", "table", 3),
        ],
      },
      {
        id: "people_culture",
        title: "Capability & Culture",
        fields: [
          f("pe3", "3. Team Capability Map", "table", 3),
          f("pe4", "4. Culture", "table", 2),
        ],
      },
      {
        id: "people_management",
        title: "Management & Growth",
        fields: [
          f("pe5", "5. Hiring Intelligence", "list", 1),
          f("pe6", "6. Performance Management", "text", 1),
          f("pe7", "7. Compensation & Benefits", "text", 1),
          f("pe8", "8. Attrition & Retention", "text", 2),
          f("pe9", "9. People Refinement Checklist", "table", 3),
        ],
      },
    ],
  },

  // ── 8. GROWTH ────────────────────────────────────────────────────────────
  {
    id: "growth",
    number: 8,
    name: "Growth DNA",
    domain: "How You Scale",
    description: "Marketing, acquisition, retention, and funnel.",
    sections: [
      {
        id: "growth_main",
        title: "Growth Overview",
        fields: [
          f("g1", "1. Growth Model", "table", 3),
          f("g2", "2. Channel Intelligence", "table", 3),
        ],
      },
      {
        id: "growth_funnel",
        title: "Funnel & Strategy",
        fields: [
          f("g3", "3. Funnel Architecture", "funnel", 3),
          f("g4", "4. Content Strategy", "table", 3),
        ],
      },
      {
        id: "growth_creative",
        title: "Creative & Experiments",
        fields: [
          f("g5", "5. Campaign Intelligence", "text", 1),
          f("g6", "6. Creative Intelligence", "list", 1),
          f("g7", "7. Retention & Lifecycle", "text", 1),
          f("g8", "8. Referral & Advocacy Program", "text", 2),
          f("g9", "9. Growth Experiments Log", "table", 3),
          f("g10", "10. Growth Refinement Checklist", "table", 3),
        ],
      },
    ],
  },

  // ── 9. STRATEGY ──────────────────────────────────────────────────────────
  {
    id: "strategy",
    number: 9,
    name: "Strategy DNA",
    domain: "Where You Are Going",
    description: "Vision, goals, roadmap, and strategic decisions.",
    sections: [
      {
        id: "strategy_main",
        title: "Strategy Overview",
        fields: [
          f("s1", "1. Strategic Vision", "long-text", 3),
          f("s2", "2. Strategic Objectives", "list", 1),
          f("s3", "3. Strategic Bets", "table", 2),
        ],
      },
      {
        id: "strategy_allocation",
        title: "Resource & Focus",
        fields: [
          f("s4", "4. Business Stage & Model", "table", 3),
          f("s5", "5. Resource Allocation Framework", "table", 3),
          f("s6", "6. Decision Framework", "table", 2),
          f("s7", "7. Risk Appetite & Tolerance", "table", 2),
          f("s8", "8. Strategic Milestones", "timeline", 3),
          f("s9", "9. Strategic Narrative", "text", 2),
          f("s10", "10. Scenario Planning", "table", 3),
          f("s11", "11. Strategy Refinement Checklist", "table", 3),
        ],
      },
    ],
  },
];

export const PILLAR_BY_ID = Object.fromEntries(PILLARS.map((p) => [p.id, p]));
