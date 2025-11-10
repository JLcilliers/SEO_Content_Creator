/**
 * Timeout Diagnostic Endpoint
 * Tests each component to identify which one is causing timeouts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/queue';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

interface TestResult {
  component: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

async function testDatabase(): Promise<TestResult> {
  const start = Date.now();
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('jobs')
      .select('id, status')
      .limit(1);

    if (error) throw error;

    return {
      component: 'database',
      success: true,
      duration: Date.now() - start,
      details: { recordCount: data?.length || 0 },
    };
  } catch (error) {
    return {
      component: 'database',
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testCrawling(testUrl: string = 'https://example.com'): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOContentBot/1.0)',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    const html = await response.text();

    return {
      component: 'crawling',
      success: true,
      duration: Date.now() - start,
      details: {
        url: testUrl,
        status: response.status,
        contentLength: html.length,
      },
    };
  } catch (error) {
    return {
      component: 'crawling',
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testAIGeneration(): Promise<TestResult> {
  const start = Date.now();
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Simple test generation with timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timeout (25s)')), 25000)
    );

    const generationPromise = anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Write a single sentence about SEO. Keep it very short.',
        },
      ],
    });

    const response = await Promise.race([generationPromise, timeoutPromise]);

    return {
      component: 'ai_generation',
      success: true,
      duration: Date.now() - start,
      details: {
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: response.usage?.input_tokens || 0,
      },
    };
  } catch (error) {
    return {
      component: 'ai_generation',
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testWorkerTrigger(): Promise<TestResult> {
  const start = Date.now();
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const response = await fetch(`${baseUrl}/api/worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trigger-source': 'timeout-diagnostic',
      },
      body: JSON.stringify({ test: true }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const data = await response.json();

    return {
      component: 'worker_trigger',
      success: response.ok,
      duration: Date.now() - start,
      details: {
        status: response.status,
        response: data,
      },
    };
  } catch (error) {
    return {
      component: 'worker_trigger',
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const testType = body.testType || 'all';
    const testUrl = body.testUrl;

    const results: TestResult[] = [];

    // Run tests based on type
    if (testType === 'all' || testType === 'database') {
      console.log('[Timeout Test] Testing database...');
      results.push(await testDatabase());
    }

    if (testType === 'all' || testType === 'crawling') {
      console.log('[Timeout Test] Testing crawling...');
      results.push(await testCrawling(testUrl));
    }

    if (testType === 'all' || testType === 'ai') {
      console.log('[Timeout Test] Testing AI generation...');
      results.push(await testAIGeneration());
    }

    if (testType === 'all' || testType === 'worker') {
      console.log('[Timeout Test] Testing worker trigger...');
      results.push(await testWorkerTrigger());
    }

    // Analyze results
    const totalDuration = Date.now() - startTime;
    const failedTests = results.filter((r) => !r.success);
    const slowTests = results.filter((r) => r.duration > 10000);

    return NextResponse.json({
      success: failedTests.length === 0,
      totalDuration,
      timestamp: new Date().toISOString(),
      results,
      analysis: {
        totalTests: results.length,
        passed: results.filter((r) => r.success).length,
        failed: failedTests.length,
        slowComponents: slowTests.map((t) => ({
          component: t.component,
          duration: t.duration,
          warningLevel: t.duration > 20000 ? 'critical' : 'warning',
        })),
        recommendations: generateRecommendations(results),
      },
    });
  } catch (error) {
    console.error('[Timeout Test] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST(
    new NextRequest('http://localhost/api/debug/timeout-test', {
      method: 'POST',
      body: JSON.stringify({ testType: 'all' }),
    })
  );
}

function generateRecommendations(results: TestResult[]): string[] {
  const recommendations: string[] = [];

  results.forEach((result) => {
    if (!result.success) {
      recommendations.push(
        `❌ ${result.component} failed: ${result.error}. Check configuration and connectivity.`
      );
    } else if (result.duration > 20000) {
      recommendations.push(
        `⚠️ ${result.component} is very slow (${Math.round(result.duration / 1000)}s). Consider optimization.`
      );
    } else if (result.duration > 10000) {
      recommendations.push(
        `⚠️ ${result.component} is slow (${Math.round(result.duration / 1000)}s). Monitor for issues.`
      );
    }
  });

  // Component-specific recommendations
  const aiResult = results.find((r) => r.component === 'ai_generation');
  if (aiResult && aiResult.duration > 15000) {
    recommendations.push(
      '💡 AI generation is slow. Consider: reducing max_tokens, implementing chunking, or adding explicit timeout.'
    );
  }

  const crawlResult = results.find((r) => r.component === 'crawling');
  if (crawlResult && crawlResult.duration > 10000) {
    recommendations.push(
      '💡 Crawling is slow. Consider: reducing maxPages, implementing parallel crawling, or adding better timeout handling.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All components performing well. No immediate issues detected.');
  }

  return recommendations;
}
