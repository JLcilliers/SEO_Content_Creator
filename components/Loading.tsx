interface LoadingProps {
  progress?: number;
  message?: string;
}

export default function Loading({ progress, message }: LoadingProps) {
  return (
    <div className="loading-container" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true"></div>

      {progress !== undefined && progress > 0 && (
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}>
            <span className="progress-text">{progress}%</span>
          </div>
        </div>
      )}

      <p className="loading-text">
        {message || 'Generating SEO content... This may take 1-2 minutes.'}
      </p>
    </div>
  );
}
