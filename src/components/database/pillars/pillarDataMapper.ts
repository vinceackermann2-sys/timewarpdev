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
  ctx: { brand?: BrandEntry; products: ProductEntry[]; audiences: AudienceEntry[]; extended?: any }
): FieldValueMap {
  const { brand, products, audiences, extended } = ctx;
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
  // Populated from pre-generated JSON saved by enrich-pillars (one row per pillar in user_business_data).
  const ext = extended || null;

  if (pillarId === "market" && ext) {
    if (ext.definition) {
      map.m1 = {
        tam: { label: "TAM", value: ext.definition.tam || "" },
        sam: { label: "SAM", value: ext.definition.sam || "" },
        som: { label: "SOM", value: ext.definition.som || "" },
      };
    }
    if (Array.isArray(ext.competitors) && ext.competitors.length) {
      map.m2 = {
        columns: ["Competitor", "Positioning", "Strength", "Weakness"],
        rows: ext.competitors.map((c: any) => [c.name || "—", c.positioning || "—", c.strength || "—", c.weakness || "—"]),
      };
    }
    if (Array.isArray(ext.advantages) && ext.advantages.length) {
      map.m4 = {
        columns: ["Advantage", "Why Sustainable"],
        rows: ext.advantages.map((a: any) => [a.advantage || "—", a.why_sustainable || "—"]),
      };
    }
    if (Array.isArray(ext.forces) && ext.forces.length) {
      map.m5 = {
        columns: ["Force", "Intensity", "Rationale"],
        rows: ext.forces.map((f: any) => [f.force || "—", f.intensity || "—", f.rationale || "—"]),
      };
    }
    if (Array.isArray(ext.trends) && ext.trends.length) map.m6 = ext.trends;
    if (ext.timing) map.m7 = ext.timing;
    if (ext.white_space) map.m8 = ext.white_space;
  }

  if (pillarId === "financial" && ext) {
    if (Array.isArray(ext.model) && ext.model.length) {
      map.f1 = {
        columns: ["Stream", "Type", "Notes"],
        rows: ext.model.map((m: any) => [m.stream || "—", m.type || "—", m.notes || "—"]),
      };
    }
    if (Array.isArray(ext.revenue_arch) && ext.revenue_arch.length) {
      map.f2 = {
        columns: ["Stream", "Share %"],
        rows: ext.revenue_arch.map((r: any) => [r.stream || "—", r.share_pct || "—"]),
      };
    }
    if (Array.isArray(ext.costs) && ext.costs.length) {
      map.f3 = {
        columns: ["Category", "Item", "Notes"],
        rows: ext.costs.map((c: any) => [c.category || "—", c.item || "—", c.notes || "—"]),
      };
    }
    if (Array.isArray(ext.unit_economics) && ext.unit_economics.length) {
      map.f4 = ext.unit_economics.map((u: any) => ({ name: u.metric || "—", value: u.value || "—", context: u.context || "" }));
    }
    if (Array.isArray(ext.profitability) && ext.profitability.length) {
      map.f5 = {
        columns: ["Stage", "Margin Outlook"],
        rows: ext.profitability.map((p: any) => [p.stage || "—", p.margin_outlook || "—"]),
      };
    }
    if (ext.cash_flow) map.f6 = ext.cash_flow;
    if (Array.isArray(ext.projections) && ext.projections.length) map.f7 = ext.projections;
    if (ext.funding) map.f8 = ext.funding;
  }

  if (pillarId === "operations" && ext) {
    if (ext.operating_model) map.o1 = ext.operating_model;
    if (Array.isArray(ext.core_processes) && ext.core_processes.length) {
      map.o2 = {
        columns: ["Process", "Owner", "Outcome"],
        rows: ext.core_processes.map((p: any) => [p.process || "—", p.owner || "—", p.outcome || "—"]),
      };
    }
    if (Array.isArray(ext.tech_stack) && ext.tech_stack.length) {
      map.o3 = ext.tech_stack.map((t: any) => ({ category: t.category || "Other", tool: t.tool || "—", purpose: t.purpose || "" }));
    }
    if (Array.isArray(ext.vendors) && ext.vendors.length) {
      map.o4 = {
        columns: ["Vendor", "Role"],
        rows: ext.vendors.map((v: any) => [v.vendor || "—", v.role || "—"]),
      };
    }
    if (Array.isArray(ext.quality) && ext.quality.length) map.o5 = ext.quality;
    if (Array.isArray(ext.kpis) && ext.kpis.length) {
      map.o6 = ext.kpis.map((k: any) => ({ name: k.name || "—", value: k.target || "—", context: k.rationale || "" }));
    }
    if (Array.isArray(ext.risks) && ext.risks.length) {
      map.o7 = {
        columns: ["Risk", "Likelihood", "Mitigation"],
        rows: ext.risks.map((r: any) => [r.risk || "—", r.likelihood || "—", r.mitigation || "—"]),
      };
    }
    if (Array.isArray(ext.compliance) && ext.compliance.length) map.o8 = ext.compliance;
  }

  if (pillarId === "people" && ext) {
    if (ext.org_chart) map.pe1 = ext.org_chart;
    if (Array.isArray(ext.leadership) && ext.leadership.length) {
      map.pe2 = {
        columns: ["Role", "Name", "Focus"],
        rows: ext.leadership.map((l: any) => [l.role || "—", l.name || "—", l.focus || "—"]),
      };
    }
    if (Array.isArray(ext.capabilities) && ext.capabilities.length) {
      map.pe3 = {
        columns: ["Capability", "Current Level", "Owner"],
        rows: ext.capabilities.map((c: any) => [c.capability || "—", c.current_level || "—", c.owner || "—"]),
      };
    }
    if (Array.isArray(ext.culture) && ext.culture.length) {
      map.pe4 = {
        columns: ["Value", "Behavior"],
        rows: ext.culture.map((c: any) => [c.value || "—", c.behavior || "—"]),
      };
    }
    if (Array.isArray(ext.hiring) && ext.hiring.length) map.pe5 = ext.hiring;
    if (ext.performance) map.pe6 = ext.performance;
    if (ext.compensation) map.pe7 = ext.compensation;
    if (ext.retention) map.pe8 = ext.retention;
  }

  if (pillarId === "growth" && ext) {
    if (Array.isArray(ext.growth_model) && ext.growth_model.length) {
      map.g1 = {
        columns: ["Lever", "Channel", "Expected Impact"],
        rows: ext.growth_model.map((g: any) => [g.lever || "—", g.channel || "—", g.expected_impact || "—"]),
      };
    }
    if (Array.isArray(ext.channels) && ext.channels.length) {
      map.g2 = {
        columns: ["Channel", "Stage", "Fit", "Notes"],
        rows: ext.channels.map((c: any) => [c.channel || "—", c.stage || "—", c.fit || "—", c.notes || "—"]),
      };
    }
    if (Array.isArray(ext.funnel) && ext.funnel.length) {
      map.g3 = ext.funnel.map((f: any) => ({ stage: f.stage || "—", metric: f.metric || "—", value: f.value || "—" }));
    }
    if (Array.isArray(ext.content) && ext.content.length) {
      map.g4 = {
        columns: ["Format", "Topic", "Channel"],
        rows: ext.content.map((c: any) => [c.format || "—", c.topic || "—", c.channel || "—"]),
      };
    }
    if (ext.campaigns) map.g5 = ext.campaigns;
    if (Array.isArray(ext.creative) && ext.creative.length) map.g6 = ext.creative;
    if (ext.retention) map.g7 = ext.retention;
    if (ext.referral) map.g8 = ext.referral;
    if (Array.isArray(ext.experiments) && ext.experiments.length) {
      map.g9 = {
        columns: ["Hypothesis", "Channel", "Status"],
        rows: ext.experiments.map((e: any) => [e.hypothesis || "—", e.channel || "—", e.status || "—"]),
      };
    }
  }

  if (pillarId === "strategy" && ext) {
    if (ext.vision) map.s1 = ext.vision;
    if (Array.isArray(ext.objectives) && ext.objectives.length) map.s2 = ext.objectives;
    if (Array.isArray(ext.bets) && ext.bets.length) {
      map.s3 = {
        columns: ["Bet", "Rationale"],
        rows: ext.bets.map((b: any) => [b.bet || "—", b.rationale || "—"]),
      };
    }
    if (Array.isArray(ext.stage_model) && ext.stage_model.length) {
      map.s4 = {
        columns: ["Dimension", "Value"],
        rows: ext.stage_model.map((s: any) => [s.dimension || "—", s.value || "—"]),
      };
    }
    if (Array.isArray(ext.resource_allocation) && ext.resource_allocation.length) {
      map.s5 = {
        columns: ["Area", "Share %", "Rationale"],
        rows: ext.resource_allocation.map((r: any) => [r.area || "—", r.share_pct || "—", r.rationale || "—"]),
      };
    }
    if (Array.isArray(ext.priorities) && ext.priorities.length) map.s6 = ext.priorities;
    if (Array.isArray(ext.decisions_log) && ext.decisions_log.length) {
      map.s7 = {
        columns: ["Date", "Decision", "Rationale"],
        rows: ext.decisions_log.map((d: any) => [d.date || "—", d.decision || "—", d.rationale || "—"]),
      };
    }
    if (Array.isArray(ext.roadmap) && ext.roadmap.length) {
      map.s8 = ext.roadmap.map((r: any) => ({ milestone: r.milestone || "—", horizon: r.horizon || "—", outcome: r.outcome || "" }));
    }
    if (ext.narrative) map.s9 = ext.narrative;
    if (Array.isArray(ext.scenarios) && ext.scenarios.length) {
      map.s10 = {
        columns: ["Scenario", "Trigger", "Response"],
        rows: ext.scenarios.map((s: any) => [s.scenario || "—", s.trigger || "—", s.response || "—"]),
      };
    }
  }

  return map;
}
