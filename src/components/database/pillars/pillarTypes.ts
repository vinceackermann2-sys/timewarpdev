// 9-Pillar Business DNA model — types
// Mirrors the structural model in the reference design.
// Field values are intentionally empty in the constants — they get populated
// from the user's actual Business DNA data.

export type FieldType =
  | "text"
  | "long-text"
  | "colors"
  | "typography"
  | "gallery"
  | "table"
  | "list"
  | "tags"
  | "org-chart"
  | "funnel"
  | "2x2-grid"
  | "tam-sam-som"
  | "timeline"
  | "pricing-tiers"
  | "personas"
  | "tech-stack"
  | "kpi-grid";

export interface PillarField {
  id: string;
  name: string;
  type: FieldType;
  description?: string;
  span?: 1 | 2 | 3;
  // Default empty shape per type — UI renders an empty state if value is empty.
  value: any;
}

export interface PillarSection {
  id: string;
  title: string;
  fields: PillarField[];
}

export interface PillarDefinition {
  id:
    | "brand"
    | "product"
    | "audience"
    | "market"
    | "financial"
    | "operations"
    | "people"
    | "growth"
    | "strategy";
  number: number;
  name: string;
  domain: string;
  description: string;
  sections: PillarSection[];
}
