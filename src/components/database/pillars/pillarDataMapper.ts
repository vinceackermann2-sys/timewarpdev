// Maps real Business DNA entities (brand / products / audiences)
// onto the structural 9-pillar field IDs defined in pillarConstants.ts.
// Returns a Record<fieldId, value> — anything missing is left empty so the
// PillarView falls back to its empty-state UI.

import type { BrandEntry, ProductEntry, AudienceEntry } from "@/components/database/BusinessDNAContext";

export type FieldValueMap = Record<string, any>;

function nonEmpty<T>(v: T | undefined | null | "" | []): v is T {
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

export function buildPillarValues(
  pillarId: string,
  ctx: { brand?: BrandEntry; products: ProductEntry[]; audiences: AudienceEntry[] }
): FieldValueMap {
  const { brand, products, audiences } = ctx;
  const map: FieldValueMap = {};

  if (pillarId === "brand" && brand) {
    // 1. Brand Description (long-text)
    if (brand.category) map.b1 = `${brand.name} — ${brand.category}.`;
    // 4. Brand Values — table from agentName/category placeholder if absent
    // 6. Visual Identity — colors + typography
    if (brand.colors || brand.typography) {
      const rows: string[][] = [];
      if (brand.colors) {
        rows.push(["Primary", brand.colors.primary]);
        rows.push(["Secondary", brand.colors.secondary]);
        rows.push(["Background", brand.colors.background]);
        rows.push(["Text", brand.colors.text]);
      }
      if (brand.typography) {
        rows.push(["Font Family", brand.typography.fontFamily]);
        rows.push(["Font Weight", brand.typography.fontWeight]);
        rows.push(["Font Style", brand.typography.fontStyle]);
      }
      map.b6 = { columns: ["Token", "Value"], rows };
    }
    // 5. Brand Voice — from visualIdentity.websiteRules etc. if any
    const vi = brand.visualIdentity;
    if (vi?.websiteRules?.length) {
      map.b5 = {
        columns: ["Channel", "Rule"],
        rows: vi.websiteRules.map((r) => ["Website", r]),
      };
    }
    // 8. Brand Personality — derived from category words
    if (brand.category) {
      map.b8 = brand.category.split(/[\s,/]+/).filter(Boolean).slice(0, 5);
    }
    // 9. Tagline & Power Lines — pull from buttonRules call-to-action examples
    if (vi?.buttonRules?.length) {
      map.b9 = vi.buttonRules;
    }
    // 10. Brand Perception — from socialMediaRules
    if (vi?.socialMediaRules?.length) {
      map.b10 = {
        columns: ["Channel", "Perception"],
        rows: vi.socialMediaRules.map((r) => ["Social", r]),
      };
    }
  }

  if (pillarId === "product") {
    // 1. Product Description — pick the first product's description
    const first = products[0];
    if (first?.description) map.p1 = first.description;
    // Product Catalogue — table of all products
    if (products.length) {
      map.p2 = {
        columns: ["Name", "Category", "Description"],
        rows: products.map((p) => [p.name || "—", p.category || "—", (p.description || "").slice(0, 140)]),
      };
    }
    // Features (list)
    const allFeatures = products.flatMap((p) => p.features || []).filter(nonEmpty);
    if (allFeatures.length) map.p3 = allFeatures.slice(0, 12);
    // Benefits (list)
    const allBenefits = products.flatMap((p) => p.benefits || []).filter(nonEmpty);
    if (allBenefits.length) map.p4 = allBenefits.slice(0, 12);
    // Pricing tiers — from offers
    const offerTiers = products.flatMap((p) =>
      (p.offers || []).map((o) => ({
        name: o.title || "Offer",
        price: o.salePrice || o.originalPrice || "—",
        features: [o.bundleDetails, ...(o.freeGifts || [])].filter(Boolean) as string[],
      }))
    );
    if (offerTiers.length) map.p6 = offerTiers;
    // Use Cases (list)
    const allUseCases = products.flatMap((p) => p.useCases || []).filter(nonEmpty);
    if (allUseCases.length) map.p7 = allUseCases.slice(0, 10);
    // USPs (list)
    const allUsps = products.flatMap((p) => p.uniqueSellingPoints || []).filter(nonEmpty);
    if (allUsps.length) map.p9 = allUsps.slice(0, 10);
    // Competitive Advantages (list)
    const allAdv = products.flatMap((p) => p.competitiveAdvantages || []).filter(nonEmpty);
    if (allAdv.length) map.p10 = allAdv.slice(0, 10);
    // Pain Points (list)
    const allPain = products.flatMap((p) => p.painPoints || []).filter(nonEmpty);
    if (allPain.length) map.p11 = allPain.slice(0, 10);
    // Objections (table)
    const allObj = products.flatMap((p) => p.commonObjections || []).filter((o) => o?.objection);
    if (allObj.length) {
      map.p12 = {
        columns: ["Objection", "Response"],
        rows: allObj.map((o) => [o.objection, o.response]),
      };
    }
    // Social Proof (table)
    const allProof = products.flatMap((p) => p.proofPoints || []).filter((p) => p?.category);
    if (allProof.length) {
      map.p13 = {
        columns: ["Category", "Proof"],
        rows: allProof.map((pp) => [pp.category, (pp.items || []).join("; ")]),
      };
    }
  }

  if (pillarId === "audience") {
    // 1. Audience Description
    const first = audiences[0];
    if (first?.description) map.a1 = first.description;
    // Personas — build from each audience
    if (audiences.length) {
      map.a3 = audiences.map((au) => ({
        name: au.name || "Audience",
        snapshot: (au.description || "").slice(0, 120),
        goals: (au.keySuccessIndicators || []).slice(0, 4),
        fears: (au.commonObjections || []).map((o) => o.objection).filter(Boolean).slice(0, 4),
      }));
    }
    // Buying Triggers (list)
    const allTriggers = audiences.flatMap((a) => a.buyingTriggers || []).filter(nonEmpty);
    if (allTriggers.length) map.a4 = allTriggers.slice(0, 10);
    // Engagement Patterns (table)
    const allEngagement = audiences.flatMap((a) => a.engagementTriggers || []).filter(nonEmpty);
    if (allEngagement.length) {
      map.a8 = {
        columns: ["Trigger", "Driver"],
        rows: allEngagement.map((t) => ["Engagement", t]),
      };
    }
    // Language Patterns (list)
    const allHooks = audiences.flatMap((a) => a.attentionHooks || []).filter(nonEmpty);
    if (allHooks.length) map.a9 = allHooks.slice(0, 10);
    // Proof Hierarchy (table)
    const allProof = audiences.flatMap((a) => a.proofPoints || []).filter((p) => p?.category);
    if (allProof.length) {
      map.a10 = {
        columns: ["Type", "Proof"],
        rows: allProof.map((pp) => [pp.category, (pp.items || []).join("; ")]),
      };
    }
    // Retention drivers (list)
    const allValueProps = audiences.flatMap((a) => a.valuePropositions || []).filter(nonEmpty);
    if (allValueProps.length) map.a11 = allValueProps.slice(0, 10);
  }

  // Pillars 4-9 (market, financial, operations, people, growth, strategy):
  // We don't have structured DNA fields for these yet — leave empty so the
  // PillarFieldRenderer shows its empty-state UI.

  return map;
}
