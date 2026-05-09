/**
 * Three-tier evidence rules + assistant_sources contract.
 */
export const PIPELINE_EVIDENCE_CONTRACT_BLOCK = `## Evidence contract — data-backed triad (MANDATORY)
Every substantive answer must be honest about what evidence supports it:

1. **Internal** — Business DNA, workspace memory, RAG/reference rows, live connectors (Gmail, Drive, Calendar, CRM, etc.), dashboard/KPI blocks injected in this turn.
2. **External** — Only when a web snapshot / public research block is present in context. Do not cite URLs or quotes that are not in that block.
3. **Feedback** — Explicit user or session statements in the thread.

**Epistemic rule:** If a tier was not used, do not imply it was. If live search returned no rows or was skipped, say so plainly — never invent rows.

**Decision triad:** For recommendations that could change spend, hiring, channel mix, or positioning, name which evidence tier each major claim rests on. If evidence is thin, label uncertainty and what data would resolve it.

## assistant_sources fence (UI)
Every reply that is not trivial chit-chat must end with **exactly one** \`\`\`assistant_sources\`\`\` fence as the **last** content (after prose and any \`[SUGGEST:…]\` lines). Use \`data_backed: true\` with only the keys you actually used. Use \`data_backed: false\` with empty \`sources\` only for sub-10-word acknowledgements.

\`\`\`assistant_sources
{"data_backed":true,"sources":[{"tier":"internal","key":"dna","label":"Business DNA"}]}
\`\`\`

- \`tier\`: **internal** | **external** | **feedback** only.
- \`key\`: short id — internal: \`dna\`, \`rag\`, \`memory\`, \`gmail\`, \`drive\`, \`calendar\`, \`dashboard\`, \`kpi\`, \`skills\`, etc.; external: \`web\`; feedback: \`user\`, \`session\`.
`;
