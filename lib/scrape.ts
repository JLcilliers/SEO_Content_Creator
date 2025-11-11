/**
 * Web scraping functionality using axios and cheerio
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import type { CrawlResult, ScrapedPage, LinkScore } from './typing';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Fetch HTML from a URL with timeout and user agent
 */
export async function fetchHtml(url: string, timeoutMs = 12000): Promise<string> {
  const response = await axios.get(url, {
    timeout: timeoutMs,
    headers: {
      'User-Agent': USER_AGENT,
    },
    maxRedirects: 5,
  });

  return response.data;
}

/**
 * Extract main text content from HTML
 * Prioritizes <main> element, removes nav/header/footer/aside
 * Keeps only semantic content: h1-h3, p, li, blockquote
 */
export function extractMainText(html: string): { text: string; title: string } {
  const $ = cheerio.load(html);

  // Extract page title
  const title = $('title').text().trim() || 'Untitled';

  // Remove unwanted elements
  $('header, nav, footer, aside, script, style, noscript, iframe, svg').remove();

  // Find main content area
  let $content = $('main');
  if ($content.length === 0) {
    $content = $('body');
  }

  // Extract semantic content nodes
  const semanticNodes = $content.find('h1, h2, h3, p, li, blockquote').toArray();

  const lines: string[] = [];
  const seenLines = new Set<string>();

  for (const node of semanticNodes) {
    const $node = $(node);
    const text = $node.text().trim();

    if (!text || text.length < 10) continue;

    // Skip if this line is mostly repeated
    const normalized = text.toLowerCase().replace(/\s+/g, ' ');
    if (seenLines.has(normalized)) continue;

    seenLines.add(normalized);
    lines.push(text);
  }

  // Join lines and limit to roughly 1200 words
  let fullText = lines.join('\n');
  const words = fullText.split(/\s+/);
  if (words.length > 1200) {
    fullText = words.slice(0, 1200).join(' ') + '...';
  }

  return { text: fullText, title };
}

/**
 * Find internal links from HTML, prioritize important pages
 */
export function findInternalLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const baseUrlObj = new URL(baseUrl);
  const links: LinkScore[] = [];
  const seen = new Set<string>();

  $('a[href]').each((_, elem) => {
    const href = $(elem).attr('href');
    if (!href) return;

    try {
      const absolute = new URL(href, baseUrl).href;
      const absUrlObj = new URL(absolute);

      // Same origin only
      if (absUrlObj.origin !== baseUrlObj.origin) return;

      // Remove hash and trailing slash for deduplication
      const normalized = absUrlObj.origin + absUrlObj.pathname.replace(/\/$/, '') + absUrlObj.search;

      if (seen.has(normalized)) return;
      seen.add(normalized);

      // Skip non-HTML-like paths
      if (
        /\.(jpg|jpeg|png|gif|pdf|zip|doc|docx|xls|xlsx|mp4|mp3|css|js)$/i.test(
          absUrlObj.pathname
        )
      ) {
        return;
      }

      // Score links based on importance indicators
      const anchorText = $(elem).text().toLowerCase();
      const pathLower = absUrlObj.pathname.toLowerCase();
      const hrefLower = href.toLowerCase();

      let score = 0;

      const importantTerms = [
        'about',
        'company',
        'team',
        'services',
        'service',
        'product',
        'solutions',
        'pricing',
        'contact',
        'blog',
        'why',
        'how',
        'what',
      ];

      for (const term of importantTerms) {
        if (pathLower.includes(term) || hrefLower.includes(term) || anchorText.includes(term)) {
          score += 10;
        }
      }

      // Prefer shorter paths (likely more important)
      const pathDepth = absUrlObj.pathname.split('/').filter((p) => p.length > 0).length;
      score -= pathDepth;

      links.push({ url: normalized, score, text: anchorText });
    } catch {
      // Invalid URL, skip
    }
  });

  // Sort by score descending
  links.sort((a, b) => b.score - a.score);

  return links.map((link) => link.url);
}

/**
 * Crawl a website - simplified to analyze ONLY the homepage
 * This prevents Claude API timeouts by keeping context small and focused
 */
export async function crawl(
  startUrl: string,
  maxPages = 10, // Kept for API compatibility but ignored
  concurrency = 3, // Kept for API compatibility but ignored
  timeoutMs = 12000
): Promise<CrawlResult> {
  console.log(`[Scrape] Analyzing homepage only: ${startUrl}`);

  try {
    // Fetch only the homepage
    const html = await fetchHtml(startUrl, timeoutMs);
    const { text, title } = extractMainText(html);

    if (!text || text.length < 50) {
      throw new Error(
        'No content could be extracted from the homepage. The site may be JavaScript-rendered or inaccessible.'
      );
    }

    // Create single page result
    const page: ScrapedPage = { url: startUrl, title, text };

    // Build context string from homepage only
    const context = `[HOMEPAGE: ${page.title} | ${page.url}]\n${page.text}`;

    console.log(`[Scrape] Homepage analyzed: ${text.length} characters, ~${text.split(/\s+/).length} words`);

    return {
      context,
      pages: [{ title: page.title, url: page.url }]
    };
  } catch (error) {
    console.error(`[Scrape] Failed to analyze homepage ${startUrl}:`, error);
    throw new Error(
      `Failed to analyze homepage: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
