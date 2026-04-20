import { Check, Box, CheckCircle2 } from "lucide-react";
import type { PillarField } from "./pillarTypes";
import type { ReactNode } from "react";

// Detects whether a field has any meaningful data, AND validates that the
// value shape matches what the renderer for that type expects. If the shape
// is wrong (e.g. an object passed to a text field), treat it as empty so we
// render the empty state instead of crashing.
function isEmpty(field: PillarField): boolean {
  const v = field.value;
  if (v == null) return true;

  const isObj = (x: any) => x && typeof x === "object" && !Array.isArray(x);

  switch (field.type) {
    case "text":
    case "long-text":
      return typeof v !== "string" || v.trim() === "";
    case "tags":
    case "list":
    case "gallery":
      return !Array.isArray(v) || v.length === 0;
    case "colors":
    case "personas":
    case "funnel":
    case "timeline":
    case "kpi-grid":
    case "tech-stack":
    case "pricing-tiers":
      return !Array.isArray(v) || v.length === 0;
    case "table":
      return !isObj(v) || !Array.isArray(v.columns) || !Array.isArray(v.rows) || !v.columns.length || !v.rows.length;
    case "typography":
      return !isObj(v) || (!v.family && !v.weight);
    case "tam-sam-som":
      return !isObj(v) || (!v.tam?.value && !v.sam?.value && !v.som?.value);
    case "2x2-grid":
      return !isObj(v) || !Array.isArray(v.points) || !v.points.length;
    case "org-chart":
      return !isObj(v) || !v.role;
    default:
      if (typeof v === "string") return v.trim() === "";
      if (Array.isArray(v)) return v.length === 0;
      return false;
  }
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center">
      <p className="text-sm text-muted-foreground">No {label} yet</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Add insights via the Assistant or onboarding to populate this field.
      </p>
    </div>
  );
}

