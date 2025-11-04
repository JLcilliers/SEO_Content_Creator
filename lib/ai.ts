/**
 * Anthropic Claude API integration
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  SYSTEM_PROMPT,
  buildGenerationPrompt,
  buildRefinePromptPass1,
  buildRefinePromptPass2,
} from './prompts';
import { wordCount, getLengthNote } from './normalize';

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
 */
async function callClaude(
  userMessage: string,
  system: string,
  temperature: number,
  model: string
): Promise<string> {
  const client = getAnthropic();

  const response = await client.messages.create({
    model,
    max_tokens: 16000,
    temperature,
    system,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return content.text;
}

/**
 * Generate SEO content with 3-pass refinement
 */
export async function generateWithRefinement(
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
  const lengthNote1 = getLengthNote(currentCount1, targetLength);

  console.log(`Draft 1 word count: ${currentCount1} (target: ${targetLength})`);

  // Pass 2: Refine with accuracy, tone, SEO, and length adjustment
  console.log('Pass 2: Refining for accuracy, tone, and SEO...');
  const refinePrompt1 = buildRefinePromptPass1(context, draft1, targetLength, lengthNote1);
  const draft2 = await callClaude(refinePrompt1, SYSTEM_PROMPT, temperature, model);

  // Check word count again for pass 2
  const contentMatch2 = draft2.match(/===CONTENT START===\s*([\s\S]*?)\s*===CONTENT END===/);
  const contentText2 = contentMatch2 ? contentMatch2[1] : draft2;
  const currentCount2 = wordCount(contentText2);
  const lengthNote2 = getLengthNote(currentCount2, targetLength);

  console.log(`Draft 2 word count: ${currentCount2} (target: ${targetLength})`);

  // Pass 3: Final polish
  console.log('Pass 3: Final polish...');
  const refinePrompt2 = buildRefinePromptPass2(context, draft2, targetLength, lengthNote2);
  const finalDraft = await callClaude(refinePrompt2, SYSTEM_PROMPT, temperature, model);

  const contentMatch3 = finalDraft.match(/===CONTENT START===\s*([\s\S]*?)\s*===CONTENT END===/);
  const contentText3 = contentMatch3 ? contentMatch3[1] : finalDraft;
  const finalCount = wordCount(contentText3);

  console.log(`Final word count: ${finalCount} (target: ${targetLength})`);

  return finalDraft;
}
