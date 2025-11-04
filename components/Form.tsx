'use client';

import { useState } from 'react';
import type { GenerateResponse } from '@/lib/typing';

interface FormProps {
  onSuccess: (result: GenerateResponse) => void;
  onError: (error: string) => void;
  onLoadingChange: (loading: boolean) => void;
}

export default function Form({ onSuccess, onError, onLoadingChange }: FormProps) {
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [length, setLength] = useState(1000);
  const [loading, setLoading] = useState(false);

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
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate content');
      }

      const result: GenerateResponse = await response.json();
      onSuccess(result);
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
        <small className="form-hint">Between 300 and 3000 words</small>
      </div>

      <button type="submit" disabled={loading} className="submit-button">
        {loading ? 'Generating...' : 'Generate Content'}
      </button>
    </form>
  );
}
