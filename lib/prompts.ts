/**
 * Enhanced prompt templates for SEO-optimized content generation with Claude API
 */

export const SYSTEM_PROMPT = `You are an elite SEO content strategist and expert copywriter specializing in creating comprehensive, search-optimized content that ranks well in both traditional search engines and AI-powered systems like ChatGPT, Gemini, and Perplexity.

CRITICAL ANTI-HALLUCINATION RULES:
- Strictly use ONLY facts and information explicitly present in the provided site context
- Never invent statistics, dates, prices, client names, certifications, testimonials, or quotes
- If specific details are missing from site context, speak generally or omit entirely
- When generating examples, base them on concepts present in site context, not invented scenarios
- Match the site's actual tone, terminology, and voice
- For any claims requiring data, only use information available in the site context

CONTENT QUALITY STANDARDS:
- Write in natural, human-like language with varied sentence lengths
- Avoid robotic phrasing, clichés, and keyword stuffing
- Use active voice 80% of the time
- Keep sentences under 20 words when possible
- Limit paragraphs to 3-4 sentences
- Every sentence must provide real value - no fluff

FORMATTING RULES:
- Use markdown for all headings (H1-H4) and formatting
- Global rule: NEVER use an em dash - always use a normal hyphen instead
- Use proper markdown tables, lists, and blockquotes
- Bold important terms and key concepts
- Create scannable, visually organized content`;

export function buildComprehensivePrompt(
  siteContext: string,
  topic: string,
  joinedKeywords: string,
  length: number
): string {
  return `You are creating publication-ready, SEO-optimized content for the website described below. This is a comprehensive single-pass generation - produce final, polished content ready for immediate publishing. Use ONLY the site context for all factual claims, examples, and specific information.

[SITE CONTEXT START]
${siteContext}
[SITE CONTEXT END]

CONTENT PARAMETERS:
Topic: ${topic}
Primary Keywords: ${joinedKeywords}
Target Length: ${length} words (±5% acceptable for quality - prioritize comprehensive coverage)

ADVANCED SEO OPTIMIZATION REQUIREMENTS:

1. KEYWORD STRATEGY:
   - Use primary keyword naturally in first 100 words
   - Include 5-7 keyword variations throughout (e.g., "web design", "website design", "site design")
   - Add 3-5 question-based variations (e.g., "what is web design", "how does web design work")
   - Maintain 0.5-1.5% keyword density for primary term
   - Use keywords only where they fit naturally - never force them

2. HEADING STRUCTURE (Critical):
   - H1: Question format OR benefit-focused title with primary keyword front-loaded
   - Convert 40% of H2 headings to user-focused questions starting with: "Why", "What", "How", "When", "Who"
   - Each heading should promise a specific answer or insight
   - Use H3 subheadings to break down complex H2 sections
   - Ensure logical hierarchy (H1 → H2 → H3) for optimal scannability

3. CONTENT ARCHITECTURE:

   Introduction (150-200 words):
   - First sentence: Include primary keyword naturally
   - If topic is a question, provide a direct 1-2 sentence answer immediately
   - Hook with relatable problem or benefit
   - Preview what the article will cover

   Body Sections:
   - Each H2 section should be 200-300 words minimum
   - Start each section with the most important information first
   - Use H3 subheadings to break into focused subsections (150-200 words each)
   - Include transition phrases between sections

   Required Formatted Elements (add where relevant based on topic):
   - At least 1 comparison table (if applicable)
   - 2-3 bullet or numbered lists
   - 1-2 key takeaway blockquotes (use > for blockquotes)
   - Step-by-step processes where applicable

   Conclusion (150-200 words):
   - Summarize key points
   - Provide clear next steps or call-to-action based on site context
   - End with encouraging, actionable guidance

4. ANSWER OPTIMIZATION:
   - For question-based headings, answer directly in the first sentence
   - Follow pattern: [Direct answer] → [Explanation] → [Supporting details] → [Examples if available in context]
   - Make each section work independently - readers should find complete answers quickly

5. ENGAGEMENT & TRUST SIGNALS:
   - Use specific details from site context throughout
   - Include timeframes when available (e.g., "within 2-4 weeks")
   - Add measurements or specifics when present in context
   - Use transitional phrases: "This means that...", "In other words...", "The key point is..."
   - Create relatable scenarios based on services/products mentioned in site context
   - Ensure every sentence adds value - eliminate fluff entirely

6. READABILITY OPTIMIZATION:
   - Vary sentence length for natural, conversational flow
   - Use active voice predominantly (80%+)
   - Break up text with formatted elements every 200-300 words
   - Bold key terms and important concepts appropriately
   - Use short paragraphs (3-4 sentences max)
   - Polish sentence flow for clarity and engagement
   - Remove any redundancy, wordiness, or robotic phrasing

OUTPUT FORMAT (MANDATORY):

META TITLE: <50-60 characters, primary keyword front-loaded, compelling and accurate>
META DESCRIPTION: <150-160 characters, include primary keyword, compelling call-to-action, based on actual site offerings>

===CONTENT START===

# [H1: Question-based or benefit-focused title with primary keyword]

[Introduction paragraph with keyword in first sentence, direct answer if question-based topic, article preview]

## [H2: Question format using "What", "Why", "How", etc. - aim for 40% of H2s as questions]

[First sentence: Direct answer to the question if applicable]

[Detailed explanation paragraph]

[Supporting details and examples from site context]

### [H3: Specific aspect #1]

[Focused content 150-200 words]

### [H3: Specific aspect #2]

[Focused content 150-200 words]

## [H2: Another main section - can be statement or question]

[Content following same pattern]

[Include formatted elements where relevant]:
- Bullet lists with ✓ or numbered steps
- Comparison tables using markdown table format
- Blockquotes for key takeaways using >
- Bold terms for emphasis

## [H2: Practical application or solutions section]

[Actionable information based on site's services/products]

## [Conclusion with Next Steps]

[Summary and clear guidance based on site context]

===CONTENT END===

===FAQ START===
Provide 5-7 Q&A pairs related to the topic and the business. Format each as:
Q: [Specific question users would ask, incorporating keyword variations]
A: [Complete, helpful answer using only site context information - 2-4 sentences]

Make FAQs highly specific and valuable. Use question formats that users actually search for.
===FAQ END===

===SCHEMA START===
Generate valid JSON-LD schema for both Article and FAQPage. Ensure all fields are accurate based on site context. Use organization/author info from context.
\`\`\`json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "[Article title]",
      "description": "[Meta description]",
      "author": {
        "@type": "Organization",
        "name": "[From site context]"
      },
      "publisher": {
        "@type": "Organization",
        "name": "[From site context]"
      },
      "datePublished": "[Current date]",
      "dateModified": "[Current date]"
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "[FAQ question 1]",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "[FAQ answer 1]"
          }
        }
      ]
    }
  ]
}
\`\`\`
===SCHEMA END===

QUALITY ASSURANCE CHECKLIST (Verify Before Submission):
✓ All facts verified against site context - no invented information
✓ Primary keyword in first 100 words naturally
✓ 40% of H2 headings are question-format
✓ Keyword density 0.5-1.5% for primary term
✓ Meta title 50-60 chars with keyword front-loaded
✓ Meta description 150-160 chars with keyword and compelling CTA
✓ Each H2 section is 200-300 words minimum
✓ Question-based headings have direct answers in first sentence
✓ Formatted elements present (lists, tables, blockquotes)
✓ 5-7 FAQ questions with complete answers
✓ Valid JSON-LD schema with accurate site context information
✓ No em dashes anywhere - only hyphens
✓ Natural, human language throughout
✓ Every sentence adds value - no fluff
✓ Clear next steps in conclusion based on site context
✓ Content feels complete, authoritative, and publication-ready

REMEMBER:
This is a single-pass generation - produce FINAL, POLISHED content ready for immediate publishing. Triple-check accuracy, optimize SEO elements, ensure readability, and verify all formatting. No revision pass will follow.`;
}

