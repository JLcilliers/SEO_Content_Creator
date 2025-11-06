'use client';

import { useState } from 'react';
import type { GenerateResponse } from '@/lib/typing';

interface FormProps {
  onSuccess: (result: GenerateResponse) => void;
  onError: (error: string) => void;
  onLoadingChange: (loading: boolean) => void;
  onProgressUpdate?: (progress: number, message: string) => void;
}

export default function Form({ onSuccess, onError, onLoadingChange, onProgressUpdate }: FormProps) {
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [length, setLength] = useState(1500);
  const [loading, setLoading] = useState(false);

  // Poll job status
  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 150; // 5 minutes max (150 * 2s = 300s)
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const response = await fetch(`/api/jobs/${jobId}`);

        if (!response.ok) {
          throw new Error('Failed to check job status');
        }

        const job = await response.json();

        // Update progress
        if (onProgressUpdate) {
          onProgressUpdate(job.progress || 0, job.message || 'Processing...');
        }

        // Check if completed
        if (job.status === 'completed') {
          if (!job.result) {
            throw new Error('Job completed but no result returned');
          }

          // Transform result to match GenerateResponse interface
          onSuccess({
            metaTitle: job.result.metaTitle,
            metaDescription: job.result.metaDescription,
            contentMarkdown: job.result.contentMarkdown,
            faqRaw: job.result.faqRaw,
            schemaJsonString: job.result.schemaJsonString,
            pages: job.result.pages,
          });
          return;
        }

        // Check if failed
        if (job.status === 'failed') {
          throw new Error(job.error || 'Job failed');
        }

        // Wait 2 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        throw error;
      }
    }

    throw new Error('Job timed out after 5 minutes');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url || !topic || !keywords) {
      onError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    onLoadingChange(true);
    onError('');

    try {
      // Step 1: Create job
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          topic,
          keywords,
          length,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create job';
        try {
          const text = await response.text();
          try {
            const error = JSON.parse(text);
            errorMessage = error.error || errorMessage;
          } catch {
            errorMessage = text || errorMessage;
          }
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }

      const { jobId } = await response.json();

      if (!jobId) {
        throw new Error('No job ID returned');
      }

      // Step 2: Poll for job completion
      await pollJobStatus(jobId);
    } catch (error) {
      console.error('Error:', error);
      onError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
      onLoadingChange(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label htmlFor="url">
          Website URL <span className="required">*</span>
        </label>
        <input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={loading}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="topic">
          Topic <span className="required">*</span>
        </label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., Benefits of our web design services"
          disabled={loading}
          required
          minLength={3}
          maxLength={140}
        />
      </div>

      <div className="form-group">
        <label htmlFor="keywords">
          Keywords (comma-separated) <span className="required">*</span>
        </label>
        <input
          id="keywords"
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="web design, SEO, branding"
          disabled={loading}
          required
        />
        <small className="form-hint">Up to 12 keywords, each 1-60 characters</small>
      </div>

      <div className="form-group">
        <label htmlFor="length">
          Desired length (words) <span className="required">*</span>
        </label>
        <input
          id="length"
          type="number"
          value={length}
          onChange={(e) => setLength(parseInt(e.target.value, 10))}
          min={300}
          max={3000}
          disabled={loading}
          required
        />
        <small className="form-hint">Recommended: 1500-2500 words for comprehensive SEO content</small>
      </div>

      <button type="submit" disabled={loading} className="submit-button">
        {loading ? 'Generating...' : 'Generate Content'}
      </button>
    </form>
  );
}
