'use client';

import { useState } from 'react';
import Form from '@/components/Form';
import Loading from '@/components/Loading';
import ResultView from '@/components/ResultView';
import { WorkerHealth } from '@/components/WorkerHealth';
import type { GenerateResponse } from '@/lib/typing';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const handleSuccess = (data: GenerateResponse) => {
    setResult(data);
    setError('');
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    setResult(null);
  };

  const handleProgressUpdate = (newProgress: number, message: string) => {
    setProgress(newProgress);
    setProgressMessage(message);
  };

  return (
    <main className="container">
      <header className="header">
        <h1>SEO Content Creator</h1>
        <p className="subtitle">
          Generate optimized content using your website context and Anthropic Claude
        </p>
      </header>

      <Form
        onSuccess={handleSuccess}
        onError={handleError}
        onLoadingChange={setLoading}
        onProgressUpdate={handleProgressUpdate}
      />

      {error && (
        <div className="error-message" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && <Loading progress={progress} message={progressMessage} />}

      {result && !loading && (
        <ResultView
          jobId={result.jobId}
          metaTitle={result.metaTitle}
          metaDescription={result.metaDescription}
          contentMarkdown={result.contentMarkdown}
          faqRaw={result.faqRaw}
          schemaJsonString={result.schemaJsonString}
          sources={result.pages}
        />
      )}

      {/* Worker Health Monitor - always visible */}
      <WorkerHealth />
    </main>
  );
}
