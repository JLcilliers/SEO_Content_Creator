/**
 * Normalization utilities for URLs, keywords, and word counting
 */

/**
 * Normalize a URL to ensure it has https protocol and proper formatting
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim();

  // Ensure protocol
  if (!normalized.match(/^https?:\/\//i)) {
    normalized = 'https://' + normalized;
  }

  // Force https
  normalized = normalized.replace(/^http:\/\//i, 'https://');

  // Remove trailing slash for consistency in base URL
  try {
    const urlObj = new URL(normalized);
    return urlObj.origin + urlObj.pathname.replace(/\/$/, '') + urlObj.search + urlObj.hash;
  } catch {
    return normalized;
  }
}

/**
 * Split comma-separated keywords, trim, and deduplicate
 */
export function splitKeywords(keywords: string): string[] {
  if (!keywords || !keywords.trim()) {
    return [];
  }

  const parts = keywords
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  // Deduplicate case-insensitively but preserve original case
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(part);
    }
  }

  return result;
}

/**
 * Count words in a markdown string
 * Strips markdown formatting and counts meaningful words
 */
export function wordCount(markdown: string): number {
  if (!markdown || !markdown.trim()) {
    return 0;
  }

  // Remove markdown formatting
  let text = markdown
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]*`/g, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
    // Remove headers markup
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove special characters but keep spaces
    .replace(/[^\w\s'-]/g, ' ');

  // Split by whitespace and count non-empty tokens
  const words = text
    .split(/\s+/)
    .filter((word) => word.length > 0 && /[a-zA-Z0-9]/.test(word));

  return words.length;
}

/**
 * Calculate length note for refinement prompts
 */
export function getLengthNote(currentCount: number, targetCount: number): string {
  const delta = currentCount - targetCount;
  const percentOff = Math.abs((delta / targetCount) * 100);

  // Within 5% is acceptable
  if (percentOff <= 5) {
    return '';
  }

  const direction = delta > 0 ? 'above' : 'below';
  const action = delta > 0 ? 'Reduce' : 'Expand';
  const amount = Math.abs(delta);

  return `Current count ${currentCount} words which is ${Math.round(percentOff)} percent ${direction} target. ${action} by about ${amount} words with real site details only, no filler.`;
}
