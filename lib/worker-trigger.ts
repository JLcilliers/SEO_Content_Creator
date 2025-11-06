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

    // Fire and forget - don't wait for response
    fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch((error) => {
      console.error('[Worker Trigger] Failed to trigger worker:', error);
    });
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

  // Trigger immediately
  await triggerWorker(baseUrl);
}
