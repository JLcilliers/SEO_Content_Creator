/**
 * Prompt templates for Claude API calls
 */

export const SYSTEM_PROMPT = `You are an expert SEO copywriter who strictly uses only the provided site context for factual claims. Never state or imply any fact that is not clearly present in the site context. If a requested detail is missing, omit it or speak generally without numbers or specifics. Match the site's tone and style. Avoid over-optimization and keyword stuffing. Use natural phrasing and varied sentence lengths so the writing feels human. Use markdown headings for H1 to H4 and lists. Global rule: never use an em dash, use a normal hyphen instead.`;

export function buildGenerationPrompt(
  siteContext: string,
  topic: string,
  joinedKeywords: string,
  length: number
): string {
  return `You are writing a new page for the website described below. Use only this site context for facts, voice, and terminology.

[SITE CONTEXT START]
${siteContext}
[SITE CONTEXT END]

Inputs:

Topic: ${topic}

Keywords to include naturally: ${joinedKeywords}

Target length: about ${length} words

Output format is mandatory. Use these exact section fences and labels:

META TITLE: <about 50-60 chars, include the primary keyword once, natural human wording>
META DESCRIPTION: <about 150-160 chars, include the primary keyword once, compelling and accurate>

===CONTENT START===

<H1 title for the article>

Intro: if the topic is question-like, open with a short direct answer in 1-2 sentences that an AI overview can quote. Then expand with helpful context.

Use H2 and H3 to structure the piece. Write clear, specific, useful paragraphs that align with the site context. Include keywords sparingly and only where they fit. Do not invent stats, dates, prices, client names, certifications, or quotes that are not in the site context. Match the site's tone and style.
===CONTENT END===

===FAQ START===
Provide 3 to 5 Q&A pairs about the topic and the business as described in the site context, each formatted as:
Q: <question>
A: <short accurate answer from site context, no invented details>
===FAQ END===

===SCHEMA START===
Provide valid JSON-LD for Article and FAQPage that matches the content exactly. Put it inside a fenced json block. Use the organization or site name from context if available for author or publisher fields.
\`\`\`json
{ ... }
\`\`\`
===SCHEMA END===`;
}

export function buildRefinePromptPass1(
  siteContext: string,
  draft: string,
  length: number,
  lengthNote: string
): string {
  return `You are editing the draft below. Use only the site context for facts.

[SITE CONTEXT START]
${siteContext}
[SITE CONTEXT END]

[DRAFT START]
${draft}
[DRAFT END]

Checklist:

Accuracy: remove or correct any claim not supported by the site context. No invented numbers, dates, or names.

Tone: match the site's voice. Make the writing feel human. Vary sentence length. Remove clichés and robotic phrasing.

SEO: keep meta title about 50-60 chars, description about 150-160 chars. Include main keyword once in each, no stuffing. Improve headings and scannability. Add direct answer in intro if helpful.

Keywords: use them only where natural. Prefer synonyms to reduce repetition.

Length: target about ${length} words for the article body. ${lengthNote}

Structure: keep required fences and labels exactly. Keep FAQ count in range 3-5. Keep JSON-LD valid and matching the content.

Global rule: never use an em dash.

Now output the fully revised version in the exact required format with the same fences and labels.`;
}

export function buildRefinePromptPass2(
  siteContext: string,
  draft: string,
  length: number,
  lengthNote: string
): string {
  return `Final polish. Use only the site context for facts.

[SITE CONTEXT START]
${siteContext}
[SITE CONTEXT END]

[DRAFT START]
${draft}
[DRAFT END]

Final checklist:

Micro-edits for clarity, flow, and human cadence.

Eliminate any lingering redundancy or filler.

Ensure headings hierarchy is logical and helpful.

Verify meta lengths and that schema JSON parses.

Ensure article body length is within ±5 percent of ${length}. ${lengthNote}

Global rule: never use an em dash.

Return the complete final content in the exact required format with the same fences and labels.`;
}
