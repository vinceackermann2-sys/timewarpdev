// Helpers for the per-pillar manual edit feature.
// Edits are stored as plain strings keyed by field id, on the Brand entry:
//   brand.pillarOverrides[pillarId][fieldId] = "user text"
//
// At render time, the mapper replaces the structured value with a special
// override marker { __override: string } which the renderer parses back into
// the appropriate structured shape so visuals (colors, typography, gallery,
// tables, …) keep rendering correctly.

import type { PillarField } from "./pillarTypes";

export type PillarOverrides = Record<string, Record<string, string>>;

export const OVERRIDE_KEY = "__override" as const;

export interface OverrideValue {
  [OVERRIDE_KEY]: string;
}

export function isOverrideValue(v: any): v is OverrideValue {
  return v && typeof v === "object" && typeof v[OVERRIDE_KEY] === "string";
}

/**
 * Convert any structured field value into an editable plain-text string.
 * Used to prefill the textarea in the edit dialog.
 */
export function serializeFieldToText(field: PillarField, value: any): string {
  if (value == null) return "";
  if (isOverrideValue(value)) return value[OVERRIDE_KEY];

  // Strings → as-is
  if (typeof value === "string") return value;

  const joinLines = (parts: Array<string | null | undefined>) =>
    parts.filter((part): part is string => typeof part === "string" && part.trim() !== "").join("\n");

  switch (field.type) {
    case "pricing-tiers":
      if (Array.isArray(value)) {
        return value
          .map((tier: any) =>
            joinLines([
              `${tier.name || "Tier"}: ${tier.price || ""}${tier.recommended ? " [recommended]" : ""}`.trim(),
              ...((Array.isArray(tier.features) ? tier.features : []).map((feature: string) => `- ${feature}`)),
            ])
          )
          .join("\n\n");
      }
      break;

    case "personas":
      if (Array.isArray(value)) {
        return value
          .map((persona: any) =>
            joinLines([
              `${persona.name || "Persona"}${persona.role ? ` — ${persona.role}` : ""}`,
              persona.quote ? `Quote: ${persona.quote}` : null,
              Array.isArray(persona.goals) && persona.goals.length ? `Goals: ${persona.goals.join(", ")}` : null,
              Array.isArray(persona.fears) && persona.fears.length ? `Fears: ${persona.fears.join(", ")}` : null,
            ])
          )
          .join("\n\n");
      }
      break;

    case "kpi-grid":
      if (Array.isArray(value)) {
        return value
          .map((kpi: any) => {
            const name = kpi.label || kpi.name || "Metric";
            const meta = [kpi.trend, kpi.status].filter(Boolean).join(", ");
            return `${name}: ${kpi.value || ""}${meta ? ` (${meta})` : ""}${kpi.context ? ` — ${kpi.context}` : ""}`.trim();
          })
          .join("\n");
      }
      break;

    case "tech-stack":
      if (Array.isArray(value)) {
        return value
          .map((item: any) => `${item.category || "General"}: ${(Array.isArray(item.tools) ? item.tools : []).join(", ")}`)
          .join("\n");
      }
      break;

    case "funnel":
      if (Array.isArray(value)) {
        return value
          .map((stage: any) => `${stage.stage || "Stage"}: ${stage.volume || ""}${stage.rate ? ` (${stage.rate})` : ""}`.trim())
          .join("\n");
      }
      break;

    case "timeline":
      if (Array.isArray(value)) {
        return value
          .map((item: any) => `${item.date || ""} — ${item.title || ""}${item.desc ? `: ${item.desc}` : ""}`.trim())
          .join("\n");
      }
      break;

    case "2x2-grid":
      if (value && typeof value === "object") {
        return joinLines([
          value.xLabel ? `X Axis: ${value.xLabel}` : null,
          value.yLabel ? `Y Axis: ${value.yLabel}` : null,
          ...(Array.isArray(value.points)
            ? value.points.map(
                (point: any) =>
                  `${point.name || "Point"}: x=${point.x ?? 50}, y=${point.y ?? 50}${point.isUs ? " [us]" : ""}`,
              )
            : []),
        ]);
      }
      break;

    case "org-chart": {
      const walk = (node: any, depth = 0): string[] => {
        if (!node || typeof node !== "object") return [];
        return [
          `${"  ".repeat(depth)}- ${node.role || "Role"}${node.name ? `: ${node.name}` : ""}`,
          ...((Array.isArray(node.children) ? node.children : []).flatMap((child: any) => walk(child, depth + 1))),
        ];
      };
      return walk(value).join("\n");
    }
  }

  // Arrays of strings → newline-separated bullet text
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return value.join("\n");
  }

  // Tables → header row + " | "-separated rows
  if (value && typeof value === "object" && Array.isArray(value.columns) && Array.isArray(value.rows)) {
    const header = value.columns.join(" | ");
    const rows = value.rows.map((r: any[]) => r.map((c) => String(c ?? "")).join(" | "));
    return [header, ...rows].join("\n");
  }

  // Tags-style array of {label,...}
  if (Array.isArray(value) && value.every((v) => v && typeof v === "object")) {
    return value
      .map((v: any) => {
        if (v.label && v.hex) return `${v.label}: ${v.hex}`;
        if (v.name && v.role) return `${v.name} — ${v.role}${v.quote ? ` ("${v.quote}")` : ""}`;
        if (v.stage) return `${v.stage}: ${v.volume || ""} (${v.rate || ""})`.trim();
        if (v.title && v.date) return `${v.date} — ${v.title}${v.desc ? `: ${v.desc}` : ""}`;
        if (v.name && v.value) return `${v.name}: ${v.value}${v.context ? ` (${v.context})` : ""}`;
        if (v.category && Array.isArray(v.tools)) return `${v.category}: ${v.tools.join(", ")}`;
        try {
          return JSON.stringify(v);
        } catch {
          return String(v);
        }
      })
      .join("\n");
  }

  // Typography
  if (value && typeof value === "object" && (value.family || value.weight)) {
    return [`Family: ${value.family || ""}`, `Weight: ${value.weight || ""}`].join("\n");
  }

  // TAM/SAM/SOM
  if (value && typeof value === "object" && (value.tam || value.sam || value.som)) {
    const fmt = (k: string, v: any) =>
      v ? `${k}: ${v.value || "—"}${v.scope ? ` — ${v.scope}` : ""}` : "";
    return [fmt("TAM", value.tam), fmt("SAM", value.sam), fmt("SOM", value.som)].filter(Boolean).join("\n");
  }

  // Fallback — pretty JSON
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Parse the user's edited plain-text back into the structured shape that
 * the field's renderer expects. Mirrors `serializeFieldToText`. Returns
 * `null` when the input doesn't fit (caller falls back to plain text).
 */
