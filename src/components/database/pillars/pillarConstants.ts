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
      return { role: "", name: "", children: [] };
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
          f("b8", "8. Brand Personality Tags", "tags", 1),
        ],
      },
      {
        id: "brand_market",
        title: "Market & Perception",
        fields: [
          f("b7", "7. Domain & Category", "long-text", 2),
          f("b9", "9. Tagline & Power Lines", "list", 1),
          f("b10", "10. Social Presence", "table", 2),
          f("b11", "11. Brand Completeness Checklist", "table", 3),
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
          f("p5", "5. How It Works", "text", 1),
        ],
      },
      {
        id: "product_strategy",
        title: "Market Logic & Value",
        fields: [
          f("p6", "6. Offers & Pricing", "table", 2),
          f("p8", "8. Product Promise", "long-text", 2),
          f("p9", "9. Unique Selling Points (USPs)", "list", 1),
          f("p11", "11. Pain Points Solved", "list", 1),
        ],
      },
      {
        id: "product_validation",
        title: "Proof & Roadmap",
        fields: [
          f("p7", "7. Use Cases", "tags", 1),
          f("p10", "10. Competitor Comparison", "table", 2),
          f("p12", "12. Objections & Responses", "table", 1),
          f("p13", "13. Social Proof", "table", 2),
          f("p14", "14. COGS (Cost of Goods Sold)", "timeline", 3),
          f("p15", "15. Product Completeness Checklist", "table", 3),
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
          f("m1", "1. Market Size (if known)", "tam-sam-som", 2),
          f("m2", "2. Known Competitors", "table", 3),
        ],
      },
      {
        id: "market_competition",
        title: "Competitive Map",
        fields: [
        ],
      },
      {
        id: "market_forces",
        title: "Forces & Trends",
        fields: [
          f("m6", "6. Industry & Category", "list", 1),
        ],
      },
      {
        id: "market_future",
        title: "Future & Opportunities",
        fields: [
          f("m9", "9. Market Completeness Checklist", "table", 3),
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
          f("f1", "1. Revenue Model Type", "table", 2),
          f("f2", "2. Revenue Data", "table", 1),
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
          f("f5", "5. Profit Margins", "table", 3),
          f("f6", "6. Cash Position", "text", 2),
          f("f8", "8. Funding History", "text", 1),
          f("f9", "9. Financial Completeness Checklist", "table", 3),
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
          f("o1", "1. Business Model Description", "long-text", 3),
          f("o2", "2. Core Processes", "table", 3),
        ],
      },
      {
        id: "operations_tech",
        title: "Technology & Stack",
        fields: [
          f("o3", "3. Technology Stack", "tech-stack", 3),
          f("o4", "4. Suppliers & Vendors", "table", 2),
        ],
      },
      {
        id: "operations_standards",
        title: "Standards & KPIs",
        fields: [
          f("o5", "5. Certifications & Standards", "list", 1),
          f("o6", "6. Operational KPIs", "kpi-grid", 3),
        ],
      },
      {
        id: "operations_risk",
        title: "Risk & Compliance",
        fields: [
          f("o8", "8. Compliance & Regulatory", "tags", 1),
          f("o9", "9. Operations Completeness Checklist", "table", 3),
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
          f("g1", "1. Active Channels", "table", 3),
          f("g2", "2. Channel Performance", "table", 3),
        ],
      },
      {
        id: "growth_funnel",
        title: "Funnel & Strategy",
        fields: [
          f("g3", "3. Funnel Metrics", "funnel", 3),
          f("g4", "4. Content Inventory", "table", 3),
        ],
      },
      {
        id: "growth_creative",
        title: "Creative & Experiments",
        fields: [
          f("g5", "5. Active Campaigns", "text", 1),
          f("g6", "6. Creative Assets", "list", 1),
          f("g7", "7. Customer Retention Rate", "text", 1),
          f("g8", "8. Referral Data", "text", 2),
          f("g10", "10. Growth Completeness Checklist", "table", 3),
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
          f("s1", "1. Company Vision", "long-text", 3),
          f("s2", "2. Company Objectives / Goals", "list", 1),
          f("s3", "3. Active Initiatives", "table", 2),
        ],
      },
      {
        id: "strategy_allocation",
        title: "Resource & Focus",
        fields: [
          f("s4", "4. Business Stage", "table", 3),
          f("s5", "5. Team Allocation", "table", 3),
          f("s8", "8. Key Milestones (past + upcoming)", "timeline", 3),
          f("s11", "11. Strategy Completeness Checklist", "table", 3),
        ],
      },
    ],
  },
];

export const PILLAR_BY_ID = Object.fromEntries(PILLARS.map((p) => [p.id, p]));