export function buildRefinePromptPass1(
  siteContext: string,
  draft: string,
  length: number,
  lengthNote: string
): string {
  return `You are refining the SEO content draft below to enhance its optimization and value while maintaining strict factual accuracy.

[SITE CONTEXT START]
${siteContext}
[SITE CONTEXT END]

[DRAFT START]
${draft}
[DRAFT END]

REFINEMENT CHECKLIST:

1. ACCURACY VERIFICATION (Critical):
   - Remove or correct ANY claim not explicitly in site context
   - Verify no invented statistics, dates, prices, names, or testimonials
   - Ensure all examples are based on concepts from site context
   - Check that all service/product mentions align with actual site offerings

2. SEO ENHANCEMENT:
   - Verify primary keyword appears in first 100 words
   - Confirm 40% of H2 headings are question-format
   - Check keyword density is 0.5-1.5% for primary term
   - Ensure meta title is 50-60 chars, meta description 150-160 chars
   - Verify both meta fields include primary keyword naturally

3. CONTENT DEPTH:
   - Each H2 section should be 200-300 words minimum
   - Add specific details from site context where sections feel thin
   - Ensure every question-based heading has a direct answer in first sentence
   - Verify formatted elements (lists, tables, blockquotes) are present
   - Check that FAQs are 5-7 questions with complete answers

4. STRUCTURE & READABILITY:
   - Confirm logical heading hierarchy (H1 → H2 → H3)
   - Check paragraph length (3-4 sentences max)
   - Verify sentence variety and active voice usage
   - Ensure smooth transitions between sections
   - Remove any robotic phrasing or clichés

5. ENGAGEMENT OPTIMIZATION:
   - Add transition phrases: "This means...", "In other words..."
   - Ensure key terms are bolded
   - Verify blockquotes highlight important takeaways
   - Check that content feels human and conversational

6. LENGTH ADJUSTMENT:
   - Target: ${length} words for article body
   - ${lengthNote || 'Ensure comprehensive coverage without filler'}
   - Add depth by expanding on concepts from site context, not by padding

7. SCHEMA VALIDATION:
   - Verify JSON-LD structure is valid
   - Check all schema fields use accurate information from site context
   - Ensure FAQ schema matches FAQ section exactly

CRITICAL REMINDERS:
- Never use em dashes - only hyphens
- Maintain exact output format with all required fences and labels
- Keep FAQ count at 5-7 questions
- Use ONLY site context for all facts

Output the fully refined version in the exact required format with all fences and labels.`;
}

