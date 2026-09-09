import { useEffect, useState } from "react";

/**
 * Generic click-to-expand wrapper for heavier analysis sections. Shows a
 * compact header with a title, an optional one-line summary, and an
 * "Expand" button; clicking it pops the full content (passed as children)
 * into a full-screen modal — the same overlay/close/Escape/scroll-lock
 * pattern already used by EngineDiagram, generalized so new sections don't
 * have to grow the results page inline.
 */
export default function ExpandableSection({ title, summary, defaultExpanded = false, children }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (!expanded) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [expanded]);

  return (
    <section className="expandable-section">
      <div className="engine-diagram-toolbar">
        <span className="engine-diagram-title">{title}</span>
        <button type="button" className="ed-expand-button" onClick={() => setExpanded(true)}>
          ⤢ Expand
        </button>
      </div>
      {summary && <p className="section-note">{summary}</p>}

      {expanded && (
        <div
          className="ed-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExpanded(false);
          }}
        >
          <div className="ed-modal-content">
            <button
              type="button"
              className="ed-modal-close"
              onClick={() => setExpanded(false)}
              aria-label={`Close ${title}`}
            >
              ×
            </button>
            <div className="engine-diagram-toolbar">
              <span className="engine-diagram-title">{title}</span>
            </div>
            <div className="expandable-section-body">{children}</div>
          </div>
        </div>
      )}
    </section>
  );
}
