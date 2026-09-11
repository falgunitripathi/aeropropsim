import { useEffect, useId, useRef, useState } from "react";

/**
 * Generic click-to-expand wrapper for heavier analysis sections. Shows a
 * compact header on the results page — just a title and an "Expand"
 * button, nothing else — so stacking many of these sections doesn't turn
 * the main page into a wall of description text to scroll past. Clicking
 * "Expand" pops the title, the one-line summary, and the full content
 * (passed as children) together into a right-side sliding panel — the
 * same overlay/close/Escape/scroll-lock pattern already used by
 * EngineDiagram, generalized so new sections don't have to grow the
 * results page inline.
 *
 * Accessibility: the panel is a proper dialog (role="dialog",
 * aria-modal="true", labeled by its own title) rather than a div that only
 * looks like one. Opening it moves focus to the close button; closing it —
 * by button, overlay click, or Escape — returns focus to whichever element
 * triggered the open, so keyboard/screen-reader users aren't dropped back
 * at the top of the page.
 */
export default function ExpandableSection({ title, summary, defaultExpanded = false, children }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const titleId = useId();
  const closeButtonRef = useRef(null);
  const triggerRef = useRef(null);
  const previouslyFocused = useRef(null);

  function open() {
    previouslyFocused.current = document.activeElement;
    setExpanded(true);
  }

  function close() {
    setExpanded(false);
    (previouslyFocused.current || triggerRef.current)?.focus?.();
  }

  useEffect(() => {
    if (!expanded) return undefined;
    closeButtonRef.current?.focus();
    function onKeyDown(e) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  return (
    <section className="expandable-section">
      <div className="engine-diagram-toolbar">
        <span className="engine-diagram-title">{title}</span>
        <button
          type="button"
          ref={triggerRef}
          className="ed-expand-button"
          aria-haspopup="dialog"
          onClick={open}
        >
          ⤢ Expand
        </button>
      </div>
      {expanded && (
        <div
          className="ed-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="ed-modal-content" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <button
              type="button"
              ref={closeButtonRef}
              className="ed-modal-close"
              onClick={close}
              aria-label={`Close ${title}`}
            >
              ×
            </button>
            <div className="engine-diagram-toolbar">
              <span className="engine-diagram-title" id={titleId}>{title}</span>
            </div>
            {summary && <p className="section-note expandable-section-summary">{summary}</p>}
            <div className="expandable-section-body">{children}</div>
          </div>
        </div>
      )}
    </section>
  );
}
