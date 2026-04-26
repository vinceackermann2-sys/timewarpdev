const BUSINESS_CONTEXT_RULE = `\n\nIMPORTANT: You MUST use the business's actual brand, product, audience, and any verified metrics from the Reference Material to personalize this graphic. Cross-check every claim against that business data before answering. Never create generic content, placeholders, or made-up numbers. If key business details are missing, clearly say what is missing instead of inventing it.`;

function documentInstruction(dateStr: string): string {
  return `You MUST create a professional document that directly answers the user's question above. Analyze their request carefully and produce a well-structured document with relevant, specific content.${BUSINESS_CONTEXT_RULE}
Include a \`\`\`document code block with JSON BEFORE your text explanation:
\`\`\`document
{"title":"Relevant Title","sections":[{"heading":"Section Heading","content":"Detailed content addressing the user's question"}],"date":"${dateStr}"}
\`\`\`
Make sections comprehensive with real actionable content related to the question. Then provide a brief summary below.`;
}

const GRAPHIC_INSTRUCTIONS_STATIC: Record<string, string> = {
  Graph: `You MUST create a chart/graph that visualizes data relevant to the user's question above. Think about what data would be most useful to show visually for their request.${BUSINESS_CONTEXT_RULE}
Include a \`\`\`chart code block with JSON BEFORE your text explanation:
\`\`\`chart
{"type":"bar","title":"Chart Title","xKey":"label","yKeys":["value"],"data":[{"label":"A","value":10}]}
\`\`\`
Supported types: bar, line, area, pie. For pie use nameKey and valueKey. Use realistic, relevant data that helps answer their question. Titles, labels, segments, and insights must reflect the business's actual brand, product, and audience context. Then explain the data below.`,
  Analytics: `You MUST create an analytics dashboard with metrics directly relevant to the user's question above. Choose metrics that would genuinely help them understand the topic.${BUSINESS_CONTEXT_RULE}
Include a \`\`\`analytics code block with JSON BEFORE your text explanation:
\`\`\`analytics
{"title":"Analytics Title","metrics":[{"label":"Metric","value":"100","change":5.2}],"insights":["Key insight"],"chart":{"data":[{"month":"Jan","value":100}],"xKey":"month","yKeys":["value"]}}
\`\`\`
Each metric: label, value, change (positive=growth, negative=decline), unit. Create metrics that directly answer the user's question and tie them to the business's actual offer, brand, or audience. Then explain below.`,
  Spreadsheet: `You MUST create a spreadsheet/table with data directly relevant to the user's question above. Organize the data in a way that helps them understand or act on their request.${BUSINESS_CONTEXT_RULE}
Include a \`\`\`spreadsheet code block with JSON BEFORE your text explanation:
\`\`\`spreadsheet
{"title":"Table Title","headers":["Col1","Col2"],"rows":[["A","B"],["C","D"]],"footer":["Total","100"]}
\`\`\`
Footer is optional. Fill with realistic, relevant data that addresses their question. Column names and rows must reflect the business's actual product, audience, offer, or verified metrics. Then explain below.`,
  Slide: `You MUST create a visually rich presentation slide with content directly relevant to the user's question above.${BUSINESS_CONTEXT_RULE}
Include a \`\`\`slide code block with JSON BEFORE your text explanation:
\`\`\`slide
{"title":"Slide Title","subtitle":"Context","layout":"stat-callout","icon":"🚀","stats":[{"value":"$2.4M","label":"ARR"},{"value":"15K","label":"Users"}],"bullets":["Key point 1","Key point 2"],"takeaway":"Main takeaway","accent_color":"#4a86ff"}
\`\`\`
Supported layouts: "bullets" (default list), "stat-callout" (big numbers + optional bullets), "two-column" (use left_column and right_column arrays), "title-only".
Always include an icon emoji. Use stats with large formatted numbers when presenting metrics. The slide must clearly reflect this business's DNA, product, and target audience. Use the business's actual data for stats. Then provide additional context below.`,
};

/** Appends graphic-format instructions when a graphic mode is selected (same strings as legacy inline block). */
export function appendGraphicInstructionsToUserContent(
  userContent: string,
  selectedGraphic: string | null,
): string {
  if (!selectedGraphic) return userContent;
  const instruction =
    selectedGraphic === "Document"
      ? documentInstruction(new Date().toLocaleDateString())
      : GRAPHIC_INSTRUCTIONS_STATIC[selectedGraphic];
  if (!instruction) return userContent;
  return `${userContent}\n\n🎨 Output format: ${selectedGraphic}\n${instruction}`;
}
