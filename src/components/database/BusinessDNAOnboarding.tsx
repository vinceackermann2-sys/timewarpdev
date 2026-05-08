import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, WandSparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeWithTimeout";
import { useBusinessDNA, BrandEntry, ProductEntry, AudienceEntry } from "./BusinessDNAContext";
import { DEFAULT_PRODUCT } from "./ProductDetailView";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { OnboardingEnrichmentInputs } from "./aiceo/OnboardingEnrichmentInputs";

interface BusinessDNAOnboardingProps {
  productUrl?: string | null;
  onComplete: (agentName: string, brandId?: string) => void;
  isAddBusiness?: boolean;
  activeBrandId?: string | null;
  onBack?: () => void;
}

type Step = 0 | 1 | 2 | 3;

export function BusinessDNAOnboarding({ onComplete, isAddBusiness, activeBrandId }: BusinessDNAOnboardingProps) {
  const [step, setStep] = useState<Step>(0);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("general");
  const [businessDescription, setBusinessDescription] = useState("");
  const [fileCount, setFileCount] = useState(0);
  const [integrationCount, setIntegrationCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [createdBrandId, setCreatedBrandId] = useState<string | undefined>();

  let contextAvailable = false;
  let reloadData: () => Promise<{ brands: BrandEntry[]; products: ProductEntry[]; audiences: AudienceEntry[] }> = async () => ({ brands: [], products: [], audiences: [] });
  try { const ctx = useBusinessDNA(); reloadData = ctx.reloadData; contextAvailable = true; } catch {}

  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    (async () => {
      setIsSaving(true);
      const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      const brandId = isAddBusiness && activeBrandId ? activeBrandId : `brand-${Date.now()}`;
      const brandData: BrandEntry = { id: brandId, name: businessName.trim(), category: businessType, businessType, lastUpdated: now, logoUrls: [], selectedLogo: 0 } as BrandEntry;
      const productsData: ProductEntry[] = [{ ...DEFAULT_PRODUCT, id: `product-${Date.now()}-0`, name: `${businessName.trim()} Core Offer`, category: businessType, description: businessDescription.trim(), brandId, lastUpdated: now }];
      const audiencesData: AudienceEntry[] = [];
      const { data, error } = await supabase.functions.invoke("save-onboarding", { body: { brandData, productsData, audiencesData, brandName: businessName.trim() } });
      if (cancelled) return;
      if (error || !data?.success) { setIsSaving(false); return; }
      if (contextAvailable) await reloadData();
      setCreatedBrandId(brandId);
      await invokeEdgeFunction("enrich-pillars", { brandId, brandRowId: data.brandRowId, workspaceId: data.workspaceId || null }).catch(() => {});
      setIsSaving(false);
      setStep(3);
    })();
    return () => { cancelled = true; };
  }, [step, businessName, businessType, businessDescription, contextAvailable, reloadData, isAddBusiness, activeBrandId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8 px-4 bg-background">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="basics" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl space-y-4">
            <h1 className="text-3xl font-bold">Business basics</h1>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            <select className="w-full border rounded-lg px-3 py-2" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
              <option value="general">General</option><option value="saas">SaaS</option><option value="ecommerce">Ecommerce</option><option value="agency">Agency</option>
            </select>
            <textarea className="w-full border rounded-lg px-3 py-2" rows={4} placeholder="Brief description (optional)" value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} />
            <button disabled={!businessName.trim()} onClick={() => setStep(1)} className="bg-primary text-white px-5 py-2 rounded-xl disabled:opacity-50">Continue <ArrowRight className="inline w-4 h-4" /></button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="connect" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl">
            <OnboardingEnrichmentInputs onContinue={({ fileCount, integrationCount }) => { setFileCount(fileCount); setIntegrationCount(integrationCount); setStep(2); }} onSkip={() => setStep(2)} />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="save" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl text-center space-y-3">
            <h2 className="text-2xl font-bold">Confirm & save</h2>
            <p className="text-muted-foreground">Forging your Business DNA from real data...</p>
            <p className="text-sm text-muted-foreground">{fileCount} files, {integrationCount} integrations connected</p>
            {isSaving && <Loader2 className="w-5 h-5 animate-spin mx-auto" />}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="name" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl text-center space-y-4">
            <BusinessBrainOrb size={100} className="mx-auto" />
            <h2 className="text-2xl font-bold">Name your agent</h2>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"><WandSparkles className="w-5 h-5 text-primary" /></div>
              <input className="flex-1 border rounded-lg px-3 py-2" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Agent name" />
              <button disabled={!agentName.trim()} onClick={() => onComplete(agentName.trim(), createdBrandId)} className="bg-primary text-white px-4 py-2 rounded-xl disabled:opacity-50">Continue <ArrowRight className="inline w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
