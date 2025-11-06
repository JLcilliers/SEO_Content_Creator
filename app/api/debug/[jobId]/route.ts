/**
 * Debug endpoint - shows raw database data for a job
 * Access at: /api/debug/[jobId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/queue';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const client = getSupabase();

    // Get raw database row
    const { data, error } = await client
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 404 }
      );
    }

    // Return raw database data with analysis
    return NextResponse.json({
      jobId,
      rawData: data,
      analysis: {
        status: data.status,
        progress: data.progress,
        hasError: !!data.error,
        hasMetaTitle: !!data.result_meta_title,
        hasMetaDescription: !!data.result_meta_description,
        hasContentMarkdown: !!data.result_content_markdown,
        hasFaqRaw: !!data.result_faq_raw,
        hasSchemaJsonString: !!data.result_schema_json_string,
        hasPages: !!data.result_pages,
        metaTitleLength: data.result_meta_title?.length || 0,
        contentLength: data.result_content_markdown?.length || 0,
        faqLength: data.result_faq_raw?.length || 0,
        pagesCount: Array.isArray(data.result_pages) ? data.result_pages.length : 0,
      },
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data' },
      { status: 500 }
    );
  }
}
