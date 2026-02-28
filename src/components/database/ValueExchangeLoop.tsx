import { useState } from "react";
import { ArrowRightLeft, Pencil, Save, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface LoopStep {
  id: string;
  label: string;
  description: string;
}

const DEFAULT_STEPS: LoopStep[] = [
  { id: "1", label: "Attract", description: "How you capture attention and draw prospects in" },
  { id: "2", label: "Engage", description: "How you build trust and nurture relationships" },
  { id: "3", label: "Convert", description: "How you turn interest into commitment" },
  { id: "4", label: "Deliver", description: "How you fulfill the promise and exceed expectations" },
  { id: "5", label: "Retain", description: "How you keep customers coming back and referring others" },
];

export function ValueExchangeLoop({
  isEditing = false,
  onEditToggle,
}: {
  isEditing?: boolean;
  onEditToggle?: () => void;
}) {
  const [steps, setSteps] = useState<LoopStep[]>(DEFAULT_STEPS);
  const [editSteps, setEditSteps] = useState<LoopStep[]>(DEFAULT_STEPS);

  const handleSave = () => {
    setSteps(editSteps);
    onEditToggle?.();
  };

  const handleCancel = () => {
    setEditSteps(steps);
    onEditToggle?.();
  };

  const handleStartEdit = () => {
    setEditSteps([...steps]);
    onEditToggle?.();
  };

  const updateStep = (id: string, field: keyof LoopStep, value: string) => {
    setEditSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addStep = () => {
    setEditSteps(prev => [...prev, { id: Date.now().toString(), label: "", description: "" }]);
  };

  const removeStep = (id: string) => {
    setEditSteps(prev => prev.filter(s => s.id !== id));
  };

  const displaySteps = isEditing ? editSteps : steps;

  return (
    <div className="flex flex-col" id="value-exchange">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Value Exchange Loop</h2>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-1.5 text-muted-foreground">
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="gap-1.5">
                <Save className="h-4 w-4" /> Save
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={handleStartEdit} className="gap-1.5">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-4">
        <p className="text-xs text-muted-foreground">
          Define each stage of your customer value exchange — how you attract, engage, convert, deliver, and retain.
        </p>

        <div className="relative space-y-0">
          {displaySteps.map((step, i) => (
            <div key={step.id} className="relative flex gap-4">
              {/* Timeline line & dot */}
              <div className="flex flex-col items-center shrink-0 w-6">
                <div className={cn(
                  "h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0 z-10",
                  "border-primary/60 bg-primary/10 text-primary"
                )}>
                  {i + 1}
                </div>
                {i < displaySteps.length - 1 && (
                  <div className="w-px flex-1 bg-border/60 min-h-[24px]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-5 min-w-0">
                {isEditing ? (
                  <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={step.label}
                        onChange={(e) => updateStep(step.id, "label", e.target.value)}
                        placeholder="Stage name"
                        className="h-8 text-sm font-medium flex-1"
                      />
                      <button
                        onClick={() => removeStep(step.id)}
                        className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Textarea
                      value={step.description}
                      onChange={(e) => updateStep(step.id, "description", e.target.value)}
                      placeholder="Describe this stage..."
                      className="text-sm min-h-[60px] resize-none"
                    />
                  </div>
                ) : (
                  <div className="pt-0.5">
                    <span className="text-sm font-medium text-foreground">{step.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {isEditing && (
          <Button variant="outline" size="sm" onClick={addStep} className="gap-1.5 text-xs w-full">
            <Plus className="h-3.5 w-3.5" /> Add Stage
          </Button>
        )}
      </div>
    </div>
  );
}
