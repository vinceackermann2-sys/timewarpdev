// Helpers for the per-pillar manual edit feature.
// Edits are stored as plain strings keyed by field id, on the Brand entry:
//   brand.pillarOverrides[pillarId][fieldId] = "user text"
//
// At render time, the mapper replaces the structured value with a special
// override marker { __override: string } which the renderer renders as
// long-text. This lets users overwrite ANY field type with free text without
// needing custom editors per shape.

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
