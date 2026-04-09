import { ReactNode, useEffect, useMemo, useState } from "react";
import { Maximize2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GraphicEditorDialogProps {
  title: string;
  description?: string;
  value: string;
  onApply: (value: string) => void;
  renderPreview?: (value: string) => ReactNode;
}

export function GraphicEditorDialog({
  title,
  description,
  value,
  onApply,
  renderPreview,
}: GraphicEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    if (open) setDraftValue(value);
  }, [open, value]);

  const validationError = useMemo(() => {
    try {
      JSON.parse(draftValue);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid JSON";
    }
  }, [draftValue]);

  const handleApply = () => {
    if (validationError) return;
    onApply(draftValue);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 rounded-md text-primary hover:bg-primary/10 hover:text-primary"
        title="Open and edit"
        onClick={() => setOpen(true)}
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl border-border bg-background p-0 sm:rounded-2xl">
          <div className="flex max-h-[85vh] flex-col overflow-hidden">
            <DialogHeader className="border-b border-border px-6 py-4">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {description || "Edit the generated graphic JSON and preview the result before applying it."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">Graphic JSON</h4>
                  {validationError ? (
                    <span className="inline-flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      Invalid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-primary">
                      <Check className="h-3 w-3" />
                      Valid
                    </span>
                  )}
                </div>
                <textarea
                  value={draftValue}
                  onChange={(event) => setDraftValue(event.target.value)}
                  className="h-[320px] w-full resize-none rounded-xl border border-border bg-muted/30 p-3 font-mono text-xs leading-6 text-foreground outline-none focus:border-ring lg:h-[calc(85vh-13rem)]"
                  spellCheck={false}
                />
                {validationError && (
                  <p className="mt-2 text-xs text-destructive">{validationError}</p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleApply} disabled={!!validationError}>
                    Apply changes
                  </Button>
                </div>
              </div>

              <div className="min-h-0 overflow-auto bg-muted/20 p-4">
                <div className="mb-3 text-sm font-medium text-foreground">Preview</div>
                {renderPreview ? renderPreview(draftValue) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}