export function buildRefinePromptPass2(
  siteContext: string,
  draft: string,
  length: number,
  lengthNote: string
): string {
  return `Comprehensive refinement and final polish pass. Transform the draft into publication-ready SEO content. Use only site context for all factual information.

[SITE CONTEXT START]
${siteContext}
[SITE CONTEXT END]

[DRAFT START]
${draft}
[DRAFT END]

COMPREHENSIVE REFINEMENT CHECKLIST:

1. ACCURACY VERIFICATION (Critical Priority):
   - Remove or correct ANY claim not explicitly in site context
   - Verify no invented statistics, dates, prices, names, or testimonials
   - Ensure all examples are based on concepts from site context
   - Check that all service/product mentions align with actual site offerings
   - Triple-check no fabricated facts slipped through

2. SEO OPTIMIZATION:
   - Verify primary keyword appears in first 100 words naturally
   - Confirm 40% of H2 headings are question-format
   - Check keyword density is 0.5-1.5% for primary term
   - Ensure meta title is 50-60 chars with keyword front-loaded
   - Ensure meta description is 150-160 chars with keyword and CTA
   - Verify heading hierarchy is optimal for scannability

3. CONTENT DEPTH & STRUCTURE:
   - Each H2 section should be 200-300 words minimum
   - Add specific details from site context where sections feel thin
   - Ensure every question-based heading has a direct answer in first sentence
   - Verify formatted elements (lists, tables, blockquotes) are present and well-placed
   - Check that FAQs are 5-7 questions with complete, helpful answers
   - Confirm logical heading hierarchy (H1 → H2 → H3)

4. READABILITY & ENGAGEMENT:
   - Polish sentence flow and clarity
   - Ensure natural, conversational tone throughout
   - Remove any redundancy, wordiness, or robotic phrasing
   - Verify every sentence adds value - eliminate fluff
   - Check paragraph length (3-4 sentences max)
   - Verify sentence variety and active voice usage
   - Add transition phrases: "This means...", "In other words...", "The key point is..."
   - Ensure key terms are bolded appropriately
   - Verify blockquotes highlight important takeaways

5. USER VALUE VERIFICATION:
   - Can users find answers quickly?
   - Does each section deliver on its heading's promise?
   - Are there clear next steps in the conclusion?
   - Is the content actionable and practical?
   - Does it feel complete and authoritative?

6. FORMATTING VALIDATION:
   - Verify all markdown formatting is correct
   - Check that tables render properly (if applicable)
   - Ensure blockquotes use > format correctly
   - Confirm bullet lists and numbered lists are formatted correctly
   - Verify bold terms are appropriately highlighted
   - Check for typos or grammatical issues

7. LENGTH ADJUSTMENT:
   - Target: ${length} words for article body (±5% acceptable)
   - ${lengthNote || 'Ensure comprehensive coverage without filler'}
   - Add depth by expanding on concepts from site context, not by padding
   - Content should feel complete and authoritative

8. SCHEMA & OUTPUT FORMAT:
   - Verify JSON-LD structure is valid and parses correctly
   - Check all schema fields use accurate information from site context
   - Ensure FAQ schema matches FAQ section exactly
   - Confirm all required fences present (META TITLE, CONTENT START/END, FAQ START/END, SCHEMA START/END)
   - Verify FAQ count is 5-7 questions
   - Schema must be in proper JSON code fence
   - No formatting errors or broken markdown

CRITICAL GLOBAL RULES:
- NO em dashes anywhere - only hyphens
- Human, natural language throughout
- Site context used exclusively for all facts
- Value-driven content, no fluff
- Maintain exact output format with all required fences and labels

Return the complete, publication-ready content in the exact required format with all fences and labels.`;
}
