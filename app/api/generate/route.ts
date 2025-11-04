/**
 * API route for generating SEO content
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { crawl } from '@/lib/scrape';
import { generateWithRefinement } from '@/lib/ai';
import { parseSections } from '@/lib/parse';
import { normalizeUrl, splitKeywords } from '@/lib/normalize';

// Input validation schema
const GenerateSchema = z.object({
  url: z.string().url().startsWith('https'),
  topic: z.string().min(3).max(140),
  keywords: z.string().min(1),
  length: z.number().int().min(300).max(3000),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate input
    const body = await request.json();
    const validation = GenerateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    const { url, topic, keywords: keywordsRaw, length } = validation.data;

    // Normalize inputs
    const normalizedUrl = normalizeUrl(url);
    const keywords = splitKeywords(keywordsRaw);

    if (keywords.length === 0) {
      return NextResponse.json({ error: 'At least one keyword is required' }, { status: 400 });
    }

    if (keywords.length > 12) {
      return NextResponse.json(
        { error: 'Maximum 12 keywords allowed' },
        { status: 400 }
      );
    }

    // Validate each keyword length
    for (const keyword of keywords) {
      if (keyword.length < 1 || keyword.length > 60) {
        return NextResponse.json(
          { error: `Keyword "${keyword}" must be between 1 and 60 characters` },
          { status: 400 }
        );
      }
    }

    // Get environment variables with defaults
    const maxPages = parseInt(process.env.SCRAPE_MAX_PAGES || '10', 10);
    const concurrency = parseInt(process.env.SCRAPE_CONCURRENCY || '3', 10);
    const timeoutMs = parseInt(process.env.SCRAPE_TIMEOUT_MS || '12000', 10);

    console.log(`Starting crawl of ${normalizedUrl} (max ${maxPages} pages)`);

    // Crawl the website
    let crawlResult;
    try {
      crawlResult = await crawl(normalizedUrl, maxPages, concurrency, timeoutMs);
    } catch (error) {
      console.error('Crawl error:', error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to crawl website. Please check the URL and try again.',
        },
        { status: 500 }
      );
    }

    console.log(`Crawled ${crawlResult.pages.length} pages, context length: ${crawlResult.context.length} chars`);

    // Generate content with Claude
    let finalText;
    try {
      finalText = await generateWithRefinement(
        crawlResult.context,
        topic,
        keywords,
        length
      );
    } catch (error) {
      console.error('AI generation error:', error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to generate content with AI. Please try again.',
        },
        { status: 500 }
      );
    }

    // Parse the sections
    let parsed;
    try {
      parsed = parseSections(finalText);
    } catch (error) {
      console.error('Parse error:', error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to parse AI output. Please try again.',
        },
        { status: 500 }
      );
    }

    // Return structured response
    return NextResponse.json({
      metaTitle: parsed.metaTitle,
      metaDescription: parsed.metaDescription,
      contentMarkdown: parsed.contentMarkdown,
      faqRaw: parsed.faqRaw,
      schemaJsonString: parsed.schemaJsonString,
      pages: crawlResult.pages,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}

// Only allow POST
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
