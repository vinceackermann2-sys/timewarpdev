import { useState } from "react";
import { ArrowRightLeft, Pencil, Save, X, Atom } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface LoopPillar {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  physicsNote?: string;
  dnaNote?: string;
}

const DEFAULT_PILLARS: LoopPillar[] = [
  {
    id: "problem",
    label: "The Problem",
    subtitle: "The Void",
    description:
      "Before a business exists, there is a gap between a current state and a desired state. Without a problem to solve or a desire to fulfill, there is no reason for an exchange to occur.",
    physicsNote: "Potential energy.",
  },
  {
    id: "solution",
    label: "The Solution",
    subtitle: "The Transformation",
    description:
      'This is the mechanism that bridges the gap. It is the specific "how" that moves a person from Point A to Point B. Whether it\'s a physical hammer or lines of code, the DNA here is the utility.',
    physicsNote: "Kinetic energy (the work being done).",
  },
  {
    id: "customer",
    label: "The Customer",
    subtitle: "The Observer",
    description:
      "A business cannot exist in a vacuum. You need a conscious entity that perceives the value of the solution and has the authority to initiate the exchange.",
    dnaNote: "Demand.",
  },
  {
    id: "economics",
    label: "The Economics",
    subtitle: "The Equilibrium",
    description:
      'This is the "minimum breaking point." For a business to be a business and not a hobby or a charity, the Value Created must be greater than the Cost of Creation, and the Price must be lower than the Value Perceived.',
  },
];

export function ValueExchangeLoop({
  isEditing = false,
  onEditToggle,
}: {
  isEditing?: boolean;
  onEditToggle?: () => void;
}) {
  const [pillars, setPillars] = useState<LoopPillar[]>(DEFAULT_PILLARS);
  const [editPillars, setEditPillars] = useState<LoopPillar[]>(DEFAULT_PILLARS);

  const handleSave = () => {
    setPillars(editPillars);
    onEditToggle?.();
  };

  const handleCancel = () => {
    setEditPillars(pillars);
    onEditToggle?.();
  };

  const handleStartEdit = () => {
    setEditPillars([...pillars]);
    onEditToggle?.();
  };

  const updatePillar = (id: string, field: keyof LoopPillar, value: string) => {
    setEditPillars((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const displayPillars = isEditing ? editPillars : pillars;

  return (
    <div className="flex flex-col" id="value-exchange">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Value Exchange Loop
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="gap-1.5 text-muted-foreground"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="gap-1.5">
                <Save className="h-4 w-4" /> Save
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              className="gap-1.5"
            >
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Pillars */}
        <div className="relative space-y-0">
          {displayPillars.map((pillar, i) => (
            <div key={pillar.id} className="relative flex gap-4">
              {/* Timeline */}
              <div className="flex flex-col items-center shrink-0 w-6">
                <div className="h-6 w-6 rounded-full border-2 border-primary/60 bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 z-10">
                  {i + 1}
                </div>
                {i < displayPillars.length - 1 && (
                  <div className="w-px flex-1 bg-border/60 min-h-[24px]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6 min-w-0">
                {isEditing ? (
                  <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3">
                    <Textarea
                      value={pillar.description}
                      onChange={(e) =>
                        updatePillar(pillar.id, "description", e.target.value)
                      }
                      placeholder="Describe this pillar..."
                      className="text-sm min-h-[80px] resize-none"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {pillar.label}
                      </span>
                      <span className="text-xs font-medium text-primary/70">
                        ({pillar.subtitle})
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {pillar.description}
                    </p>
                    {pillar.physicsNote && (
                      <p className="text-xs text-muted-foreground/60 mt-2 italic">
                        Physics equivalent: {pillar.physicsNote}
                      </p>
                    )}
                    {pillar.dnaNote && (
                      <p className="text-xs text-muted-foreground/60 mt-2 italic">
                        DNA component: {pillar.dnaNote}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Atomic Formula */}
        <div className="rounded-xl border border-border/50 bg-muted/30 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Atom className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              The "Atomic" Formula
            </span>
          </div>

          <div className="flex items-center justify-center py-3">
            <span className="text-xl font-mono font-bold text-foreground tracking-wide">
              V<sub className="text-xs">p</sub> &gt; P &gt; C
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground/80">V<sub>p</sub></span>{" "}
              — Perceived Value (What the customer thinks it's worth)
            </p>
            <p>
              <span className="font-semibold text-foreground/80">P</span> — Price
              (What is exchanged)
            </p>
            <p>
              <span className="font-semibold text-foreground/80">C</span> — Cost
              (What it takes to sustain the solution)
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-2">
          <span className="text-sm font-semibold text-foreground">
            Summary: What is the DNA?
          </span>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you remove the "Price," it's a gift. If you remove the "Solution,"
            it's a scam. If you remove the "Value," it's obsolete.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The DNA is the repeatable delivery of a solution that costs less than
            the value it provides. Everything else—marketing, HR, legal,
            branding—is just the "flesh" built around that skeleton.
          </p>
        </div>
      </div>
    </div>
  );
}