export function PillarFieldRenderer({ field }: { field: PillarField }) {
  if (isEmpty(field)) {
    return <EmptyState label={field.name.replace(/^\d+\.\s*/, "").toLowerCase()} />;
  }

  switch (field.type) {
    case "long-text":
    case "text":
      return (
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
          {field.value}
        </div>
      );

    case "tags":
      return (
        <div className="flex flex-wrap gap-2">
          {(field.value as string[]).map((tag, i) => (
            <span
              key={i}
              className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium ring-1 ring-primary/20"
            >
              {tag}
            </span>
          ))}
        </div>
      );

    case "colors":
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(field.value as { label: string; hex: string; rgb?: string }[]).map((c) => (
            <div key={c.label}>
              <div
                className="w-full aspect-video rounded-xl shadow-inner border border-border mb-3"
                style={{ backgroundColor: c.hex }}
              />
              <div className="font-bold text-[13px] text-foreground mb-0.5">
                {c.label}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {c.hex}
                {c.rgb ? ` • RGB ${c.rgb}` : ""}
              </div>
            </div>
          ))}
        </div>
      );

    case "typography": {
      const v = field.value as { family: string; weight: string };
      return (
        <div className="space-y-4">
          <div
            className="text-4xl text-foreground"
            style={{ fontFamily: v.family.split(",")[0] || undefined }}
          >
            Aa
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-bold text-muted-foreground/60 w-16">
                FAMILY
              </span>
              <span className="text-[13px] font-mono bg-muted px-2 py-0.5 rounded">
                {v.family}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-bold text-muted-foreground/60 w-16">
                WEIGHTS
              </span>
              <span className="text-[13px]">{v.weight}</span>
            </div>
          </div>
        </div>
      );
    }

    case "gallery":
      return (
        <div className="grid grid-cols-3 gap-3">
          {(field.value as string[]).map((src, i) => (
            <div
              key={i}
              className="relative aspect-[4/3] rounded-xl overflow-hidden ring-1 ring-border"
            >
              <img
                src={src}
                className="w-full h-full object-cover"
                alt=""
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
      );

    case "table": {
      const v = field.value as { columns: string[]; rows: string[][] };
      return (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left border-collapse text-[13px] min-w-[600px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {v.columns.map((col, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider text-[11px]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {v.rows.map((row, i) => (
                <tr key={i} className="bg-background hover:bg-muted/20 transition-colors">
                  {row.map((cell, j) => {
                    const cl = String(cell).toLowerCase().trim();
                    const isPercent = /^\d+(\.\d+)?%$/.test(cl);
                    const isYes = cl === "yes" || cl === "true";
                    const isNo = cl === "no" || cl === "false";

                    let content: ReactNode = cell;
                    if (isYes) {
                      content = (
                        <div className="flex justify-center">
                          <div className="w-5 h-5 rounded bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        </div>
                      );
                    } else if (isNo) {
                      content = (
                        <div className="flex justify-center">
                          <div className="w-5 h-5 rounded bg-red-50 flex items-center justify-center text-red-600 font-bold text-[10px]">
                            X
                          </div>
                        </div>
                      );
                    } else if (isPercent) {
                      const val = parseFloat(cell);
                      content = (
                        <div className="flex items-center gap-2">
                          <span className="w-10 text-right font-mono text-[11px] font-bold text-muted-foreground">
                            {cell}
                          </span>
                          <div className="flex-1 max-w-[80px] h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                            />
                          </div>
                        </div>
                      );
                    } else if (j === 0) {
                      content = <span className="font-medium text-foreground">{cell}</span>;
                    }

                    return (
                      <td
                        key={j}
                        className={`px-4 py-3 text-foreground/80 bg-white ${isYes || isNo ? "text-center" : ""}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "list":
      return (
        <ul className="space-y-3 py-1">
          {(field.value as string[]).map((item, i) => {
            const isNeg =
              typeof item === "string" &&
              (item.toLowerCase().startsWith("avoid") ||
                item.toLowerCase().startsWith("don't"));
            return (
              <li
                key={i}
                className="text-[13px] text-foreground/80 leading-relaxed flex items-start gap-3"
              >
                {isNeg ? (
                  <span className="text-red-500 font-bold mt-0.5 shrink-0">×</span>
                ) : (
                  <Check size={14} className="text-muted-foreground shrink-0 mt-1" />
                )}
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
      );

    case "personas":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(field.value as any[]).map((p, i) => (
            <div
              key={i}
              className="p-5 rounded-xl border border-border bg-card shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shadow-md">
                  {p.name?.charAt(0) || "?"}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{p.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {p.role}
                    {p.tag ? <> • <span className="text-primary">{p.tag}</span></> : null}
                  </p>
                </div>
              </div>
              {p.quote && (
                <blockquote className="text-[13px] italic text-muted-foreground mb-4 border-l-2 border-primary/30 pl-3">
                  "{p.quote}"
                </blockquote>
              )}
              {p.goals?.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Goals
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.goals.map((g: string, idx: number) => (
                      <span
                        key={idx}
                        className="bg-emerald-50 text-emerald-700 text-[11px] px-2 py-0.5 rounded-md"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {p.fears?.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Fears
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.fears.map((fr: string, idx: number) => (
                      <span
                        key={idx}
                        className="bg-sky-50 text-sky-700 text-[11px] px-2 py-0.5 rounded-md"
                      >
                        {fr}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      );

    case "org-chart": {
      const renderNode = (node: any): JSX.Element => (
        <div className="flex flex-col items-center">
          <div className="bg-card border-2 border-border shadow-sm rounded-xl p-3 flex flex-col items-center w-40 text-center">
            <span className="text-xs font-semibold text-foreground">{node.role}</span>
            {node.name && (
              <span className="text-[11px] text-muted-foreground">{node.name}</span>
            )}
          </div>
          {node.children?.length > 0 && (
            <div className="flex flex-col items-center">
              <div className="w-[2px] h-6 bg-border" />
              <div className="flex items-start justify-center">
                {node.children.map((c: any, i: number) => (
                  <div key={i} className="px-4">
                    {renderNode(c)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
      return (
        <div className="w-full overflow-x-auto py-4">
          <div className="min-w-max">{renderNode(field.value)}</div>
        </div>
      );
    }

    case "funnel":
      return (
        <div className="max-w-2xl space-y-2 py-4">
          {(field.value as any[]).map((stage, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-32 text-left shrink-0">
                <div className="text-[13px] font-bold text-foreground">{stage.stage}</div>
              </div>
              <div className="flex-1 h-12 relative flex items-center">
                <div
                  className="absolute inset-y-0 rounded-lg flex items-center justify-start pl-4 shadow-inner"
                  style={{
                    backgroundColor: stage.color || "hsl(var(--primary))",
                    width: `${100 - i * 15}%`,
                  }}
                >
                  <span className="text-white font-bold text-[13px] whitespace-nowrap">
                    {stage.volume}
                  </span>
                </div>
              </div>
              <div className="w-16 shrink-0">
                <span className="text-xs font-black text-muted-foreground">
                  {stage.rate}
                </span>
              </div>
            </div>
          ))}
        </div>
      );

    case "2x2-grid": {
      const { xLabel, yLabel, points } = field.value;
      return (
        <div className="flex items-center justify-start py-8">
          <div className="relative w-[400px] h-[400px] border-2 border-border rounded-xl bg-muted/30 overflow-hidden shadow-inner">
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-border -translate-y-1/2" />
            <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-border -translate-x-1/2" />
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {yLabel.split(" ")[0]}
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {yLabel.split(" ").pop()}
            </div>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {xLabel.split(" ")[0]}
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {xLabel.split(" ").pop()}
            </div>
            {points.map((pt: any, i: number) => (
              <div
                key={i}
                className={`absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-md ${pt.isUs ? "ring-4 ring-primary/30" : "ring-2 ring-background"}`}
                style={{
                  left: `${pt.x}%`,
                  bottom: `${pt.y}%`,
                  backgroundColor: pt.color,
                }}
              >
                <span
                  className={`absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold ${pt.isUs ? "text-primary" : "text-foreground/70"}`}
                >
                  {pt.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "tam-sam-som": {
      const v = field.value;
      const tam = v?.tam ?? {};
      const sam = v?.sam ?? {};
      const som = v?.som ?? {};
      return (
        <div className="space-y-6">
          <div className="relative w-full aspect-square max-w-[360px] mx-auto">
            {/* TAM — outer */}
            <div className="absolute inset-0 bg-primary/5 border-2 border-primary/20 rounded-full shadow-inner" />
            <div className="absolute inset-x-0 top-[7%] flex flex-col items-center px-4 text-center">
              <span className="text-lg font-black text-primary leading-tight truncate max-w-[80%]">
                {tam.value || "—"}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary/60 mt-0.5">
                {tam.label || "TAM"}
              </span>
            </div>

            {/* SAM — middle */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[70%] h-[70%] bg-primary/10 border-2 border-primary/30 rounded-full" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[44%] flex flex-col items-center px-4 text-center w-[60%]">
              <span className="text-base font-black text-primary leading-tight truncate max-w-full">
                {sam.value || "—"}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary/60 mt-0.5">
                {sam.label || "SAM"}
              </span>
            </div>

            {/* SOM — inner */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[40%] h-[40%] bg-primary border border-primary rounded-full shadow-md flex flex-col items-center justify-center px-2 text-center">
              <span className="text-sm font-black text-primary-foreground leading-tight truncate max-w-full">
                {som.value || "—"}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider text-primary-foreground/80 mt-0.5">
                {som.label || "SOM"}
              </span>
            </div>
          </div>

          {(tam.scope || sam.scope || som.scope) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { ...tam, label: tam.label || "TAM" },
                { ...sam, label: sam.label || "SAM" },
                { ...som, label: som.label || "SOM" },
              ].map((tier, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    {tier.label}
                  </div>
                  <div className="text-sm font-bold text-foreground mb-1">{tier.value || "—"}</div>
                  <div className="text-[12px] text-muted-foreground leading-snug">
                    {tier.scope || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "kpi-grid":
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(field.value as any[]).map((kpi, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between"
            >
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide truncate mb-2">
                {kpi.label}
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-black text-foreground tracking-tight">
                  {kpi.value}
                </span>
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded mb-1 ${
                    kpi.status === "good"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {kpi.trend}
                </span>
              </div>
            </div>
          ))}
        </div>
      );

    case "tech-stack":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(field.value as any[]).map((cat, i) => (
            <div key={i} className="border border-border rounded-xl p-4 bg-muted/30">
              <h4 className="text-[11px] font-semibold uppercase text-muted-foreground tracking-widest mb-3">
                {cat.category}
              </h4>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(cat.tools) ? cat.tools : []).map((tool: string, j: number) => (
                  <div
                    key={j}
                    className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-lg shadow-sm"
                  >
                    <Box size={14} className="text-primary/60" />
                    <span className="text-[13px] font-medium text-foreground/80">
                      {tool}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );

    case "pricing-tiers":
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          {(field.value as any[]).map((tier, i) => (
            <div
              key={i}
              className={`rounded-2xl p-6 flex flex-col relative ${
                tier.recommended
                  ? "bg-primary text-primary-foreground shadow-xl scale-105 z-10"
                  : "bg-card border border-border text-foreground"
              }`}
            >
              {tier.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                  Most Popular
                </div>
              )}
              <h4
                className={`text-base font-bold mb-1 ${tier.recommended ? "opacity-90" : "text-muted-foreground"}`}
              >
                {tier.name}
              </h4>
              <div className="text-3xl font-bold mb-6">{tier.price}</div>
              <div className="flex-1 space-y-3">
                {tier.features.map((feat: string, j: number) => (
                  <div key={j} className="flex items-start gap-2.5 text-[13px] leading-tight">
                    <CheckCircle2
                      size={14}
                      className={`shrink-0 mt-0.5 ${tier.recommended ? "opacity-90" : "text-primary"}`}
                    />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );

    case "timeline":
      return (
        <div className="relative pl-6 py-4 space-y-8">
          <div className="absolute top-4 bottom-4 left-6 w-[2px] bg-border" />
          {(field.value as any[]).map((item, i) => (
            <div key={i} className="relative pl-8">
              <div className="absolute left-[-5px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-primary/10" />
              <div className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">
                {item.date}
              </div>
              <h4 className="text-[15px] font-semibold text-foreground mb-1">
                {item.title}
              </h4>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      );

    default:
      return (
        <div className="text-[13px] text-muted-foreground italic">
          Unsupported type: {field.type}
        </div>
      );
  }
}
