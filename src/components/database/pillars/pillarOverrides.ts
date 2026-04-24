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

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

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
