// Shared helper: load account-wide safety settings and merge with per-brand
// safety. Account-wide settings act as the *floor* — any guardrail enabled at
// the account level applies regardless of brand-level overrides. Custom
// guardrails are concatenated.

type Safety = {
  integrityEnabled?: boolean;
  focusEnabled?: boolean;
  promptInjectionEnabled?: boolean;
  moderationCategories?: Record<string, { enabled: boolean; level: "Low" | "Medium" | "High" }>;
  customGuardrails?: { name: string; prompt: string }[];
};

export async function loadAccountSafetySettings(supabase: any, userId: string): Promise<Safety | null> {
  if (!userId) return null;
  const { data } = await supabase
    .from("user_safety_settings")
    .select("integrity_enabled, focus_enabled, prompt_injection_enabled, moderation_categories, custom_guardrails")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    integrityEnabled: data.integrity_enabled,
    focusEnabled: data.focus_enabled,
    promptInjectionEnabled: data.prompt_injection_enabled,
    moderationCategories: data.moderation_categories || undefined,
    customGuardrails: Array.isArray(data.custom_guardrails) ? data.custom_guardrails : [],
  };
}

const LEVEL_RANK: Record<string, number> = { Low: 1, Medium: 2, High: 3 };

export function mergeSafetySettings(brand: Safety | null | undefined, account: Safety | null | undefined): Safety {
  const a = account || {};
  const b = brand || {};
  // Boolean toggles: enabled if EITHER source enables them (account is the floor).
  const integrityEnabled = (a.integrityEnabled !== false) || (b.integrityEnabled !== false);
  const focusEnabled = !!a.focusEnabled || !!b.focusEnabled;
  const promptInjectionEnabled = !!a.promptInjectionEnabled || !!b.promptInjectionEnabled;

  // Moderation categories: enabled if either is enabled; level = max severity.
  const cats = new Set<string>([
    ...Object.keys(a.moderationCategories || {}),
    ...Object.keys(b.moderationCategories || {}),
  ]);
  const moderationCategories: Safety["moderationCategories"] = {};
  for (const cat of cats) {
    const av = a.moderationCategories?.[cat];
    const bv = b.moderationCategories?.[cat];
    const enabled = !!av?.enabled || !!bv?.enabled;
    const aLvl = av?.level ?? "High";
    const bLvl = bv?.level ?? "High";
    const level = (LEVEL_RANK[aLvl] >= LEVEL_RANK[bLvl] ? aLvl : bLvl) as "Low" | "Medium" | "High";
    moderationCategories![cat] = { enabled, level };
  }

  // Custom guardrails: concatenate, dedupe by name+prompt.
  const seen = new Set<string>();
  const customGuardrails: { name: string; prompt: string }[] = [];
  for (const g of [...(a.customGuardrails || []), ...(b.customGuardrails || [])]) {
    const key = `${g.name}::${g.prompt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    customGuardrails.push(g);
  }

  return { integrityEnabled, focusEnabled, promptInjectionEnabled, moderationCategories, customGuardrails };
}
