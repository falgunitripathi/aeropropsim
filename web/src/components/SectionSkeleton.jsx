/**
 * Placeholder shown by <Suspense> while a lazy-loaded results section's own
 * code chunk is still downloading. Mirrors the shape/height of a collapsed
 * ExpandableSection header (same toolbar classes, no new CSS needed) so nothing
 * jumps once the real section mounts a moment later.
 */
export default function SectionSkeleton({ title }) {
  return (
    <section className="expandable-section">
      <div className="engine-diagram-toolbar">
        <span className="engine-diagram-title">{title}</span>
        <span className="ed-expand-button" style={{ opacity: 0.5, cursor: "default" }}>
          Loading…
        </span>
      </div>
    </section>
  );
}
