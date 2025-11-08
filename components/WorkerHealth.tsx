'use client';

import { useState, useEffect } from 'react';

interface HealthData {
  health: {
    status: string;
    timestamp: string;
  };
  queue: {
    pendingCount: number;
    stuckCount: number;
    oldestPendingJob: {
      id: string;
      createdAt: string;
      ageMinutes: number;
      attempts: number;
    } | null;
  };
  jobs?: {
    pending?: Array<{
      id: string;
      createdAt: string;
      updatedAt: string;
      ageMinutes: number;
      attempts: number;
    }>;
    stuck?: Array<{
      id: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      stuckForMinutes: number;
      attempts: number;
    }>;
  };
  statistics?: {
    statusDistribution: Record<string, number>;
    lastRun: string | null;
  };
  error?: string;
}

export function WorkerHealth() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/worker/health');
      const data = await response.json();
      setHealth(data);
      setLoading(false);
    } catch (error) {
      setHealth({
        health: { status: '❌ ERROR', timestamp: new Date().toISOString() },
        queue: { pendingCount: 0, stuckCount: 0, oldestPendingJob: null },
        error: 'Failed to check health',
      });
      setLoading(false);
    }
  };

  const triggerWorker = async () => {
    setTriggering(true);
    try {
      const response = await fetch('/api/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'manual-ui-trigger' }),
      });
      const data = await response.json();

      // Refresh health after triggering
      setTimeout(checkHealth, 1000);

      alert(
        `Worker triggered!\n\nStatus: ${response.status}\nMessage: ${data.message || 'Processing...'}`
      );
    } catch (error) {
      alert(
        `Failed to trigger worker:\n\n${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setTriggering(false);
    }
  };

  const forceProcessJob = async (jobId: string) => {
    if (
      !confirm(
        `Force process job ${jobId}?\n\nThis will immediately attempt to process this job.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs/force-process/${jobId}`, {
        method: 'POST',
      });
      const data = await response.json();

      // Refresh health after force processing
      setTimeout(checkHealth, 1000);

      if (data.success) {
        alert(`✅ Job ${jobId} force-processed successfully!`);
      } else {
        alert(`❌ Failed to force process job:\n\n${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(
        `❌ Error force processing job:\n\n${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-300 p-3 rounded-lg shadow-lg text-xs">
        <div className="text-gray-500">Loading health...</div>
      </div>
    );
  }

  if (!health) return null;

  const hasWarnings = health.queue.stuckCount > 0;
  const hasErrors = health.health.status.includes('ERROR');

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg text-xs max-w-md">
      {/* Compact Header */}
      <div
        className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{health.health.status.split(' ')[0]}</span>
          <div>
            <div className="font-semibold">Worker Health</div>
            <div className="text-gray-500 text-[10px]">
              {health.queue.pendingCount} pending
              {health.queue.stuckCount > 0 && (
                <span className="text-orange-600 ml-1">
                  · {health.queue.stuckCount} stuck
                </span>
              )}
            </div>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-200 p-3 space-y-3">
          {/* Statistics */}
          <div>
            <div className="font-semibold mb-1">Queue Status</div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-600">Pending jobs:</span>
                <span className="font-mono">{health.queue.pendingCount}</span>
              </div>
              {health.queue.stuckCount > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>⚠️ Stuck jobs:</span>
                  <span className="font-mono">{health.queue.stuckCount}</span>
                </div>
              )}
              {health.statistics?.lastRun && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last run:</span>
                  <span className="font-mono text-[10px]">
                    {new Date(health.statistics.lastRun).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Oldest Pending Job */}
          {health.queue.oldestPendingJob && (
            <div>
              <div className="font-semibold mb-1">Oldest Pending</div>
              <div className="bg-yellow-50 p-2 rounded text-[10px] space-y-1">
                <div className="font-mono">{health.queue.oldestPendingJob.id}</div>
                <div className="text-gray-600">
                  Age: {health.queue.oldestPendingJob.ageMinutes} min · Attempts:{' '}
                  {health.queue.oldestPendingJob.attempts}
                </div>
                <button
                  onClick={() => forceProcessJob(health.queue.oldestPendingJob!.id)}
                  className="mt-1 px-2 py-1 bg-orange-500 text-white rounded text-[10px] hover:bg-orange-600"
                >
                  Force Process
                </button>
              </div>
            </div>
          )}

          {/* Stuck Jobs */}
          {health.jobs?.stuck && health.jobs.stuck.length > 0 && (
            <div>
              <div className="font-semibold mb-1 text-orange-600">
                ⚠️ Stuck Jobs ({health.jobs.stuck.length})
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {health.jobs.stuck.slice(0, 3).map((job) => (
                  <div key={job.id} className="bg-orange-50 p-2 rounded text-[10px]">
                    <div className="font-mono mb-1">{job.id}</div>
                    <div className="text-gray-600">
                      Status: {job.status} · Stuck: {job.stuckForMinutes} min
                    </div>
                    <button
                      onClick={() => forceProcessJob(job.id)}
                      className="mt-1 px-2 py-1 bg-orange-500 text-white rounded text-[10px] hover:bg-orange-600"
                    >
                      Force Process
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Distribution */}
          {health.statistics?.statusDistribution && (
            <div>
              <div className="font-semibold mb-1">Status Distribution</div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {Object.entries(health.statistics.statusDistribution).map(
                  ([status, count]) => (
                    <div key={status} className="flex justify-between bg-gray-50 px-2 py-1 rounded">
                      <span className="capitalize">{status}:</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={triggerWorker}
              disabled={triggering}
              className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              {triggering ? 'Triggering...' : '▶ Trigger Worker'}
            </button>
            <button
              onClick={checkHealth}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
            >
              🔄
            </button>
          </div>

          {/* Error Display */}
          {health.error && (
            <div className="bg-red-50 text-red-700 p-2 rounded text-[10px]">
              ❌ {health.error}
            </div>
          )}

          {/* Last Updated */}
          <div className="text-center text-gray-400 text-[10px]">
            Updated: {new Date(health.health.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