export function parseTextToFieldValue(field: PillarField, text: string): any {
  const raw = (text ?? "").trim();
  if (!raw) return null;

  const rawLines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
  const lines = rawLines.map((l) => l.trim()).filter(Boolean);
  const blocks = raw
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))
    .filter((block) => block.length > 0);
  const funnelPalette = ["#4a86ff", "#5b8df4", "#6c95e9", "#7e9cdd", "#90a3d2", "#a2acc7"];

  switch (field.type) {
    case "text":
    case "long-text":
      return text;

    case "tags":
    case "list":
      return lines;

    case "gallery":
      return lines.filter((l) => /^https?:\/\//i.test(l) || l.startsWith("data:") || l.startsWith("/"));

    case "colors": {
      const swatches = lines
        .map((l) => {
          const m = l.match(/^(.+?)\s*[:\-—]\s*(#?[0-9A-Fa-f]{3,8})\b(?:\s*[•·,]\s*(?:RGB\s*)?(.+))?$/i);
          if (m) {
            const hex = m[2].startsWith("#") ? m[2] : `#${m[2]}`;
            return { label: m[1].trim(), hex, rgb: m[3]?.trim() || undefined };
          }
          const hexOnly = l.match(/(#[0-9A-Fa-f]{3,8})/);
          if (hexOnly) return { label: l.replace(hexOnly[0], "").trim() || hexOnly[0], hex: hexOnly[0] };
          return null;
        })
        .filter(Boolean) as { label: string; hex: string; rgb?: string }[];
      return swatches.length ? swatches : null;
    }

    case "typography": {
      const obj: { family?: string; weight?: string } = {};
      for (const l of lines) {
        const m = l.match(/^(family|weight|weights)\s*[:\-—]\s*(.+)$/i);
        if (m) {
          const k = m[1].toLowerCase().startsWith("weight") ? "weight" : "family";
          obj[k] = m[2].trim();
        }
      }
      return obj.family || obj.weight ? { family: obj.family || "", weight: obj.weight || "" } : null;
    }

    case "table": {
      const split = (s: string) => s.split("|").map((c) => c.trim());
      if (lines.length < 1) return null;
      const columns = split(lines[0]);
      const rows = lines.slice(1).map(split);
      return columns.length ? { columns, rows } : null;
    }

    case "tam-sam-som": {
      const out: any = {};
      for (const l of lines) {
        const m = l.match(/^(TAM|SAM|SOM)\s*[:\-—]\s*(.+?)(?:\s+[—\-]\s+(.+))?$/i);
        if (m) {
          const key = m[1].toLowerCase();
          out[key] = { value: m[2].trim(), scope: m[3]?.trim() || "", label: key.toUpperCase() };
        }
      }
      return Object.keys(out).length ? out : null;
    }

    case "pricing-tiers": {
      const tiers = blocks
        .map((block) => {
          const header = block[0] || "";
          const recommended = /\[(recommended|featured|popular)\]/i.test(header);
          const headerClean = header.replace(/\s*\[(recommended|featured|popular)\]\s*/i, "").trim();
          const m = headerClean.match(/^(.+?)\s*[:\-—]\s*(.+)$/);
          const name = (m ? m[1] : headerClean).trim();
          const price = (m ? m[2] : "").trim();
          const features = block
            .slice(1)
            .map((line) => line.replace(/^[-•]\s*/, "").trim())
            .filter(Boolean);
          if (!name) return null;
          return { name, price, features, recommended };
        })
        .filter(Boolean);
      return tiers.length ? tiers : null;
    }

    case "personas": {
      const personas = blocks
        .map((block) => {
          const header = block[0] || "";
          const headerMatch = header.match(/^(.+?)(?:\s+[—-]\s+(.+))?$/);
          const goalsLine = block.find((line) => /^goals\s*[:\-—]/i.test(line));
          const fearsLine = block.find((line) => /^fears\s*[:\-—]/i.test(line));
          const quoteLine = block.find((line) => /^quote\s*[:\-—]/i.test(line));
          const splitCsv = (line?: string) =>
            (line || "")
              .replace(/^[^:\-—]+\s*[:\-—]\s*/i, "")
              .split(/\s*,\s*/)
              .map((item) => item.trim())
              .filter(Boolean);
          const name = (headerMatch?.[1] || "").trim();
          const role = (headerMatch?.[2] || "").trim();
          if (!name) return null;
          return {
            name,
            role,
            quote: quoteLine?.replace(/^quote\s*[:\-—]\s*/i, "").trim() || undefined,
            goals: splitCsv(goalsLine),
            fears: splitCsv(fearsLine),
          };
        })
        .filter(Boolean);
      return personas.length ? personas : null;
    }

    case "kpi-grid": {
      const items = lines
        .map((line) => {
          const m = line.match(/^(.+?)\s*[:\-—]\s*(.+?)(?:\s*\(([^)]*)\))?(?:\s+[—\-]\s+(.+))?$/);
          if (!m) return null;
          const meta = (m[3] || "").split(/\s*[,;|]\s*/).filter(Boolean);
          const trend = meta[0] || "";
          const status = (meta[1] || (/good|up|positive/i.test(trend) ? "good" : "warning")).toLowerCase();
          return {
            label: m[1].trim(),
            value: m[2].trim(),
            trend,
            status,
            context: m[4]?.trim() || "",
          };
        })
        .filter(Boolean);
      return items.length ? items : null;
    }

    case "tech-stack": {
      const stack = lines
        .map((line) => {
          const m = line.match(/^(.+?)\s*[:\-—]\s*(.+)$/);
          if (!m) return null;
          return {
            category: m[1].trim(),
            tools: m[2].split(/\s*,\s*/).map((tool) => tool.trim()).filter(Boolean),
          };
        })
        .filter(Boolean);
      return stack.length ? stack : null;
    }

    case "funnel": {
      const stages = lines
        .map((line, index) => {
          const m = line.match(/^(.+?)\s*[:\-—]\s*(.+?)(?:\s*\(([^)]*)\))?$/);
          if (!m) return null;
          return {
            stage: m[1].trim(),
            volume: m[2].trim(),
            rate: m[3]?.trim() || "",
            color: funnelPalette[index % funnelPalette.length],
          };
        })
        .filter(Boolean);
      return stages.length ? stages : null;
    }

    case "timeline": {
      const items = lines
        .map((line) => {
          const m = line.match(/^(.+?)\s+[—-]\s+(.+?)(?::\s*(.+))?$/);
          if (!m) return null;
          return { date: m[1].trim(), title: m[2].trim(), desc: m[3]?.trim() || "" };
        })
        .filter(Boolean);
      return items.length ? items : null;
    }

    case "2x2-grid": {
      let xLabel = "";
      let yLabel = "";
      const points = lines
        .map((line) => {
          if (/^x axis\s*[:\-—]/i.test(line)) {
            xLabel = line.replace(/^x axis\s*[:\-—]\s*/i, "").trim();
            return null;
          }
          if (/^y axis\s*[:\-—]/i.test(line)) {
            yLabel = line.replace(/^y axis\s*[:\-—]\s*/i, "").trim();
            return null;
          }
          const m = line.match(/^(.+?)\s*:\s*x\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*y\s*=\s*(-?\d+(?:\.\d+)?)(?:\s*\[(us)\])?$/i);
          if (!m) return null;
          const isUs = Boolean(m[4]);
          return {
            name: m[1].trim(),
            x: Number(m[2]),
            y: Number(m[3]),
            isUs,
            color: isUs ? "hsl(217 100% 65%)" : "#94a3b8",
          };
        })
        .filter(Boolean);
      return xLabel || yLabel || points.length ? { xLabel, yLabel, points } : null;
    }

    case "org-chart": {
      const stack: Array<{ depth: number; node: any }> = [];
      let root: any = null;
      for (const rawLine of rawLines) {
        const match = rawLine.match(/^(\s*)-\s*(.+?)(?:\s*:\s*(.+))?$/);
        if (!match) continue;
        const depth = Math.floor(match[1].length / 2);
        const node = {
          role: match[2].trim(),
          name: match[3]?.trim() || "",
          children: [] as any[],
        };
        while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
        if (stack.length === 0) {
          root = node;
        } else {
          stack[stack.length - 1].node.children.push(node);
        }
        stack.push({ depth, node });
      }
      return root;
    }

    default:
      return null;
  }
}

/**
 * Apply overrides on top of the populated field-value map.
 * Any non-empty override string replaces the underlying value with an
 * { __override } marker the renderer recognises.
 */
export function applyOverrides<T extends Record<string, any>>(
  values: T,
  overrides?: Record<string, string>,
): T {
  if (!overrides) return values;
  const next: any = { ...values };
  for (const [fieldId, text] of Object.entries(overrides)) {
    if (typeof text === "string" && text.trim() !== "") {
      next[fieldId] = { [OVERRIDE_KEY]: text };
    }
  }
  return next;
}
