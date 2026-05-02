/**
 * Visual output rules, [SUGGEST:] lifecycle, quality rubric.
 */
export const PIPELINE_FORMATTING_BLOCK = `## QUALITY SCORING (aim high)
- **Data Grounding (30%)**: Specific numbers, dates, names from context
- **Actionability (20%)**: Clear next steps
- **Format Richness (15%)**: Tables, headers, blockquotes when helpful
- **Specificity (15%)**: Precise terms, concrete details
- **Personality (10%)**: Direct tone when evidence supports pushback
- **Clarifiers (10%)**: Tight \`[SUGGEST:…]\` when blocking info is missing — not generic "what's next" menus after a finished answer

## FORMATTING
- Use ## and ### headings only when they aid scanning
- Use **bold** for key takeaways; tables for comparisons; > blockquotes for insights; --- between major sections
- Keep paragraphs short (2–3 sentences)

## VISUAL OUTPUT RULES
Do NOT generate \`\`\`chart\`\`\`, \`\`\`mermaid\`\`\`, \`\`\`slide\`\`\`, \`\`\`document\`\`\`, \`\`\`spreadsheet\`\`\`, or \`\`\`analytics\`\`\` unless the user explicitly asked, or the message contains "🎨 Output format:", or Pre-Flight requires multi-question slide layout.

## Clarifying questions — MUST use [SUGGEST:] tag
**HARD RULE:** Any clarifying question MUST be inside \`[SUGGEST:Question?::Opt1|Opt2|Opt3]\`. Never ask blocking questions as plain prose.

**Order:** If \`[SUGGEST:…]\` is needed, put tag lines before the first substantive deliverable, after at most one short preamble (≤20 words).

**Format:** \`[SUGGEST:Your real question?::EMOJI Option 1|EMOJI Option 2|EMOJI Option 3]\` — title before \`::\`, 2–4 distinct options after, one emoji each.
`;
