import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { PillarField } from "./pillarTypes";
import { parseTextToFieldValue, serializeFieldToText } from "./pillarOverrides";
import { PillarFieldRenderer } from "./PillarFieldRenderer";

interface Props {
  field: PillarField;
  baseValue: any;
  override?: string;
  /** When true, the field becomes editable in place (no popup/box). */
  autoOpen?: boolean;
  onSave: (next: string | null) => Promise<void> | void;
}

/**
 * In-place editor for a single pillar field.
 *
 * Edit mode does NOT open a separate textarea/box — instead it makes the
 * existing rendered value `contentEditable` so the user types directly on
 * the value exactly where it appears. On blur (or Cmd/Ctrl+Enter) we save
 * the edited plain-text as an override; if the text matches the AI baseline
 * the override is cleared and the structured visual returns.
 */
export function PillarFieldEditor({ field, baseValue, override, autoOpen, onSave }: Props) {
  const baseline = serializeFieldToText(field, baseValue);
  const normalizedOverride = (() => {
    if (!override) return undefined;
    const parsed = parseTextToFieldValue(field, override);
    return parsed != null ? serializeFieldToText(field, parsed) : override;
  })();
  const initialText = normalizedOverride ?? baseline;

  const [savingReset, setSavingReset] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef<string>(initialText);

  // Reset baseline tracker when underlying value changes
  useEffect(() => {
    lastSavedRef.current = initialText;
  }, [initialText]);

  // Read-only mode — render as-is.
  if (!autoOpen) {
    return (
      <div className="relative">
        <PillarFieldRenderer field={field} />
        {override !== undefined && (
          <span className="absolute -top-1 -right-1 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
            Edited
          </span>
        )}
      </div>
    );
  }

  const persist = async () => {
    if (!wrapperRef.current) return;
    const text = wrapperRef.current.innerText.replace(/\u00A0/g, " ").trimEnd();
    if (text === lastSavedRef.current) return;
    const trimmed = text.trim();
    const next = trimmed === "" || text === baseline ? null : text;
    try {
      await onSave(next);
      lastSavedRef.current = text;
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    }
  };

  const handleReset = async () => {
    setSavingReset(true);
    try {
      await onSave(null);
      lastSavedRef.current = baseline;
      toast.success("Reset to AI value");
    } catch (e: any) {
      toast.error(e?.message || "Failed to reset");
    } finally {
      setSavingReset(false);
    }
  };

  return (
    <div className="group/editor relative -mx-2 px-2 py-1 rounded-lg ring-1 ring-primary/30 focus-within:ring-primary/60 transition-shadow bg-primary/[0.015]">
      <div
        ref={wrapperRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onBlur={persist}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            (e.currentTarget as HTMLDivElement).blur();
          }
        }}
        className="outline-none focus:outline-none [&_*]:cursor-text"
      >
        <PillarFieldRenderer field={field} />
      </div>
      {override !== undefined && (
        <button
          onClick={handleReset}
          disabled={savingReset}
          className="absolute top-1 right-1 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground bg-background/80 backdrop-blur px-1.5 py-0.5 rounded-md opacity-0 group-hover/editor:opacity-100 transition-opacity"
          title="Reset to AI value"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      )}
    </div>
  );
}
