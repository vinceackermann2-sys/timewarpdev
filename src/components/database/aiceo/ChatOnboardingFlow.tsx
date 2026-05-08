import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, WandSparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeWithTimeout";
import { useBusinessDNA, type BrandEntry, type ProductEntry, type AudienceEntry } from "@/components/database/BusinessDNAContext";
import { DEFAULT_PRODUCT } from "@/components/database/ProductDetailView";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import BrandOrbLogo from "@/components/ui/brand-orb-logo";
import { cn } from "@/lib/utils";
import { OnboardingEnrichmentInputs } from "./OnboardingEnrichmentInputs";
import { ForgingPanel, type ForgingStage } from "./ForgingPanel";

type Phase = "basics" | "connect" | "forging" | "naming" | "done";
interface ChatOnboardingFlowProps { initialUrl?: string | null; onComplete: (agentName: string, brandId: string, transcript: { role: "user" | "assistant"; content: string }[]) => void; }
function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export function ChatOnboardingFlow({ onComplete }: ChatOnboardingFlowProps) {
  const [phase, setPhase] = useState<Phase>("basics");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("general");
  const [businessDescription, setBusinessDescription] = useState("");
  const [enrichInputsSummary, setEnrichInputsSummary] = useState({ fileCount: 0, integrationCount: 0 });
  const [forgingStage, setForgingStage] = useState<ForgingStage>("ingesting");
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [createdBrandId, setCreatedBrandId] = useState<string | null>(null);
  const [createdBrandRowId, setCreatedBrandRowId] = useState<string | null>(null);
  const [createdBrandName, setCreatedBrandName] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  let contextAvailable = false;
  let reloadData: () => Promise<{ brands: BrandEntry[]; products: ProductEntry[]; audiences: AudienceEntry[] }> = async () => ({ brands: [], products: [], audiences: [] });
  let activeWorkspaceId: string | null = null;
  let setBrands: React.Dispatch<React.SetStateAction<BrandEntry[]>> = () => {};
  try { const ctx = useBusinessDNA(); reloadData = ctx.reloadData; activeWorkspaceId = ctx.activeWorkspaceId; setBrands = ctx.setBrands; contextAvailable = true; } catch {}

  useEffect(() => {
    if (phase !== "forging") return;
    let cancelled = false;
    setPersistenceError(null);
    (async () => {
      const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      const brandId = `brand-${Date.now()}`;
      const brandName = businessName.trim() || "My Business";
      setForgingStage("ingesting");
      if (enrichInputsSummary.fileCount > 0 || enrichInputsSummary.integrationCount > 0) await sleep(300);
      setForgingStage("enriching"); await sleep(280); setForgingStage("synthesizing");
      const newBrand: BrandEntry = { id: brandId, name: brandName, category: businessType, businessType, lastUpdated: now, logoUrls: [], selectedLogo: 0 } as BrandEntry;
      const newProducts: ProductEntry[] = [{ ...DEFAULT_PRODUCT, id: `product-${Date.now()}-0`, name: `${brandName} Core Offer`, category: businessType, description: businessDescription.trim(), brandId, lastUpdated: now }];
      const newAudiences: AudienceEntry[] = [];
      const { data: saveData, error: saveError } = await supabase.functions.invoke("save-onboarding", { body: { brandData: newBrand, productsData: newProducts, audiencesData: newAudiences, workspaceId: activeWorkspaceId || localStorage.getItem("preferred_workspace_id") || undefined, brandName } });
      if (cancelled) return;
      if (saveError || !saveData?.success) { setPersistenceError(saveData?.error || "Failed to save brand. Please try again."); return; }
      setForgingStage("saving"); await sleep(180);
      if (saveData.workspaceId) localStorage.setItem("preferred_workspace_id", saveData.workspaceId);
      const savedBrandRowId = typeof saveData.brandRowId === "string" ? saveData.brandRowId : null;
      let reloadedBrands: any[] = [];
      if (contextAvailable) { const result = await reloadData(); reloadedBrands = result.brands; }
      setCreatedBrandId(brandId); setCreatedBrandRowId(savedBrandRowId || reloadedBrands.find((br: any) => br.id === brandId)?._rowId || null); setCreatedBrandName(newBrand.name);
      if (contextAvailable) {
        let rowId: string | undefined = savedBrandRowId || undefined;
        if (!rowId) { for (let attempt = 0; attempt < 3; attempt++) { const brandRow = reloadedBrands.find((bb: any) => bb.id === brandId); rowId = (brandRow as any)?._rowId; if (rowId) break; await new Promise(r => setTimeout(r, 1000)); const retryResult = await reloadData(); reloadedBrands = retryResult.brands; } }
        if (rowId) { invokeEdgeFunction("enrich-pillars", { brandId, brandRowId: rowId, workspaceId: saveData.workspaceId || null }).catch(() => {}); }
      }
      setForgingStage("done"); setTimeout(() => { if (!cancelled) setPhase("naming"); }, 400);
    })();
    return () => { cancelled = true; };
  }, [phase, businessName, businessType, businessDescription, enrichInputsSummary, activeWorkspaceId, contextAvailable, reloadData]);

  const handleFinishNaming = useCallback(async () => {
    const trimmed = agentName.trim();
    if (!trimmed || !createdBrandId) return;
    setIsCompleting(true);
    try {
      const targetRowId = createdBrandRowId || createdBrandId;
      const { data: existing } = await supabase.from("user_business_data").select("content").eq("id", targetRowId).maybeSingle();
      const brandData = JSON.parse((existing as any)?.content || "{}");
      brandData.agentName = trimmed;
      await supabase.from("user_business_data").update({ content: JSON.stringify(brandData) }).eq("id", targetRowId);
      setBrands(prev => prev.map(b => ((b as any)._rowId === targetRowId || b.id === createdBrandId) ? { ...b, agentName: trimmed } : b));
    } catch {}
    setIsCompleting(false); setPhase("done");
    onComplete(trimmed, createdBrandId, [
      { role: "assistant", content: "What's your business called?" },
      { role: "user", content: businessName },
      { role: "assistant", content: `Type: ${businessType}. Description: ${businessDescription || "Not provided"}` },
      { role: "assistant", content: "Now let's connect your real data." },
      { role: "assistant", content: "Forging your Business DNA from real data and manual inputs." },
    ]);
  }, [agentName, createdBrandId, createdBrandRowId, setBrands, onComplete, businessName, businessType, businessDescription]);

  return <div className="h-full w-full overflow-y-auto bg-background"><div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6"><AssistantBubble><p className="text-[15px] font-semibold text-foreground">Welcome</p><p className="text-[14px] text-foreground">Let's ground your Business DNA in real data.</p></AssistantBubble>{phase === "basics" && <UserActionCard><div className="space-y-3 border rounded-2xl p-4 bg-card"><input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} /><select className="w-full border rounded-lg px-3 py-2 text-sm" value={businessType} onChange={(e) => setBusinessType(e.target.value)}><option value="general">General</option><option value="saas">SaaS</option><option value="ecommerce">Ecommerce</option><option value="agency">Agency</option></select><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Brief description (optional)" value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} /><button onClick={() => setPhase("connect")} disabled={!businessName.trim()} className="bg-primary text-white px-4 py-2 rounded-xl text-sm disabled:opacity-50">Continue <ArrowRight className="inline w-4 h-4" /></button></div></UserActionCard>}{phase === "connect" && <UserActionCard wide><OnboardingEnrichmentInputs onContinue={(summary) => { setEnrichInputsSummary(summary); setPhase("forging"); }} onSkip={() => { setEnrichInputsSummary({ fileCount: 0, integrationCount: 0 }); setPhase("forging"); }} /></UserActionCard>}{phase === "forging" && <AssistantBubble><ForgingPanel stage={forgingStage} fileCount={enrichInputsSummary.fileCount} integrationCount={enrichInputsSummary.integrationCount} url={businessName} error={persistenceError} onRetry={() => setPhase("forging")} /></AssistantBubble>}{phase === "naming" && <><AssistantBubble><div className="flex items-center gap-3 mb-2"><BrandOrbLogo logoUrl={null} brandName={createdBrandName} size={36} /><p className="text-[14px] text-foreground">Done. What should I call your AI agent?</p></div></AssistantBubble><UserActionCard><AnimatePresence mode="wait">{!isCompleting ? <motion.div key="name-input" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-muted border-[1.5px] border-primary rounded-2xl p-2 shadow-sm"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-1"><WandSparkles className="w-5 h-5 text-primary" strokeWidth={2} /></div><input type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && agentName.trim()) handleFinishNaming(); }} className="flex-1 bg-transparent border-none outline-none text-foreground text-[16px] sm:text-[15px]" placeholder="e.g. Nova" autoFocus /><button onClick={handleFinishNaming} disabled={!agentName.trim()} className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 text-[15px]">Continue<ArrowRight className="w-4 h-4" /></button></div></motion.div> : <motion.div key="going" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-primary text-sm py-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving {agentName.trim()}…</motion.div>}</AnimatePresence></UserActionCard></>}</div></div>;
}

function AssistantBubble({ children }: { children: React.ReactNode }) { return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex items-start gap-3"><div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"><BusinessBrainOrb size={32} /></div><div className="flex-1 min-w-0 bg-card border border-border rounded-2xl rounded-tl-md p-4 shadow-sm">{children}</div></motion.div>; }
function UserActionCard({ children, wide }: { children: React.ReactNode; wide?: boolean }) { return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }} className={cn("ml-11", wide ? "" : "")}>{children}</motion.div>; }
