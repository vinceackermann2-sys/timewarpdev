import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_SAFETY_SETTINGS, type SafetySettings } from "@/components/database/BusinessDNAContext";
import { SafetyView } from "@/components/database/SafetyView";

/**
 * AccountSafetyView — account-wide safety settings.
 *
 * Loads/saves to public.user_safety_settings (one row per user). These
 * guardrails apply across every AI in the app (extension agent, employees,
 * agents) and act as the *floor*: any guardrail enabled here is enforced
 * regardless of per-business overrides.
 */
type DbRow = {
  user_id: string;
  integrity_enabled: boolean;
  focus_enabled: boolean;
  prompt_injection_enabled: boolean;
  moderation_categories: SafetySettings["moderationCategories"];
  custom_guardrails: SafetySettings["customGuardrails"];
};

function rowToSafety(row: DbRow): SafetySettings {
  return {
    integrityEnabled: row.integrity_enabled,
    focusEnabled: row.focus_enabled,
    promptInjectionEnabled: row.prompt_injection_enabled,
    moderationCategories: row.moderation_categories || DEFAULT_SAFETY_SETTINGS.moderationCategories,
    customGuardrails: Array.isArray(row.custom_guardrails) ? row.custom_guardrails : [],
  };
}

function safetyToRow(safety: SafetySettings, userId: string) {
  return {
    user_id: userId,
    integrity_enabled: safety.integrityEnabled !== false,
    focus_enabled: !!safety.focusEnabled,
    prompt_injection_enabled: !!safety.promptInjectionEnabled,
    moderation_categories: safety.moderationCategories,
    custom_guardrails: safety.customGuardrails,
  };
}

export function AccountSafetyView() {
  const { user } = useAuth();
  const [safety, setSafety] = useState<SafetySettings>(DEFAULT_SAFETY_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_safety_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[AccountSafetyView] load failed", error);
        toast.error("Could not load safety settings");
      }
      setSafety(data ? rowToSafety(data as DbRow) : DEFAULT_SAFETY_SETTINGS);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleChange = async (patch: Partial<SafetySettings>) => {
    if (!user?.id) return;
    const next: SafetySettings = { ...safety, ...patch };
    setSafety(next); // optimistic
    const { error } = await supabase
      .from("user_safety_settings")
      .upsert(safetyToRow(next, user.id), { onConflict: "user_id" });
    if (error) {
      console.error("[AccountSafetyView] save failed", error);
      toast.error("Could not save safety settings");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading safety settings…
      </div>
    );
  }

  return (
    <SafetyView
      safety={safety}
      onChange={handleChange}
      description="Account-wide guardrails. These apply to every AI in the app — assistants, employees, and agents — across all your businesses."
    />
  );
}
