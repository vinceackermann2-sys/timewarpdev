/**
 * Shared safety guardrails and browser-action JSON validation for edge chat agents.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+/i,
  /disregard\s+(your|all|the)\s+/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /system\s*:\s*you\s+are/i,
  /forget\s+(everything|all|your\s+instructions)/i,
  /new\s+instructions?\s*:/i,
  /override\s+(your|system|all)\s+/i,
];

const PII_PATTERNS = [
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, label: "credit card number" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, label: "SSN" },
];

const OUTPUT_BLOCKLIST = [
  /here\s+(?:is|are)\s+(?:your|the|my)\s+(?:credit\s+card|ssn|social\s+security|password)/i,
  /\bDROP\s+TABLE\b/i,
  /\bDELETE\s+FROM\s+/i,
  /\bsudo\s+rm\b/i,
];

const BLOCKED_URL_PATTERNS = [
  /checkout/i, /payment/i, /billing/i,
  /signin|sign-in|login|log-in/i,
  /signup|sign-up|register/i,
];

const BLOCKED_SELECTOR_PATTERNS = [
  /sign.?up|register|create.?account/i,
  /log.?in|sign.?in/i,
  /pay|purchase|buy|checkout|place.?order|subscribe/i,
];

export function extractJsonCodeBlock(content: string): string | null {
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch?.[1]) return jsonMatch[1];
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validateSingleAction(action: unknown): { valid: boolean; reason?: string; actionObj?: Record<string, unknown> } {
  if (!isObject(action)) return { valid: false, reason: "Action must be a JSON object." };
  const actionType = typeof action.action === "string" ? action.action : "";
  if (!actionType) return { valid: false, reason: "Missing required field: action." };
  if (typeof action.reasoning !== "string" || action.reasoning.trim().length === 0) {
    return { valid: false, reason: "Missing required field: reasoning." };
  }

  const requires = (field: string) =>
    action[field] !== undefined && action[field] !== null && String(action[field]).trim().length > 0;
  if (actionType === "navigate" && !requires("url")) return { valid: false, reason: "Navigate action must include url." };
  if ((actionType === "click" || actionType === "extract" || actionType === "type") && !requires("selector")) {
    return { valid: false, reason: `${actionType} action must include selector.` };
  }
  if (actionType === "type" && !requires("value")) return { valid: false, reason: "Type action must include value." };
  if (actionType === "wait" && typeof action.duration !== "number") {
    return { valid: false, reason: "Wait action must include numeric duration." };
  }
  if ((actionType === "respond" || actionType === "done") && !requires("message")) {
    return { valid: false, reason: `${actionType} action must include message.` };
  }
  return { valid: true, actionObj: action };
}

export function validateActionPayload(content: string): { valid: boolean; reason?: string; payload?: any } {
  const jsonRaw = extractJsonCodeBlock(content);
  if (!jsonRaw) return { valid: false, reason: "Response is not valid JSON or JSON code block." };

  let payload: any;
  try {
    payload = JSON.parse(jsonRaw);
  } catch {
    return { valid: false, reason: "JSON parsing failed." };
  }

  if (!isObject(payload)) return { valid: false, reason: "Top-level response must be an object." };

  if (Array.isArray(payload.steps)) {
    if (payload.steps.length === 0) return { valid: false, reason: "steps array cannot be empty." };
    for (let i = 0; i < payload.steps.length; i++) {
      const stepValidation = validateSingleAction(payload.steps[i]);
      if (!stepValidation.valid) return { valid: false, reason: `Invalid step ${i + 1}: ${stepValidation.reason}` };
    }
    return { valid: true, payload };
  }

  const singleValidation = validateSingleAction(payload);
  if (!singleValidation.valid) return { valid: false, reason: singleValidation.reason };
  return { valid: true, payload };
}

/** User-facing block when prompt matches injection heuristics. */
export function runPreflightGuardrails(userMessage: string, safety: any): string | null {
  if (!userMessage || !safety) return null;
  if (safety.promptInjectionEnabled) {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(userMessage)) {
        return "⚠️ Your message was blocked by the **Prompt Injection Defense** guardrail.";
      }
    }
  }
  if (safety.integrityEnabled !== false) {
    for (const { pattern, label } of PII_PATTERNS) {
      if (pattern.test(userMessage)) {
        return `⚠️ Your message was blocked by the **Integrity** guardrail. It appears to contain a ${label}.`;
      }
    }
  }
  return null;
}

export function runPostflightGuardrails(content: string, safety: any): string {
  if (!content || !safety) return content;
  if (safety.integrityEnabled !== false) {
    for (const pattern of OUTPUT_BLOCKLIST) {
      if (pattern.test(content)) {
        return "⚠️ The AI response was blocked by the **Integrity** guardrail because it contained potentially unsafe content.";
      }
    }
  }
  if (safety.moderationCategories) {
    const activeCategories = Object.entries(safety.moderationCategories)
      .filter(([_, v]: [string, any]) => v.enabled && v.level === "High")
      .map(([cat]: [string, any]) => cat.toLowerCase());
    if (activeCategories.length > 0) {
      const lower = content.toLowerCase();
      for (const cat of activeCategories) {
        const keywords = cat.split(/\s+/);
        if (keywords.every((kw) => lower.includes(kw))) {
          return `⚠️ The AI response was blocked by the **Content Moderation** guardrail (category: ${cat}).`;
        }
      }
    }
  }
  return content;
}

export function validateBrowserActions(content: string, safety: any): string | null {
  if (!safety || safety.integrityEnabled === false) return null;
  try {
    const validation = validateActionPayload(content);
    if (!validation.valid) {
      return "```json\n" + JSON.stringify({
        action: "respond",
        message: "⚠️ I could not safely execute that because the action format was invalid. Please retry.",
        reasoning: validation.reason || "Invalid action format",
        done: false,
      }) + "\n```";
    }

    const payload = validation.payload;
    const actions = Array.isArray(payload.steps) ? payload.steps : [payload];
    for (const action of actions) {
      if (action.action === "navigate" && action.url) {
        for (const pattern of BLOCKED_URL_PATTERNS) {
          if (pattern.test(action.url)) {
            return "```json\n" + JSON.stringify({
              action: "respond",
              message: `⚠️ Navigation to "${action.url}" was blocked by the **Integrity** guardrail.`,
              reasoning: "Safety guardrail",
              done: false,
            }) + "\n```";
          }
        }
      }
      if (action.action === "click" && action.selector) {
        for (const pattern of BLOCKED_SELECTOR_PATTERNS) {
          if (pattern.test(action.selector)) {
            return "```json\n" + JSON.stringify({
              action: "respond",
              message: `⚠️ Clicking "${action.selector}" was blocked.`,
              reasoning: "Safety guardrail",
              done: false,
            }) + "\n```";
          }
        }
      }
      if (action.action === "type" && action.selector && /password|passwd|secret|card.?number|cvv|cvc|ssn/i.test(action.selector)) {
        return "```json\n" + JSON.stringify({
          action: "respond",
          message: `⚠️ Typing into "${action.selector}" was blocked.`,
          reasoning: "Safety guardrail",
          done: false,
        }) + "\n```";
      }
    }
  } catch { /* non-fatal */ }
  return null;
}
