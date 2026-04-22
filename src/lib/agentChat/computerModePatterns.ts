const EMPLOYEE_COMPUTER_MODE_DIRECT_PATTERNS = [
  /\b(run|execute|perform|carry\s+out)\b.{0,30}\b(sop|standard operating procedure|workflow|task|steps?)\b/i,
  /\b(open|navigate|go\s+to|visit|browse|log\s?in|sign\s?in|click|tap|select|choose|fill|type|enter|submit|scroll|upload|download)\b/i,
];

const EMPLOYEE_COMPUTER_MODE_TARGET_PATTERNS = [
  /\b(on|in|inside|through|using)\b.{0,25}\b(page|browser|site|website|dashboard|app|portal|account|form|crm|ads?\s+manager)\b/i,
  /\b(meta|facebook ads|google ads|linkedin|hubspot|shopify|gmail|slack|notion|airtable|stripe)\b/i,
  /\bthis\s+page\b/i,
];

export function isExplicitEmployeeComputerRequest(message: string) {
  const normalized = message.trim();
  if (!normalized) return false;
  if (/^run\s+.+?:\s*execute the standard operating procedure\.?$/i.test(normalized)) return true;
  if (EMPLOYEE_COMPUTER_MODE_DIRECT_PATTERNS.some((pattern) => pattern.test(normalized))) return true;
  return /^(create|update|edit|delete|launch|publish|build)\b/i.test(normalized)
    && EMPLOYEE_COMPUTER_MODE_TARGET_PATTERNS.some((pattern) => pattern.test(normalized));
}
