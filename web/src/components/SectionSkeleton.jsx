/**
 * Placeholder shown by <Suspense> while a lazy-loaded results section's own
 * code chunk is still downloading. Mirrors the shape/height of a collapsed
 * ExpandableSection header (same classes, no new CSS needed) so nothing
 * jumps once the real section mounts a moment later.
 */
export default function SectionSkeleton({ title }) {
  return (
    <section className="results-section">
      <span className="results-section-header results-section-header-loading">
        <span className="results-section-chevron" aria-hidden="true">▸</span>
        <span className="results-section-title">{title}</span>
        <span className="results-section-loading-label">Loading…</span>
      </span>
    </section>
  );
}
