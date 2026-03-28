

## Plan: Replace SOP tab with Settings (Safety Guardrails) in Business DNA

### What changes

Remove the "SOP" tab from Business DNA and replace it with a "Settings" tab. Inside Settings, add a "Safety" section with four guardrail categories matching the uploaded reference images. These guardrails will be stored per-brand and injected into AI employee system prompts at runtime.

### Safety Guardrail Categories

1. **Focus guardrail** -- Toggle to keep agents focused on their defined goal, preventing off-topic behavior
2. **Prompt Injection** -- Toggle to block attempts to bypass or override system instructions  
3. **Moderation guardrails** -- Panel with toggleable categories (Sexual, Violence, Violence Graphic, Harassment, Harassment Threatening, Hate, Hate Threatening, Self Harm, Self Harm Intent, Self Harm Instructions), each with a severity dropdown (Low/Medium/High) and an All/None quick toggle
4. **Custom guardrails** -- List of user-defined guardrails with Name + Prompt fields, plus "Add new guardrail" button

### Storage

Store guardrail settings on the `BrandEntry` interface as a new `safetySettings` field (persisted in the brand's JSON content in `user_business_data`). No database migration needed -- brand data is already stored as JSON in the `content` column.

```typescript
interface SafetySettings {
  focusEnabled: boolean;
  promptInjectionEnabled: boolean;
  moderationCategories: Record<string, { enabled: boolean; level: "Low" | "Medium" | "High" }>;
  customGuardrails: { name: string; prompt: string }[];
}
```

### Making them work

Update the `run-employee` edge function's `buildSystemPrompt` to:
1. Load the linked brand's safety settings from the business data
2. If **Focus** is enabled, append a focus enforcement section to the system prompt
3. If **Prompt Injection** is enabled, append prompt injection defense instructions
4. If **Moderation** categories are enabled, append content filtering instructions listing each active category and its severity level
5. If **Custom guardrails** exist, append each custom guardrail's blocking prompt

Also update the `extension-agent` edge function similarly if it has brand context.

### Files to create/modify

1. **New file: `src/components/database/SettingsView.tsx`** -- Settings tab UI with Safety section containing the four guardrail panels (Focus toggle, Prompt Injection toggle, Moderation guardrails dialog, Custom guardrails dialog). Uses Switches, Dialogs, Select dropdowns matching the reference images but with the app's theme.

2. **`src/components/database/BusinessDNAView.tsx`** -- Replace "sop" segment with "settings" (icon: `Settings`), render `<SettingsView>` instead of SOP coming-soon placeholder. Update `segmentEntries` state keys.

3. **`src/components/database/BusinessDNAContext.tsx`** -- Add `safetySettings` to `BrandEntry` interface with defaults.

4. **`supabase/functions/run-employee/index.ts`** -- In `loadBusinessContext` or `buildSystemPrompt`, parse the linked brand's safety settings from the brand JSON content and inject corresponding prompt sections.

### Technical Details

- The Settings view receives `activeBrandId` and reads/writes the brand's `safetySettings` via the `BusinessDNAContext` (same pattern as other brand fields -- updating the brands array triggers the existing sync-to-DB effect).
- Moderation guardrails dialog uses a scrollable panel similar to the reference, with Switch + Select per category.
- Custom guardrails uses a list + "Add new guardrail" form with Name and Prompt fields.
- The run-employee edge function parses the brand content JSON to extract safety settings and builds additional system prompt sections dynamically.

