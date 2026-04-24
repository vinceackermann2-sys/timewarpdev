import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { PillarField } from "./pillarTypes";
import { parseTextToFieldValue, serializeFieldToText } from "./pillarOverrides";
import { PillarFieldRenderer } from "./PillarFieldRenderer";

interface Props {
  field: PillarField;
  /** The structured value BEFORE override merge, used as the editable baseline. */
  baseValue: any;
  /** Existing override text for this field (if any). */
  override?: string;
  /** When true, the editor opens immediately (used by the page-level Edit toggle). */
  autoOpen?: boolean;
  onSave: (next: string | null) => Promise<void> | void;
}

/**
 * Inline editor for a single pillar field.
 *
 * - Shows the normal `PillarFieldRenderer` until the user clicks the row.
 * - On click, swaps to a textarea pre-filled with the current text
 *   (override if present, otherwise the serialized structured value).
 * - Save persists the override; if the text matches the baseline or is
 *   empty, the override is cleared so the structured rendering returns.
 */
export function PillarFieldEditor({ field, baseValue, override, autoOpen, onSave }: Props) {
  const baseline = serializeFieldToText(field, baseValue);
  const normalizedOverride = (() => {
    if (!override) return undefined;
    const parsed = parseTextToFieldValue(field, override);
    return parsed != null ? serializeFieldToText(field, parsed) : override;
  })();
  const initial = normalizedOverride ?? baseline;

  const [editing, setEditing] = useState(!!autoOpen);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Sync open state when the parent toggles edit mode
  useEffect(() => {
    setEditing(!!autoOpen);
  }, [autoOpen]);

  // Keep local state in sync if the underlying value changes while not editing
  useEffect(() => {
    if (!editing) setValue(initial);
  }, [initial, editing]);

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      // Place cursor at end
      const len = taRef.current.value.length;
      taRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  const handleCancel = () => {
    setValue(initial);
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const trimmed = value.trim();
      // Empty or matches baseline → clear override
      const next = trimmed === "" || value === baseline ? null : value;
      await onSave(next);
      toast.success("Saved");
      setEditing(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await onSave(null);
      setValue(baseline);
      toast.success("Reset to AI value");
      setEditing(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to reset");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div
        className="group relative -mx-2 px-2 py-1 rounded-lg cursor-text hover:bg-muted/40 transition-colors"
        onClick={() => setEditing(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setEditing(true);
          }
        }}
      >
        <PillarFieldRenderer field={field} />
        {override !== undefined && (
          <span className="absolute -top-1 -right-1 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
            Edited
          </span>
        )}
      </div>
    );
  }

  const rows = Math.min(10, Math.max(2, value.split("\n").length));

  return (
    <div className="space-y-2 -mx-2 p-2 rounded-lg bg-muted/40 ring-1 ring-border">
      <Textarea
        ref={taRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        className="text-sm resize-y bg-white"
        onKeyDown={(e) => {
          if (e.key === "Escape") handleCancel();
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">
          <kbd className="font-mono">⌘↵</kbd> save · <kbd className="font-mono">Esc</kbd> cancel
        </div>
        <div className="flex items-center gap-2">
          {override !== undefined && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={saving}
              className="h-8 gap-1.5 text-muted-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={saving}
            className="h-8 gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 gap-1.5">
            <Check className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
