/**
 * TypeScript interfaces for the SEO content creator application
 */

export interface GeneratePayload {
  url: string;
  topic: string;
  keywords: string;
  length: number;
  additionalNotes?: string;
}

export interface ScrapedPage {
  title: string;
  url: string;
  text: string;
}

export interface CrawlResult {
  context: string;
  pages: Array<{ title: string; url: string }>;
}

export interface ParsedSections {
  metaTitle: string;
  metaDescription: string;
  contentMarkdown: string;
  faqRaw: string;
  schemaJsonString: string;
  schemaJson: object;
}

export interface GenerateResponse {
  jobId?: string;
  metaTitle: string;
  metaDescription: string;
  contentMarkdown: string;
  faqRaw: string;
  schemaJsonString: string;
  pages: Array<{ title: string; url: string }>;
}

export interface LinkScore {
  url: string;
  score: number;
  text: string;
}
