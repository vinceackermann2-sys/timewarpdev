/**
 * AudienceConfirmPhase — Phase 2 of onboarding.
 * Shows auto-suggested audience(s) derived from scraped product data.
 * User can edit, add, or skip.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Users, Pencil, Plus, Trash2, Check } from "lucide-react";

export interface AudienceDraft {
  name: string;
  description: string;
  buyingTriggers: string[];
  valuePropositions: string[];
}

interface AudienceConfirmPhaseProps {
  /** Pre-filled from scrape-product audience extraction */
  suggested: AudienceDraft[];
  productName: string;
  onComplete: (audiences: AudienceDraft[]) => void;
}

export function AudienceConfirmPhase({ suggested, productName, onComplete }: AudienceConfirmPhaseProps) {
  const [audiences, setAudiences] = useState<AudienceDraft[]>(
    suggested.length > 0
      ? suggested
      : [{ name: "", description: "", buyingTriggers: [], valuePropositions: [] }],
  );
  const [editingIdx, setEditingIdx] = useState<number | null>(suggested.length === 0 ? 0 : null);

  const updateAudience = (idx: number, patch: Partial<AudienceDraft>) => {
    setAudiences((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const removeAudience = (idx: number) => {
    setAudiences((prev) => prev.filter((_, i) => i !== idx));
    setEditingIdx(null);
  };

  const addAudience = () => {
    setAudiences((prev) => [...prev, { name: "", description: "", buyingTriggers: [], valuePropositions: [] }]);
    setEditingIdx(audiences.length);
  };

  const hasAtLeastOne = audiences.some((a) => a.name.trim() || a.description.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-foreground">Who buys {productName}?</p>
            <p className="text-[13px] text-muted-foreground">
              {suggested.length > 0
                ? "We found these audience segments from your data. Confirm, edit, or add more."
                : "Describe your ideal customer — who are they and what drives them to buy?"}
            </p>
          </div>
        </div>
      </div>

      {/* Audience cards */}
      <div className="px-5 py-4 space-y-3">
        {audiences.map((aud, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border/50 bg-background p-4 space-y-2"
          >
            {editingIdx === idx ? (
              <div className="space-y-3">
                <input
                  type="text"
                  className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="Audience name (e.g. 'SMB Marketing Managers')"
                  value={aud.name}
                  onChange={(e) => updateAudience(idx, { name: e.target.value })}
                  autoFocus
                />
                <textarea
                  className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                  rows={3}
                  placeholder="Who are they? What's their biggest pain? What outcome do they want?"
                  value={aud.description}
                  onChange={(e) => updateAudience(idx, { description: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingIdx(null)}
                    className="text-[13px] font-medium text-primary flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Done
                  </button>
                  {audiences.length > 1 && (
                    <button
                      onClick={() => removeAudience(idx)}
                      className="text-[13px] text-muted-foreground hover:text-destructive flex items-center gap-1 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-foreground">
                    {aud.name || <span className="text-muted-foreground italic">Untitled audience</span>}
                  </p>
                  {aud.description && (
                    <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">{aud.description}</p>
                  )}
                  {aud.buyingTriggers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {aud.buyingTriggers.slice(0, 3).map((t, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setEditingIdx(idx)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {audiences.length < 3 && (
          <button
            onClick={addAudience}
            className="w-full py-2.5 rounded-xl border border-dashed border-border/60 text-[13px] text-muted-foreground hover:text-foreground hover:border-border flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add another segment
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/60 bg-muted/30 flex items-center justify-end">
        <button
          onClick={() => onComplete(audiences.filter((a) => a.name.trim() || a.description.trim()))}
          disabled={!hasAtLeastOne}
          className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white text-[14px] font-medium px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
