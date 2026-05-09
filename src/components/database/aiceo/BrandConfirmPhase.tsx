/**
 * BrandConfirmPhase — Phase 3 of onboarding.
 * Auto-derived brand identity from URL scrape. User confirms or tweaks.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Palette, Pencil, Check } from "lucide-react";

export interface BrandDraft {
  name: string;
  category: string;
  businessType: string;
  colors?: { primary: string; secondary: string; background: string; text: string };
  typography?: { fontFamily: string; fontWeight: string };
  logoUrls: string[];
  visualIdentity?: any;
}

interface BrandConfirmPhaseProps {
  brand: BrandDraft;
  onComplete: (brand: BrandDraft) => void;
}

export function BrandConfirmPhase({ brand: initial, onComplete }: BrandConfirmPhaseProps) {
  const [brand, setBrand] = useState<BrandDraft>(initial);
  const [editing, setEditing] = useState(false);

  const colorEntries = brand.colors
    ? [
        { label: "Primary", value: brand.colors.primary },
        { label: "Secondary", value: brand.colors.secondary },
        { label: "Background", value: brand.colors.background },
        { label: "Text", value: brand.colors.text },
      ].filter((c) => c.value)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-foreground">Your brand identity</p>
            <p className="text-[13px] text-muted-foreground">
              {initial.colors ? "Extracted from your website. Confirm or adjust." : "We'll use these basics. You can refine later in Business DNA."}
            </p>
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {editing ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Name + category */}
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Business name</label>
            {editing ? (
              <input
                className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background outline-none"
                value={brand.name}
                onChange={(e) => setBrand((b) => ({ ...b, name: e.target.value }))}
              />
            ) : (
              <p className="text-[14px] font-medium text-foreground">{brand.name || "—"}</p>
            )}
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Type</label>
            {editing ? (
              <select
                className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background outline-none"
                value={brand.businessType}
                onChange={(e) => setBrand((b) => ({ ...b, businessType: e.target.value }))}
              >
                <option value="general">General</option>
                <option value="saas">SaaS</option>
                <option value="ecommerce">Ecommerce</option>
                <option value="agency">Agency</option>
                <option value="consulting">Consulting</option>
                <option value="creator">Creator</option>
                <option value="enterprise_b2b">Enterprise B2B</option>
                <option value="marketplace">Marketplace</option>
                <option value="local">Local Business</option>
              </select>
            ) : (
              <p className="text-[14px] text-foreground capitalize">{brand.businessType || "general"}</p>
            )}
          </div>
        </div>

        {/* Colors */}
        {colorEntries.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Colors</label>
            <div className="flex gap-2">
              {colorEntries.map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg border border-border/60 shadow-sm"
                    style={{ backgroundColor: c.value }}
                  />
                  <span className="text-[12px] text-muted-foreground">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logo preview */}
        {brand.logoUrls.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Logo</label>
            <div className="flex gap-2">
              {brand.logoUrls.slice(0, 3).map((url, i) => (
                <div key={i} className="w-14 h-14 rounded-lg border border-border/60 bg-background p-1.5 overflow-hidden">
                  <img src={url} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Font */}
        {brand.typography?.fontFamily && (
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Typography</label>
            <p className="text-[14px] text-foreground">{brand.typography.fontFamily}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/60 bg-muted/30 flex items-center justify-end">
        <button
          onClick={() => onComplete(brand)}
          disabled={!brand.name.trim()}
          className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white text-[14px] font-medium px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
        >
          Looks good <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
