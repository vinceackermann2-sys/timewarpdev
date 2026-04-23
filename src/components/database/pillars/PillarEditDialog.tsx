import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { PillarDefinition, PillarField } from "./pillarTypes";
import { serializeFieldToText } from "./pillarOverrides";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pillar: PillarDefinition;
  /** Field-id → currently rendered value (post-mapper, pre-override merge) */
  currentValues: Record<string, any>;
  /** Existing overrides for this pillar */
  overrides: Record<string, string>;
  onSave: (next: Record<string, string>) => Promise<void> | void;
}

export function PillarEditDialog({ open, onOpenChange, pillar, currentValues, overrides, onSave }: Props) {
  // Build initial form state: overrides take precedence, otherwise the
  // serialized current value.
  const initial = useMemo(() => {
    const m: Record<string, string> = {};
    for (const section of pillar.sections) {
      for (const field of section.fields) {
        m[field.id] = overrides[field.id] ?? serializeFieldToText(field, currentValues[field.id]);
      }
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pillar.id, open]);

  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValues(initial);
  }, [open, initial]);

  const handleReset = (field: PillarField) => {
    setValues((prev) => ({ ...prev, [field.id]: serializeFieldToText(field, currentValues[field.id]) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Strip empty / whitespace-only overrides so the renderer reverts to
      // the structured representation instead of an empty long-text block.
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        if (typeof v === "string" && v.trim() !== "") {
          // Only persist as override if it differs from the serialized
          // structured value — otherwise we'd freeze stale text.
          const baseline = serializeFieldToText(
            pillar.sections.flatMap((s) => s.fields).find((f) => f.id === k)!,
            currentValues[k],
          );
          if (v !== baseline) next[k] = v;
        }
      }
      await onSave(next);
      toast.success("Business DNA updated");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-bold tracking-tight">Edit {pillar.name}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Edit any field's text. Changes save to your Business DNA and replace the
            generated value for this field.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 py-5 space-y-6">
            {pillar.sections.map((section) => (
              <div key={section.id} className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {section.title}
                </div>
                <div className="space-y-4">
                  {section.fields.map((field) => {
                    const cleanName = field.name.replace(/^\d+\.\s*/, "");
                    return (
                      <div key={field.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-foreground tracking-tight">
                            {cleanName}
                          </label>
                          {overrides[field.id] !== undefined && (
                            <button
                              type="button"
                              onClick={() => handleReset(field)}
                              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reset
                            </button>
                          )}
                        </div>
                        <Textarea
                          value={values[field.id] ?? ""}
                          onChange={(e) =>
                            setValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                          }
                          rows={Math.min(8, Math.max(2, (values[field.id]?.split("\n").length || 1)))}
                          className="text-sm resize-y"
                          placeholder={`Add ${cleanName.toLowerCase()}...`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
