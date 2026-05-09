/**
 * ProductInputPhase — Phase 1 of onboarding. URL-only.
 * User pastes their website and we scrape product/brand/audience data.
 */
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Globe, Loader2, Sparkles, ShoppingCart, DollarSign, Fingerprint, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface ExtractedProduct {
  name: string;
  category: string;
  businessType: string;
  description: string;
  features: string[];
  benefits: string[];
  painPoints: string[];
  useCases: string[];
  uniqueSellingPoints: string[];
  offers: any[];
  images: any[];
  brandData?: any;
  audienceData?: any;
  sourceUrl?: string;
  rawProduct?: any;
  rawAudience?: any;
  rawBrand?: any;
}

interface ProductInputPhaseProps {
  onComplete: (url: string) => void;
}

export function ProductInputPhase({ onComplete }: ProductInputPhaseProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleUrlScrape = useCallback(() => {
    if (!url.trim()) return;
    setError(null);
    try {
      new URL(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`);
      onComplete(url.trim());
    } catch {
      setError("Please enter a valid URL.");
    }
  }, [url, onComplete]);

  const chips = ["Products & Pricing", "Brand Identity", "Purchasing Triggers", "Social Proof"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-3xl border border-border/40 bg-card shadow-lg overflow-hidden"
    >
      <div className="px-7 py-6 border-b border-border/40 bg-gradient-to-r from-primary/[0.06] via-primary/[0.03] to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-[17px] font-bold text-foreground tracking-tight">Connect your product</p>
            <p className="text-[14px] text-muted-foreground mt-0.5">
              Enter your product URL.
            </p>
          </div>
        </div>
      </div>

      <div className="px-7 py-6 space-y-4">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <Globe className="w-5 h-5 text-muted-foreground/60" />
          </div>
          <input
            type="text"
            className="w-full border border-border/50 rounded-2xl pl-12 pr-5 py-4 text-[15px] bg-background/80 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all shadow-sm"
            placeholder="https://yourwebsite.com/product"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && url.trim()) handleUrlScrape(); }}
            autoFocus
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {chips.map((label, i) => (
            <motion.span
              key={label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/[0.06] border border-primary/10 text-[12px] font-medium text-primary/80"
            >
              <ShoppingCart className="w-3 h-3" />{label}
            </motion.span>
          ))}
        </div>
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13px] text-destructive bg-destructive/10 border border-destructive/15 rounded-xl px-4 py-3">
            {error}
          </motion.p>
        )}
      </div>

      <div className="px-7 py-4 border-t border-border/40 bg-muted/20 flex items-center justify-end">
        <button
          onClick={handleUrlScrape}
          disabled={!url.trim()}
          className="bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white text-[15px] font-semibold px-7 py-3 rounded-2xl flex items-center gap-2.5 transition-all shadow-sm hover:shadow-md"
        >
          <>Analyze <ArrowRight className="w-4 h-4" /></>
        </button>
      </div>
    </motion.div>
  );
}
