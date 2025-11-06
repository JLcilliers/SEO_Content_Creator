/**
 * Worker trigger utility - automatically starts worker processing
 * This ensures jobs are processed even without cron (useful for local dev)
 */

let workerTriggerInProgress = false;
let lastTriggerTime = 0;
const TRIGGER_COOLDOWN_MS = 5000; // Don't trigger more than once per 5 seconds

/**
 * Trigger the worker endpoint to process pending jobs
 * Safe to call multiple times - has built-in rate limiting
 */
export async function triggerWorker(baseUrl?: string): Promise<void> {
  // Rate limiting
  const now = Date.now();
  if (workerTriggerInProgress || now - lastTriggerTime < TRIGGER_COOLDOWN_MS) {
    console.log('[Worker Trigger] Skipping - cooldown or already in progress');
    return;
  }

  workerTriggerInProgress = true;
  lastTriggerTime = now;

  try {
    // Determine base URL
    const url = baseUrl ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

    const workerUrl = `${url}/api/worker`;

    console.log('[Worker Trigger] Triggering worker at:', workerUrl);
    console.log('[Worker Trigger] Using fetch implementation:', typeof fetch);

    // Wait for the trigger to complete and check response
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add signal with timeout to prevent hanging
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    console.log('[Worker Trigger] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const text = await response.text();
      console.error('[Worker Trigger] Worker returned error:', text);
      throw new Error(`Worker returned status ${response.status}: ${text.substring(0, 200)}`);
    }

    const result = await response.json();
    console.log('[Worker Trigger] Worker response:', result);
  } catch (error) {
    console.error('[Worker Trigger] Failed to trigger worker:', error);
    if (error instanceof Error) {
      console.error('[Worker Trigger] Error type:', error.name);
      console.error('[Worker Trigger] Error message:', error.message);
    }
    throw error; // Propagate error to caller
  } finally {
    // Reset after cooldown
    setTimeout(() => {
      workerTriggerInProgress = false;
    }, TRIGGER_COOLDOWN_MS);
  }
}

/**
 * Auto-trigger worker when job is created (client-side)
 */
export function autoTriggerWorkerClient(): void {
  if (typeof window === 'undefined') return;

  // Trigger immediately
  triggerWorker();

  // Also trigger after 10 seconds as backup
  setTimeout(() => triggerWorker(), 10000);
}

/**
 * Auto-trigger worker when job is created (server-side)
 */
export async function autoTriggerWorkerServer(): Promise<void> {
  if (typeof window !== 'undefined') return;

  // Get base URL from environment or use default
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  console.log('[Worker Trigger Server] Starting trigger, base URL:', baseUrl);
  console.log('[Worker Trigger Server] Environment: VERCEL_URL=', process.env.VERCEL_URL || 'not set');
  console.log('[Worker Trigger Server] Environment: NEXT_PUBLIC_BASE_URL=', process.env.NEXT_PUBLIC_BASE_URL || 'not set');

  try {
    // Trigger immediately with await to catch errors
    await triggerWorker(baseUrl);
    console.log('[Worker Trigger Server] Trigger completed successfully');
  } catch (error) {
    console.error('[Worker Trigger Server] ERROR triggering worker:', error);
    if (error instanceof Error) {
      console.error('[Worker Trigger Server] Error message:', error.message);
      console.error('[Worker Trigger Server] Error stack:', error.stack);
    }
    throw error; // Re-throw so calling code knows it failed
  }
}
