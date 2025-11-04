'use client';

import { useState } from 'react';
import Form from '@/components/Form';
import Loading from '@/components/Loading';
import ResultView from '@/components/ResultView';
import type { GenerateResponse } from '@/lib/typing';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GenerateResponse | null>(null);

  const handleSuccess = (data: GenerateResponse) => {
    setResult(data);
    setError('');
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    setResult(null);
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
      />

      {error && (
        <div className="error-message" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && <Loading />}

      {result && !loading && (
        <ResultView
          metaTitle={result.metaTitle}
          metaDescription={result.metaDescription}
          contentMarkdown={result.contentMarkdown}
          faqRaw={result.faqRaw}
          schemaJsonString={result.schemaJsonString}
          sources={result.pages}
        />
      )}
    </main>
  );
}
