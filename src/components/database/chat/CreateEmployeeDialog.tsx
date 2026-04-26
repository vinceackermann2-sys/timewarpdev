import { Bot, Loader2, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CreateEmployeeDialog({
  open,
  onClose,
  addEmployeePrompt,
  setAddEmployeePrompt,
  isGeneratingEmployee,
  generatedEmployee,
  setGeneratedEmployee,
  onGenerate,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  addEmployeePrompt: string;
  setAddEmployeePrompt: (v: string) => void;
  isGeneratingEmployee: boolean;
  generatedEmployee: Record<string, unknown> | null;
  setGeneratedEmployee: (v: Record<string, unknown> | null) => void;
  onGenerate: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold">Create AI Employee</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
            }}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!generatedEmployee ? (
            <>
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Describe what you want this employee to do. AI will configure it with the optimal name, role, and procedure.
                </p>
                <textarea
                  value={addEmployeePrompt}
                  onChange={(e) => setAddEmployeePrompt(e.target.value)}
                  placeholder="e.g. I need someone who monitors our social media mentions every morning, summarizes sentiment, and drafts response suggestions for negative comments..."
                  className="w-full h-32 px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
                  autoFocus
                  disabled={isGeneratingEmployee}
                />
              </div>
              <Button onClick={onGenerate} disabled={isGeneratingEmployee || addEmployeePrompt.trim().length < 3} className="w-full gap-2">
                {isGeneratingEmployee ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing & Configuring...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generate Employee
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{String(generatedEmployee.name)}</p>
                    <p className="text-xs text-muted-foreground">{String(generatedEmployee.role ?? "")}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Purpose</p>
                    <p className="text-sm text-foreground">{String(generatedEmployee.sop_purpose ?? "")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Scope</p>
                    <p className="text-sm text-foreground">{String(generatedEmployee.sop_scope ?? "")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Procedure</p>
                    <ol className="list-decimal list-inside space-y-1">
                      {((generatedEmployee.sop_procedure as string[]) || []).map((step, i) => (
                        <li key={i} className="text-sm text-foreground">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Responsibilities</p>
                    <ul className="list-disc list-inside space-y-1">
                      {((generatedEmployee.sop_responsibilities as string[]) || []).map((r, i) => (
                        <li key={i} className="text-sm text-foreground">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Safety Notes</p>
                    <p className="text-sm text-foreground">{String(generatedEmployee.sop_safety_notes ?? "")}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setGeneratedEmployee(null)}>
                  Regenerate
                </Button>
                <Button className="flex-1 gap-2" onClick={onConfirm}>
                  <Plus className="w-4 h-4" /> Create Employee
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
