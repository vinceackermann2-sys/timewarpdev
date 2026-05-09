import { useBusinessDNA, DEFAULT_SAFETY_SETTINGS, type SafetySettings } from "@/components/database/BusinessDNAContext";
import { SafetyView } from "@/components/database/SafetyView";

/**
 * SettingsView — per-business safety settings (lives inside the BusinessDNA UI).
 *
 * For account-wide safety (applies across every AI in the app) see
 * AccountSafetyView under the main Settings menu.
 */
export function SettingsView({ activeBrandId }: { activeBrandId: string }) {
  const { brands, setBrands } = useBusinessDNA();
  const brand = brands.find((b) => b.id === activeBrandId);
  const safety: SafetySettings = brand?.safetySettings || DEFAULT_SAFETY_SETTINGS;

  if (!brand) return null;

  const updateSafety = (patch: Partial<SafetySettings>) => {
    setBrands((prev) =>
      prev.map((b) =>
        b.id === activeBrandId ? { ...b, safetySettings: { ...safety, ...patch } } : b,
      ),
    );
  };

  return (
    <SafetyView
      safety={safety}
      onChange={updateSafety}
      description="Per-business guardrails for this brand. Account-wide safety in Settings is also applied."
    />
  );
}
