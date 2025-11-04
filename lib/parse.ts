/**
 * Parse Claude's structured output into sections
 */

import type { ParsedSections } from './typing';

/**
 * Extract meta title from the output
 */
function extractMetaTitle(text: string): string {
  const match = text.match(/META TITLE:\s*(.+?)(?:\n|$)/i);
  if (!match) {
    throw new Error('META TITLE not found in output');
  }
  return match[1].trim();
}

/**
 * Extract meta description from the output
 */
function extractMetaDescription(text: string): string {
  const match = text.match(/META DESCRIPTION:\s*(.+?)(?:\n|$)/i);
  if (!match) {
    throw new Error('META DESCRIPTION not found in output');
  }
  return match[1].trim();
}

/**
 * Extract content block between markers
 */
function extractContent(text: string): string {
  const match = text.match(/===CONTENT START===\s*([\s\S]*?)\s*===CONTENT END===/);
  if (!match) {
    throw new Error('CONTENT block not found in output');
  }
  return match[1].trim();
}

/**
 * Extract FAQ block between markers
 */
function extractFAQ(text: string): string {
  const match = text.match(/===FAQ START===\s*([\s\S]*?)\s*===FAQ END===/);
  if (!match) {
    throw new Error('FAQ block not found in output');
  }
  return match[1].trim();
}

/**
 * Extract schema JSON from the output
 */
function extractSchema(text: string): { jsonString: string; json: object } {
  const match = text.match(/===SCHEMA START===\s*([\s\S]*?)\s*===SCHEMA END===/);
  if (!match) {
    throw new Error('SCHEMA block not found in output');
  }

  const schemaBlock = match[1].trim();

  // Extract JSON from code fence
  const jsonMatch = schemaBlock.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) {
    throw new Error('JSON code fence not found in SCHEMA block');
  }

  const jsonString = jsonMatch[1].trim();

  // Validate JSON
  try {
    const json = JSON.parse(jsonString);
    return { jsonString, json };
  } catch (error) {
    throw new Error(`Invalid JSON in SCHEMA block: ${error}`);
  }
}

/**
 * Parse all sections from Claude's output
 */
export function parseSections(text: string): ParsedSections {
  try {
    const metaTitle = extractMetaTitle(text);
    const metaDescription = extractMetaDescription(text);
    const contentMarkdown = extractContent(text);
    const faqRaw = extractFAQ(text);
    const { jsonString: schemaJsonString, json: schemaJson } = extractSchema(text);

    return {
      metaTitle,
      metaDescription,
      contentMarkdown,
      faqRaw,
      schemaJsonString,
      schemaJson,
    };
  } catch (error) {
    console.error('Parse error:', error);
    throw new Error(`Failed to parse Claude output: ${error}`);
  }
}

/**
 * Safely truncate a string to a maximum length
 */
export function safeTruncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}
