// Maps real Business DNA entities (brand / products / audiences)
// onto the structural 9-pillar field IDs defined in pillarConstants.ts.
// Table column headers follow the TimeWarp Business DNA Model doc EXACTLY.

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

  // ── BRAND ──────────────────────────────────────────────────────────────
  if (pillarId === "brand" && brand) {
    if (brand.category) map.b1 = `${brand.name} — ${brand.category}.`;

    // 6. Visual Identity → doc columns: Field, What It Captures
    if (brand.colors || brand.typography) {
      const rows: string[][] = [];
      if (brand.colors) {
        rows.push(["Primary Palette", brand.colors.primary]);
        rows.push(["Secondary Palette", brand.colors.secondary]);
        rows.push(["Background", brand.colors.background]);
        rows.push(["Text", brand.colors.text]);
      }
      if (brand.typography) {
        rows.push(["Typography Stack", `${brand.typography.fontFamily} · ${brand.typography.fontWeight}`]);
      }
      map.b6 = { columns: ["Field", "What It Captures"], rows };
    }

    // 5. Brand Voice → doc columns: Component, What It Is, How Determined
    const vi = brand.visualIdentity;
    if (vi?.websiteRules?.length) {
      map.b5 = {
        columns: ["Component", "What It Is", "How Determined"],
        rows: vi.websiteRules.slice(0, 6).map((r) => ["Voice Rule", r, "Extracted from website copy"]),
      };
    }

    // 8. Brand Personality
    if (brand.category) {
      map.b8 = brand.category.split(/[\s,/]+/).filter(Boolean).slice(0, 5);
    }
    // 9. Tagline & Power Lines
    if (vi?.buttonRules?.length) map.b9 = vi.buttonRules;

    // 10. Brand Perception → doc columns: Channel, Perception
    if (vi?.socialMediaRules?.length) {
      map.b10 = {
        columns: ["Channel", "Perception"],
        rows: vi.socialMediaRules.map((r) => ["Social", r]),
      };
    }

    // AI-enriched additions (b2/b3/b4/b7/b11)
    if (extended) {
      if (extended.mission) map.b2 = extended.mission;
      if (extended.vision) map.b3 = extended.vision;
      if (Array.isArray(extended.values) && extended.values.length) {
        map.b4 = {
          columns: ["Value", "Lived Behavior"],
          rows: extended.values.map((v: any) => [v.value || "—", v.behavior || "—"]),
        };
      }
      if (extended.positioning) map.b7 = extended.positioning;
      if (Array.isArray(extended.checklist) && extended.checklist.length) {
        map.b11 = {
          columns: ["Item", "Status"],
          rows: extended.checklist.map((c: any) => [c.item || "—", c.status || "—"]),
        };
      }
    }
  }

  // ── PRODUCT ────────────────────────────────────────────────────────────
  if (pillarId === "product") {
    const first = products[0];
    if (first?.description) map.p1 = first.description;
    if (products.length) {
      // 2. Product Catalogue → doc formula [SKU/VARIANT] + [NAME] + [DESCRIPTION] + [PRICE] + [POSITIONING]
      map.p2 = products.map((p) => ({
        name: p.name || "—",
        price: (p.offers?.[0]?.salePrice || p.offers?.[0]?.originalPrice || "—"),
        features: [p.category, (p.description || "").slice(0, 100)].filter(Boolean) as string[],
      }));
    }
    const allFeatures = products.flatMap((p) => p.features || []).filter(nonEmpty);
    if (allFeatures.length) map.p3 = allFeatures.slice(0, 12);
    const allBenefits = products.flatMap((p) => p.benefits || []).filter(nonEmpty);
    if (allBenefits.length) map.p4 = allBenefits.slice(0, 12);

    // 6. Pricing Architecture → doc columns: Field, What It Is, How Determined
    const offerRows = products.flatMap((p) =>
      (p.offers || []).map((o) => [
        o.title || "Offer",
        o.salePrice || o.originalPrice || "—",
        [o.bundleDetails, ...(o.freeGifts || [])].filter(Boolean).join("; ") || "—",
      ])
    );
    if (offerRows.length) {
      map.p6 = {
        columns: ["Tier", "Price Point", "What's Included"],
        rows: offerRows,
      };
    }

    const allUseCases = products.flatMap((p) => p.useCases || []).filter(nonEmpty);
    if (allUseCases.length) map.p7 = allUseCases.slice(0, 10);
    const allUsps = products.flatMap((p) => p.uniqueSellingPoints || []).filter(nonEmpty);
    if (allUsps.length) map.p9 = allUsps.slice(0, 10);

    // 10. Competitive Advantages → doc formula [COMPETITOR APPROACH] vs [THIS] + [WHY WE WIN]
    const allAdv = products.flatMap((p) => p.competitiveAdvantages || []).filter(nonEmpty);
    if (allAdv.length) {
      map.p10 = {
        columns: ["Advantage", "Why We Win"],
        rows: allAdv.slice(0, 10).map((a) => [a, "Differentiated capability"]),
      };
    }

    const allPain = products.flatMap((p) => p.painPoints || []).filter(nonEmpty);
    if (allPain.length) map.p11 = allPain.slice(0, 10);

    // 12. Objections → doc: [OBJECTION] → [REFRAME] → [PROOF]
    const allObj = products.flatMap((p) => p.commonObjections || []).filter((o) => o?.objection);
    if (allObj.length) {
      map.p12 = {
        columns: ["Objection", "Reframe / Response"],
        rows: allObj.map((o) => [o.objection, o.response]),
      };
    }

    // 13. Social Proof → doc columns: Proof Type, What to Capture
    const allProof = products.flatMap((p) => p.proofPoints || []).filter((p) => p?.category);
    if (allProof.length) {
      map.p13 = {
        columns: ["Proof Type", "What to Capture"],
        rows: allProof.map((pp) => [pp.category, (pp.items || []).join("; ")]),
      };
    }

    // AI-enriched additions (p5/p8/p14/p15)
    if (extended) {
      if (extended.mechanism) map.p5 = extended.mechanism;
      if (extended.value_proposition) map.p8 = extended.value_proposition;
      if (Array.isArray(extended.roadmap) && extended.roadmap.length) {
        map.p14 = extended.roadmap.map((r: any) => ({
          date: r.horizon || "—",
          title: r.milestone || "—",
          desc: r.outcome || "",
        }));
      }
      if (Array.isArray(extended.checklist) && extended.checklist.length) {
        map.p15 = {
          columns: ["Item", "Status"],
          rows: extended.checklist.map((c: any) => [c.item || "—", c.status || "—"]),
        };
      }
    }
  }

  // ── AUDIENCE ───────────────────────────────────────────────────────────
  if (pillarId === "audience") {
    const first = audiences[0];
    // 1. Audience Description (single primary)
    if (first?.description) map.a1 = first.description;

    // 2. Segmentation Model → doc columns: Segment Type, What Defines It, Data Sources
    if (audiences.length) {
      map.a2 = {
        columns: ["Segment", "Defining Characteristic", "Source"],
        rows: audiences.map((au) => [
          au.name || "Segment",
          (au.description || "").slice(0, 120) || "—",
          "Onboarding intelligence",
        ]),
      };
    }

    // 3. Buyer Persona — composite character per audience
    if (audiences.length) {
      map.a3 = audiences.map((au) => ({
        name: au.name || "Audience",
        snapshot: (au.description || "").slice(0, 120),
        goals: (au.keySuccessIndicators || []).slice(0, 4),
        fears: (au.commonObjections || []).map((o) => o.objection).filter(Boolean).slice(0, 4),
      }));
    }

    // 4. Buying Triggers
    const allTriggers = audiences.flatMap((a) => a.buyingTriggers || []).filter(nonEmpty);
    if (allTriggers.length) map.a4 = allTriggers.slice(0, 10);

    // 9. Engagement Patterns
    const allEngagement = audiences.flatMap((a) => a.engagementTriggers || []).filter(nonEmpty);
    if (allEngagement.length) map.a9 = allEngagement.join("; ");

    // 10. Language Patterns → doc columns: Pattern Type, Examples
    const allHooks = audiences.flatMap((a) => a.attentionHooks || []).filter(nonEmpty);
    if (allHooks.length) {
      map.a10 = {
        columns: ["Pattern", "Example"],
        rows: allHooks.slice(0, 10).map((h) => ["Attention Hook", h]),
      };
    }

    // 11. Proof Hierarchy
    const allProof = audiences.flatMap((a) => a.proofPoints || []).filter((p) => p?.category);
    if (allProof.length) {
      map.a11 = allProof.flatMap((pp) => (pp.items || []).map((i: string) => `${pp.category}: ${i}`)).slice(0, 10);
    }

    // 12. Retention & Loyalty Drivers
    const allValueProps = audiences.flatMap((a) => a.valuePropositions || []).filter(nonEmpty);
    if (allValueProps.length) map.a12 = allValueProps.join("; ");

    // 8. Objections & Responses
    const allAObj = audiences.flatMap((a) => a.commonObjections || []).filter((o) => o?.objection);
    if (allAObj.length) {
      map.a8 = {
        columns: ["Objection", "Response"],
        rows: allAObj.map((o) => [o.objection, o.response || "—"]),
      };
    }

    // AI-enriched additions (a5/a6/a7/a13)
    if (extended) {
      if (Array.isArray(extended.journey) && extended.journey.length) {
        map.a5 = extended.journey.map((s: any) => ({
          date: s.stage || "—",
          title: s.moment || "—",
          desc: s.thought || "",
        }));
      }
      if (Array.isArray(extended.decision_criteria) && extended.decision_criteria.length) {
        map.a6 = {
          columns: ["Criterion", "Weight", "What Proves It"],
          rows: extended.decision_criteria.map((d: any) => [
            d.criterion || "—", d.weight || "—", d.what_proves_it || "—",
          ]),
        };
      }
      if (Array.isArray(extended.pain_architecture) && extended.pain_architecture.length) {
        map.a7 = extended.pain_architecture;
      }
      if (Array.isArray(extended.checklist) && extended.checklist.length) {
        map.a13 = {
          columns: ["Item", "Status"],
          rows: extended.checklist.map((c: any) => [c.item || "—", c.status || "—"]),
        };
      }
    }
  }
  const ext = extended || null;

  if (pillarId === "market" && ext) {
    if (ext.definition) {
      // Backwards compatible: support both new {size, scope} shape and legacy string
      const norm = (v: any, fallbackLabel: string) => {
        if (v && typeof v === "object") {
          return { label: fallbackLabel, value: v.size || "—", scope: v.scope || "" };
        }
        const str = typeof v === "string" ? v : "";
        const moneyMatch = str.match(/(?:[~<>]\s*)?\$\s?\d[\d.,]*\s?(?:[KMBT]|million|billion|trillion)?(?:\s?[–-]\s?\$?\d[\d.,]*\s?(?:[KMBT]|million|billion|trillion)?)?/i);
        return {
          label: fallbackLabel,
          value: moneyMatch ? moneyMatch[0].trim() : (str ? "—" : ""),
          scope: moneyMatch ? str.replace(moneyMatch[0], "").replace(/^[\s,—-]+|[\s,—-]+$/g, "") : str,
        };
      };
      map.m1 = {
        tam: norm(ext.definition.tam, "TAM"),
        sam: norm(ext.definition.sam, "SAM"),
        som: norm(ext.definition.som, "SOM"),
      };
    }
    if (Array.isArray(ext.competitors) && ext.competitors.length) {
      map.m2 = {
        columns: ["Competitor", "Positioning", "Strengths", "Weaknesses", "Threat"],
        rows: ext.competitors.map((c: any) => [
          c.name || "—", c.positioning || "—", c.strengths || c.strength || "—",
          c.weaknesses || c.weakness || "—", c.threat_level || "Medium",
        ]),
      };
    }
    if (Array.isArray(ext.advantages) && ext.advantages.length) {
      map.m4 = {
        columns: ["Advantage Type", "How Long to Copy", "What Protects It"],
        rows: ext.advantages.map((a: any) => [
          a.type || a.advantage || "—",
          a.how_long_to_copy || "—",
          a.what_protects_it || a.why_sustainable || "—",
        ]),
      };
    }
    if (Array.isArray(ext.forces) && ext.forces.length) {
      map.m5 = {
        columns: ["Force", "Intensity", "Trend", "Implication"],
        rows: ext.forces.map((f: any) => [
          f.force || "—", f.intensity || "—", f.trend || "Stable", f.implication || f.rationale || "—",
        ]),
      };
    }
    if (Array.isArray(ext.trends) && ext.trends.length) {
      // List can contain strings or objects
      map.m6 = ext.trends.map((t: any) =>
        typeof t === "string" ? t : `${t.trend} (${t.horizon || "Med"}, ${t.type || "Opp"}) — ${t.response || ""}`
      );
    }
    if (ext.timing) map.m7 = ext.timing;
    if (ext.white_space) map.m8 = ext.white_space;
  }

  if (pillarId === "financial" && ext) {
    if (Array.isArray(ext.model) && ext.model.length) {
      map.f1 = {
        columns: ["Field", "Value"],
        rows: ext.model.map((m: any) => [m.field || m.stream || "—", m.value || m.notes || m.type || "—"]),
      };
    }
    if (Array.isArray(ext.revenue_arch) && ext.revenue_arch.length) {
      map.f2 = {
        columns: ["Stream", "Volume", "Price", "Frequency", "Trend"],
        rows: ext.revenue_arch.map((r: any) => [
          r.stream || "—", r.volume || "—", r.price || "—",
          r.frequency || "—", r.trend || r.share_pct || "—",
        ]),
      };
    }
    if (Array.isArray(ext.costs) && ext.costs.length) {
      map.f3 = {
        columns: ["Category", "Fixed/Variable", "% of Revenue", "Trend"],
        rows: ext.costs.map((c: any) => [
          c.category || "—", c.fixed_or_variable || "—",
          c.pct_of_revenue || c.amount || "—", c.trend || c.notes || "—",
        ]),
      };
    }
    if (Array.isArray(ext.unit_economics) && ext.unit_economics.length) {
      map.f4 = ext.unit_economics.map((u: any) => ({
        name: u.metric || "—",
        value: u.value || "—",
        context: [u.benchmark, u.lever].filter(Boolean).join(" · ") || u.context || "",
      }));
    }
    if (Array.isArray(ext.profitability) && ext.profitability.length) {
      map.f5 = {
        columns: ["Margin Type", "Current %", "Target %", "Benchmark", "Improvement Path"],
        rows: ext.profitability.map((p: any) => [
          p.margin_type || p.stage || "—",
          p.current_pct || "—", p.target_pct || "—",
          p.benchmark || "—", p.improvement_path || p.margin_outlook || "—",
        ]),
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
        columns: ["Process", "Owner", "Outcome", "KPI"],
        rows: ext.core_processes.map((p: any) => [
          p.process || "—", p.owner || "—", p.outcome || "—", p.kpi || "—",
        ]),
      };
    }
    if (Array.isArray(ext.tech_stack) && ext.tech_stack.length) {
      map.o3 = ext.tech_stack.map((t: any) => ({
        category: t.category || "Other", tool: t.tool || "—", purpose: t.purpose || "",
      }));
    }
    if (Array.isArray(ext.vendors) && ext.vendors.length) {
      map.o4 = {
        columns: ["Vendor", "What They Supply", "Criticality", "Risk", "Alternative"],
        rows: ext.vendors.map((v: any) => [
          v.vendor || "—", v.supplies || v.role || "—",
          v.criticality || "3", v.risk || "—", v.alternative || "—",
        ]),
      };
    }
    if (Array.isArray(ext.quality) && ext.quality.length) map.o5 = ext.quality;
    if (Array.isArray(ext.kpis) && ext.kpis.length) {
      map.o6 = ext.kpis.map((k: any) => ({
        name: k.name || "—", value: k.target || "—", context: k.rationale || "",
      }));
    }
    if (Array.isArray(ext.risks) && ext.risks.length) {
      map.o7 = {
        columns: ["Risk", "Likelihood", "Impact", "Mitigation"],
        rows: ext.risks.map((r: any) => [
          r.risk || "—", r.likelihood || "—", r.impact || "Medium", r.mitigation || "—",
        ]),
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
        columns: ["Capability Domain", "Current (1-5)", "Required (1-5)", "Gap", "Plan"],
        rows: ext.capabilities.map((c: any) => [
          c.domain || c.capability || "—",
          c.current_strength || c.current_level || "—",
          c.required_strength || "—",
          c.gap || "—", c.plan || "—",
        ]),
      };
    }
    if (Array.isArray(ext.culture) && ext.culture.length) {
      map.pe4 = {
        columns: ["Field", "Value"],
        rows: ext.culture.map((c: any) => [c.field || c.value || "—", c.value || c.behavior || "—"]),
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
        columns: ["Bet", "Thesis", "Resources", "Success Signal", "Kill Signal"],
        rows: ext.bets.map((b: any) => [
          b.bet || "—", b.thesis || b.rationale || "—",
          b.resources || "—", b.success_signal || "—", b.kill_signal || "—",
        ]),
      };
    }
    if (Array.isArray(ext.stage_model) && ext.stage_model.length) {
      map.s4 = {
        columns: ["Field", "Value"],
        rows: ext.stage_model.map((s: any) => [s.field || s.dimension || "—", s.value || "—"]),
      };
    }
    if (Array.isArray(ext.resource_allocation) && ext.resource_allocation.length) {
      map.s5 = {
        columns: ["Resource", "Current %", "Optimal %", "Rebalancing Rationale"],
        rows: ext.resource_allocation.map((r: any) => [
          r.resource || r.area || "—",
          r.current_pct || r.share_pct || "—",
          r.optimal_pct || "—",
          r.rebalancing_rationale || r.rationale || "—",
        ]),
      };
    }
    // 6. Decision Framework (was Strategic Priorities)
    if (Array.isArray(ext.decision_framework) && ext.decision_framework.length) {
      map.s6 = {
        columns: ["Decision Type", "Criteria", "Authority", "Process"],
        rows: ext.decision_framework.map((d: any) => [
          d.decision_type || "—", d.criteria || "—", d.authority || "—", d.process || "—",
        ]),
      };
    }
    // 7. Risk Appetite & Tolerance (was Strategic Decisions Log)
    if (Array.isArray(ext.risk_appetite) && ext.risk_appetite.length) {
      map.s7 = {
        columns: ["Risk Domain", "Appetite", "Tolerance Threshold", "Mitigation"],
        rows: ext.risk_appetite.map((r: any) => [
          r.domain || "—", r.appetite || "Moderate", r.tolerance_threshold || "—", r.mitigation || "—",
        ]),
      };
    }
    // 8. Strategic Milestones (timeline)
    if (Array.isArray(ext.milestones) && ext.milestones.length) {
      map.s8 = ext.milestones.map((r: any) => ({
        milestone: r.milestone || "—", horizon: r.horizon || "—",
        outcome: r.outcome || "", owner: r.owner || "",
      }));
    } else if (Array.isArray(ext.roadmap) && ext.roadmap.length) {
      // Backward-compat with prior "roadmap" key
      map.s8 = ext.roadmap.map((r: any) => ({
        milestone: r.milestone || "—", horizon: r.horizon || "—", outcome: r.outcome || "",
      }));
    }
    if (ext.narrative) map.s9 = ext.narrative;
    if (Array.isArray(ext.scenarios) && ext.scenarios.length) {
      map.s10 = {
        columns: ["Scenario", "Probability", "Key Assumption", "Response", "Early Warnings"],
        rows: ext.scenarios.map((s: any) => [
          s.scenario || "—", s.probability || "—",
          s.key_assumption || s.trigger || "—",
          s.response || "—", s.early_warnings || "—",
        ]),
      };
    }
  }

  return map;
}
