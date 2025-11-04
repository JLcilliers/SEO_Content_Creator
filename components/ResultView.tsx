'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CopyButton from './CopyButton';

interface ResultViewProps {
  metaTitle: string;
  metaDescription: string;
  contentMarkdown: string;
  faqRaw: string;
  schemaJsonString: string;
  sources: Array<{ title: string; url: string }>;
}

export default function ResultView({
  metaTitle,
  metaDescription,
  contentMarkdown,
  faqRaw,
  schemaJsonString,
  sources,
}: ResultViewProps) {
  return (
    <div className="result-view">
      <h2 className="section-heading">Generated Content</h2>

      {/* Meta Tags */}
      <section className="meta-section">
        <div className="meta-item">
          <div className="meta-header">
            <h3>Meta Title</h3>
            <CopyButton text={metaTitle} />
          </div>
          <p className="meta-content">{metaTitle}</p>
          <small className="meta-length">{metaTitle.length} characters</small>
        </div>

        <div className="meta-item">
          <div className="meta-header">
            <h3>Meta Description</h3>
            <CopyButton text={metaDescription} />
          </div>
          <p className="meta-content">{metaDescription}</p>
          <small className="meta-length">{metaDescription.length} characters</small>
        </div>
      </section>

      {/* Main Content */}
      <section className="content-section">
        <div className="section-header">
          <h3>Article Content</h3>
          <CopyButton text={contentMarkdown} label="Copy Markdown" />
        </div>
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="nofollow noopener" />
              ),
            }}
          >
            {contentMarkdown}
          </ReactMarkdown>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="section-header">
          <h3>FAQ</h3>
          <CopyButton text={faqRaw} label="Copy FAQ" />
        </div>
        <div className="faq-content">
          <pre>{faqRaw}</pre>
        </div>
      </section>

      {/* JSON-LD Schema */}
      <section className="schema-section">
        <div className="section-header">
          <h3>JSON-LD Schema</h3>
          <CopyButton text={schemaJsonString} label="Copy Schema" />
        </div>
        <div className="schema-content">
          <pre>
            <code>{schemaJsonString}</code>
          </pre>
        </div>
      </section>

      {/* Sources */}
      <section className="sources-section">
        <h3>Sources Used</h3>
        <p className="sources-intro">
          Content was generated using information from the following pages:
        </p>
        <ul className="sources-list">
          {sources.map((source, index) => (
            <li key={index}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
