import { useState } from "react";
import { useActionGate } from "@/hooks/useActionGate";
import { Users, Plus, Trash2, ChevronRight, Lock, Package, Link2, Globe, ArrowRight, Sparkles, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEFAULT_AUDIENCE } from "@/components/database/AudienceDetailView";
import { AudienceDetailView } from "@/components/database/AudienceDetailView";
import { motion, AnimatePresence } from "framer-motion";
import { useBusinessDNA, AudienceEntry } from "@/components/database/BusinessDNAContext";
import { ConnectionDialog } from "@/components/database/ConnectionDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function AudienceListView({ activeBrandId }: { activeBrandId: string }) {
  const { userName, products, audiences, setAudiences, deleteAudience } = useBusinessDNA();
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [connectAudienceId, setConnectAudienceId] = useState<string | null>(null);
  const { toast } = useToast();
  const { checkCanUseAction } = useActionGate();
  // Show all audiences, not just connected ones
  const brandProductIds = products.filter(p => p.brandId === activeBrandId).map(p => p.id);
  const brandAudiences = audiences;
  const selectedAudience = brandAudiences.find(a => a.id === selectedAudienceId);
  

  const handleExtract = async () => {
    if (!url.trim()) return;
    if (!checkCanUseAction()) return;
    setIsLoading(true);
    setStatus("Scraping page for audience data...");

    try {
      const { data, error } = await supabase.functions.invoke("scrape-product", {
        body: { url: url.trim() },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to extract audience data");

      setStatus("Creating audience...");

      const now = new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
      const audienceId = `audience-${Date.now()}`;
      const a = data.extracted?.audience || {};

      const newAudience: AudienceEntry = {
        ...DEFAULT_AUDIENCE,
        id: audienceId,
        name: a.name || "Imported Audience",
        description: a.description || "",
        buyingTriggers: a.buyingTriggers || [],
        useCaseRequirements: a.useCaseRequirements || [],
        keySuccessIndicators: a.keySuccessIndicators || [],
        additionalCharacteristics: a.additionalCharacteristics || "",
        positioningStatement: a.positioningStatement || "",
        valuePropositions: a.valuePropositions || [],
        engagementTriggers: a.engagementTriggers || [],
        attentionHooks: a.attentionHooks || [],
        commonObjections: a.commonObjections?.length
          ? a.commonObjections.map((o: any) => ({ objection: o.objection || "", response: o.response || "" }))
          : [],
        proofPoints: a.proofPoints?.length
          ? a.proofPoints.map((pp: any) => ({ category: pp.category || "", items: pp.items || [] }))
          : [],
        dosAndDonts: {
          dos: a.dosAndDonts?.dos || [],
          donts: a.dosAndDonts?.donts || [],
        },
        powerPhrases: a.powerPhrases || [],
        powerWords: a.powerWords || [],
        technicalLevel: a.technicalLevel || "",
        refinementChecklist: a.refinementChecklist || [],
        lastUpdated: now,
        productIds: brandProductIds,
        avatarUrl: a.avatarUrl || undefined,
      };
      setAudiences(prev => [...prev, newAudience]);

      setIsDone(true);
      setStatus("Audience imported!");
      toast({
        title: "Audience imported",
        description: `${a.name || "Audience"} has been added.`,
      });

      setTimeout(() => {
        setIsCreating(false);
        setUrl("");
        setStatus("");
        setIsDone(false);
      }, 1500);
    } catch (err: any) {
      console.error("Scrape error:", err);
      toast({
        title: "Import failed",
        description: err.message || "Could not extract audience data.",
        variant: "destructive",
      });
      setStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteAudience(id);
    if (selectedAudienceId === id) setSelectedAudienceId(null);
  };

  const handleSave = (updated: AudienceEntry) => {
    setAudiences(prev => prev.map(a => a.id === updated.id ? updated : a));
  };




  if (selectedAudience) {
    return (
      <div className="-mx-6 pt-0">
        <AudienceDetailView
          audience={selectedAudience}
          onBack={() => setSelectedAudienceId(null)}
          onSave={handleSave}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Audiences</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{brandAudiences.length} audience{brandAudiences.length !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? <span>Cancel</span> : <><Plus className="h-3.5 w-3.5" /> New Audience</>}
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Product / Landing Page URL</label>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Globe className="h-4 w-4 text-primary/70" />
                </div>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yourstore.com/product-page" className="h-9 text-sm flex-1" disabled={isLoading} onKeyDown={(e) => e.key === "Enter" && handleExtract()} />
                <Button size="sm" className="h-9 gap-1.5" onClick={handleExtract} disabled={!url.trim() || isLoading}>
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isDone ? <Check className="h-3.5 w-3.5" /> : <><Sparkles className="h-3.5 w-3.5" /> Extract</>}
                </Button>
              </div>
              {status && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isDone && <Check className="h-3 w-3 text-primary" />}
                  {status}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {brandAudiences.length > 0 ? (
        <div className="space-y-2">
          {brandAudiences.map((audience) => {
            const connectedProducts = products.filter(p => audience.productIds?.includes(p.id));
            return (
              <div key={audience.id} className="group rounded-xl border border-border/40 bg-card/50 hover:bg-card transition-colors cursor-pointer">
                <div className="flex items-center gap-3 px-4 py-3.5" onClick={() => setSelectedAudienceId(audience.id)}>
                  <div className="h-10 w-10 rounded-lg bg-muted/50 border border-border/40 flex items-center justify-center shrink-0 overflow-hidden">
                    {audience.avatarUrl ? (
                      <img src={audience.avatarUrl} alt={audience.name} className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-5 w-5 text-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{audience.name}</p>
                    <p className="text-xs text-muted-foreground">Audience Segment · Updated {audience.lastUpdated}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70"><Lock className="h-2.5 w-2.5" />Private</span>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground/70">Last updated: {audience.lastUpdated}</span>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground/70">Added by: {userName}</span>
                      {connectedProducts.length > 0 && (
                        <>
                          <span className="text-[10px] text-muted-foreground/40">·</span>
                          <span className="text-[10px] text-primary">Connected</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); setConnectAudienceId(audience.id); }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all" title="Manage connections">
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(audience.id); }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3"><Users className="h-6 w-6 text-foreground" /></div>
          <p className="text-sm text-muted-foreground">No audiences yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create your first audience segment to get started</p>
        </div>
      )}

      {/* Connection Dialog */}
      <ConnectionDialog
        open={!!connectAudienceId}
        onOpenChange={(open) => { if (!open) setConnectAudienceId(null); }}
        focusEntityId={connectAudienceId}
      />
    </div>
  );
}
