/**
 * Job Analyzer Endpoint
 * Analyzes specific failed jobs to understand where they timeout
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/queue';

export const maxDuration = 30;

interface JobAnalysis {
  jobId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalDuration: number;
  attempts: number;
  progress: number;
  message: string;
  stuckPhase?: string;
  timeSinceUpdate: number;
  likelyIssue?: string;
  recommendations: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const analyzeAll = searchParams.get('analyzeAll') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const supabase = getSupabase();

    if (jobId) {
      // Analyze specific job
      const { data: job, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error || !job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      const analysis = analyzeJob(job);
      return NextResponse.json({ job: analysis });
    }

    // Analyze recent jobs
    const query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!analyzeAll) {
      // Only analyze failed or stuck jobs
      query.or('status.eq.failed,status.in.(pending,crawling,generating,parsing)');
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('[Job Analyzer] Error fetching jobs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const analyses = jobs?.map((job) => analyzeJob(job)) || [];

    // Group by issue type
    const issueGroups = groupByIssue(analyses);

    return NextResponse.json({
      totalJobs: analyses.length,
      timestamp: new Date().toISOString(),
      jobs: analyses,
      summary: {
        stuck: analyses.filter((a) => a.stuckPhase).length,
        failed: analyses.filter((a) => a.status === 'failed').length,
        slow: analyses.filter((a) => a.totalDuration > 300000 && a.status !== 'completed').length,
        issueBreakdown: issueGroups,
      },
      recommendations: generateGlobalRecommendations(analyses),
    });
  } catch (error) {
    console.error('[Job Analyzer] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function analyzeJob(job: any): JobAnalysis {
  const now = Date.now();
  const createdAt = new Date(job.created_at).getTime();
  const updatedAt = new Date(job.updated_at).getTime();
  const totalDuration = now - createdAt;
  const timeSinceUpdate = now - updatedAt;

  const analysis: JobAnalysis = {
    jobId: job.id,
    status: job.status,
    createdAt: new Date(createdAt).toISOString(),
    updatedAt: new Date(updatedAt).toISOString(),
    totalDuration,
    attempts: job.attempts,
    progress: job.progress,
    message: job.message,
    timeSinceUpdate,
    recommendations: [],
  };

  // Identify stuck phase
  if (job.status === 'pending' && timeSinceUpdate > 120000) {
    analysis.stuckPhase = 'pending';
    analysis.likelyIssue = 'Worker not picking up job or cron not triggering';
    analysis.recommendations.push('Check cron job execution logs');
    analysis.recommendations.push('Verify worker is running');
    analysis.recommendations.push('Check for worker errors in logs');
  } else if (job.status === 'crawling' && timeSinceUpdate > 60000) {
    analysis.stuckPhase = 'crawling';
    analysis.likelyIssue = 'Website crawling timeout or slow response';
    analysis.recommendations.push(`Check if ${job.input_url} is accessible`);
    analysis.recommendations.push('Consider reducing maxPages or adding timeout');
    analysis.recommendations.push('Check for rate limiting or blocking');
  } else if (job.status === 'generating' && timeSinceUpdate > 45000) {
    analysis.stuckPhase = 'generating';
    analysis.likelyIssue = 'AI generation taking too long or timing out';
    analysis.recommendations.push('Reduce max_tokens in AI generation');
    analysis.recommendations.push('Check Claude API status and rate limits');
    analysis.recommendations.push('Add explicit timeout to AI calls');
  } else if (job.status === 'parsing' && timeSinceUpdate > 30000) {
    analysis.stuckPhase = 'parsing';
    analysis.likelyIssue = 'Content parsing timeout';
    analysis.recommendations.push('Check if generated content is valid');
    analysis.recommendations.push('Verify parsing regex patterns');
  }

  // Check for repeated failures
  if (job.attempts > 1) {
    analysis.recommendations.push(`Job has failed ${job.attempts} times - check error patterns`);
  }

  // Check for extremely long duration
  if (totalDuration > 600000 && job.status !== 'completed') {
    // > 10 minutes
    analysis.recommendations.push(
      'Job running for over 10 minutes - likely stuck, consider force reset'
    );
  }

  // Analyze error message if failed
  if (job.status === 'failed' && job.error) {
    if (job.error.includes('timeout')) {
      analysis.likelyIssue = 'Timeout during execution';
      analysis.recommendations.push('Increase function timeout or optimize slow operations');
    } else if (job.error.includes('rate limit')) {
      analysis.likelyIssue = 'API rate limit exceeded';
      analysis.recommendations.push('Implement rate limiting or retry logic');
    } else if (job.error.includes('fetch')) {
      analysis.likelyIssue = 'Network or crawling error';
      analysis.recommendations.push('Check website accessibility and implement better error handling');
    }
  }

  return analysis;
}

function groupByIssue(analyses: JobAnalysis[]): Record<string, number> {
  const groups: Record<string, number> = {};

  analyses.forEach((analysis) => {
    if (analysis.likelyIssue) {
      groups[analysis.likelyIssue] = (groups[analysis.likelyIssue] || 0) + 1;
    }
  });

  return groups;
}

function generateGlobalRecommendations(analyses: JobAnalysis[]): string[] {
  const recommendations: string[] = [];

  // Count issues by phase
  const stuckInCrawling = analyses.filter((a) => a.stuckPhase === 'crawling').length;
  const stuckInGenerating = analyses.filter((a) => a.stuckPhase === 'generating').length;
  const stuckInPending = analyses.filter((a) => a.stuckPhase === 'pending').length;

  if (stuckInCrawling > 2) {
    recommendations.push(
      `⚠️ ${stuckInCrawling} jobs stuck in crawling phase - implement better crawl timeout and error handling`
    );
  }

  if (stuckInGenerating > 2) {
    recommendations.push(
      `⚠️ ${stuckInGenerating} jobs stuck in generating phase - reduce max_tokens or add AI timeout protection`
    );
  }

  if (stuckInPending > 2) {
    recommendations.push(
      `⚠️ ${stuckInPending} jobs stuck in pending - check cron job execution and worker availability`
    );
  }

  // Check for high failure rate
  const failureRate =
    analyses.filter((a) => a.status === 'failed').length / analyses.length;
  if (failureRate > 0.3) {
    recommendations.push(
      `❌ High failure rate (${Math.round(failureRate * 100)}%) - investigate common error patterns`
    );
  }

  // Check average duration
  const completedJobs = analyses.filter((a) => a.status === 'completed');
  if (completedJobs.length > 0) {
    const avgDuration =
      completedJobs.reduce((sum, a) => sum + a.totalDuration, 0) / completedJobs.length;
    if (avgDuration > 300000) {
      // > 5 minutes
      recommendations.push(
        `⏱️ Average completion time is ${Math.round(avgDuration / 1000)}s - consider optimization`
      );
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ No systemic issues detected. Jobs are processing normally.');
  }

  return recommendations;
}

export async function POST(request: NextRequest) {
  // Allow POST for triggering analysis of specific job
  const body = await request.json();
  const jobId = body.jobId;

  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  }

  // Redirect to GET with jobId
  return GET(
    new NextRequest(
      `http://localhost/api/debug/job-analyzer?jobId=${jobId}`,
      { method: 'GET' }
    )
  );
}
