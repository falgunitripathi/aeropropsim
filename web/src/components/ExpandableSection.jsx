import { useId, useState } from "react";

/**
 * Generic click-to-expand wrapper for heavier analysis sections. Deliberately
 * mirrors ConfigForm's own disclosure pattern (see CompressorSection.jsx and
 * friends: a <fieldset className="config-section"> with a chevron + label
 * legend button that reveals its fields in place) rather than popping
 * content into a separate overlay — every results section (Station
 * analysis, Compressor & turbine stages, Cycle diagrams, Parameter sweep,
 * and the rest) lives as one row in the same results panel, right next to
 * the engine configuration panel, so both sides of the app read as one
 * consistent kind of thing: a panel full of named, click-to-open sections.
 *
 * Collapsed, a section shows only its heading (nothing else) — same as a
 * collapsed config-section — so stacking many of these doesn't turn the
 * page into a wall of text to scroll past. Expanding one reveals its
 * one-line summary and its full content directly underneath, in the normal
 * page flow: nothing is hidden behind an overlay, nothing else on the page
 * moves or gets covered, and multiple sections can be open at once.
 *
 * Accessibility: the heading is a real <button> with aria-expanded, and its
 * revealed body is connected back to it via aria-controls/id, so a
 * screen-reader user gets the same disclosure semantics as ConfigForm's
 * fieldsets.
 */
export default function ExpandableSection({ title, summary, defaultExpanded = false, children }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bodyId = useId();

  return (
    <section className="results-section">
      <button
        type="button"
        className="results-section-header"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="results-section-chevron" aria-hidden="true">
          {expanded ? "▾" : "▸"}
        </span>
        <span className="results-section-title">{title}</span>
      </button>
      {expanded && (
        <div id={bodyId} className="results-section-body">
          {summary && <p className="section-note expandable-section-summary">{summary}</p>}
          {children}
        </div>
      )}
    </section>
  );
}
