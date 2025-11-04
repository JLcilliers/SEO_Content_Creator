export default function Loading() {
  return (
    <div className="loading-container" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true"></div>
      <p className="loading-text">
        Generating SEO content... This may take 1-2 minutes.
      </p>
    </div>
  );
}
