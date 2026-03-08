import { AIEmployee } from "./EmployeesView";
import { Button } from "@/components/ui/button";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { ArrowLeft, Trash2 } from "lucide-react";

interface Props {
  employee: AIEmployee;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export function EmployeeDetailView({ employee, onBack, onDelete }: Props) {
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="text-sm">{children}</div>
    </div>
  );

  const renderList = (items: any[], renderItem?: (item: any, i: number) => React.ReactNode) => {
    if (!items || items.length === 0) return <p className="text-muted-foreground italic">Not specified</p>;
    return (
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted-foreground font-mono text-xs mt-0.5 w-5 text-right shrink-0">{i + 1}.</span>
            <span>{renderItem ? renderItem(item, i) : String(item)}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold">{employee.name}</h2>
          <p className="text-xs text-muted-foreground">{employee.role}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onDelete(employee.id)} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Identity */}
          <div className="flex items-center gap-4"BusinessBrainOrb size={64oyee.orb_colors} />
            <div>
              <h2 className="text-xl font-semibold">{employee.name}</h2>
              <p className="text-muted-foreground">{employee.role}</p>
            </div>
          </div>

          {employee.sop_title && <Section title="SOP Title"><p className="font-medium">{employee.sop_title}</p></Section>}
          {employee.sop_purpose && <Section title="Purpose"><p>{employee.sop_purpose}</p></Section>}
          {employee.sop_scope && <Section title="Scope"><p>{employee.sop_scope}</p></Section>}

          <Section title="Responsibilities">
            {renderList(employee.sop_responsibilities)}
          </Section>

          {employee.sop_definitions && employee.sop_definitions.length > 0 && (
            <Section title="Definitions">
              {renderList(employee.sop_definitions, (d) => (
                <span><strong>{d.term}:</strong> {d.meaning}</span>
              ))}
            </Section>
          )}

          <Section title="Required Materials / Tools">
            {renderList(employee.sop_materials)}
          </Section>

          <Section title="Procedure">
            {renderList(employee.sop_procedure)}
          </Section>

          {employee.sop_safety_notes && <Section title="Safety / Compliance Notes"><p>{employee.sop_safety_notes}</p></Section>}
          {employee.sop_documentation && <Section title="Documentation / Records"><p>{employee.sop_documentation}</p></Section>}

          {employee.sop_revision_history && employee.sop_revision_history.length > 0 && (
            <Section title="Revision History">
              <div className="space-y-1">
                {employee.sop_revision_history.map((rev: any, i: number) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <span className="font-mono text-muted-foreground">{rev.version}</span>
                    <span className="text-muted-foreground">{rev.date}</span>
                    <span>{rev.notes}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
