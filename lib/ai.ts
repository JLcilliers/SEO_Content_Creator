/**
 * Anthropic Claude API integration
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  SYSTEM_PROMPT,
  buildComprehensivePrompt,
  buildGenerationPrompt,
  buildRefinePromptPass2,
} from './prompts';
import { wordCount } from './normalize';

let anthropicClient: Anthropic | null = null;

/**
 * Get or create Anthropic client instance
 */
export function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * Call Claude with messages and system prompt
 * Now includes timeout protection to prevent hanging
 */
async function callClaude(
  userMessage: string,
  system: string,
  temperature: number,
  model: string,
  timeoutMs: number = 90000 // 90 second timeout - increased for complex content generation
): Promise<string> {
  const client = getAnthropic();

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Claude API timeout after ${timeoutMs / 1000}s - consider reducing content length or max_tokens`));
      }, timeoutMs);
    });

    // Create API call promise
    const apiPromise = client.messages.create({
      model,
      max_tokens: 8000, // Reduced from 12000 to speed up generation and prevent timeouts
      temperature,
      system,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Race between API call and timeout
    const response = await Promise.race([apiPromise, timeoutPromise]);

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return content.text;
  } catch (error: any) {
    // Handle timeout errors specifically
    if (error?.message?.includes('timeout')) {
      console.error('[AI] Claude API timeout detected:', error.message);
      throw error;
    }

    // Handle Anthropic API errors
    if (error?.status === 401) {
      throw new Error('Invalid API key. Please check your ANTHROPIC_API_KEY.');
    } else if (error?.status === 404) {
      throw new Error(`Model '${model}' not found. Your API key may not have access to this model.`);
    } else if (error?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error?.error?.message) {
      throw new Error(`Anthropic API error: ${error.error.message}`);
    } else if (error?.message) {
      throw new Error(`Claude API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Generate SEO content with single comprehensive pass
 * Optimized for Vercel 60s timeout - eliminates second API call
 */
export async function generateWithRefinement(
  context: string,
  topic: string,
  keywords: string[],
  targetLength: number,
  additionalNotes?: string
): Promise<string> {
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
  const temperature = parseFloat(process.env.PROMPT_TEMPERATURE || '0.2');

  const joinedKeywords = keywords.join(', ');

  // Single comprehensive pass - publication-ready content
  console.log(`Generating publication-ready SEO content (single-pass)${additionalNotes ? ' with additional notes' : ''}...`);
  const comprehensivePrompt = buildComprehensivePrompt(context, topic, joinedKeywords, targetLength, additionalNotes);
  const finalContent = await callClaude(comprehensivePrompt, SYSTEM_PROMPT, temperature, model);

  // Extract content block to verify word count
  const contentMatch = finalContent.match(/===CONTENT START===\s*([\s\S]*?)\s*===CONTENT END===/);
  const contentText = contentMatch ? contentMatch[1] : finalContent;
  const finalCount = wordCount(contentText);

  console.log(`Generated content word count: ${finalCount} (target: ${targetLength})`);

  return finalContent;
}

/**
 * LEGACY: Generate SEO content with 2-pass refinement
 * Kept as backup - use for very long content (>2000 words) if needed
 * WARNING: May timeout on Vercel with 60s limit
 */
export async function generateWithRefinementTwoPass(
  context: string,
  topic: string,
  keywords: string[],
  targetLength: number
): Promise<string> {
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
  const temperature = parseFloat(process.env.PROMPT_TEMPERATURE || '0.2');

  const joinedKeywords = keywords.join(', ');

  // Pass 1: Generate first draft
  console.log('Pass 1: Generating initial draft...');
  const generationPrompt = buildGenerationPrompt(context, topic, joinedKeywords, targetLength);
  const draft1 = await callClaude(generationPrompt, SYSTEM_PROMPT, temperature, model);

  // Extract content block to check word count
  const contentMatch = draft1.match(/===CONTENT START===\s*([\s\S]*?)\s*===CONTENT END===/);
  const contentText = contentMatch ? contentMatch[1] : draft1;
  const currentCount1 = wordCount(contentText);

  console.log(`Draft 1 word count: ${currentCount1} (target: ${targetLength})`);

  // Pass 2: Comprehensive refinement and polish
  console.log('Pass 2: Refining and finalizing...');
  const lengthGuidance = currentCount1 < targetLength * 0.8
    ? `Content is too short (${currentCount1} words). Expand sections with more details from site context to reach ${targetLength} words.`
    : currentCount1 > targetLength * 1.2
    ? `Content is too long (${currentCount1} words). Condense to approximately ${targetLength} words while keeping all essential information.`
    : `Length is good (${currentCount1} words). Maintain depth while polishing.`;

  const refinePrompt = buildRefinePromptPass2(context, draft1, targetLength, lengthGuidance);
  const finalDraft = await callClaude(refinePrompt, SYSTEM_PROMPT, temperature, model);

  const contentMatch2 = finalDraft.match(/===CONTENT START===\s*([\s\S]*?)\s*===CONTENT END===/);
  const contentText2 = contentMatch2 ? contentMatch2[1] : finalDraft;
  const finalCount = wordCount(contentText2);

  console.log(`Final word count: ${finalCount} (target: ${targetLength})`);

  return finalDraft;
}
