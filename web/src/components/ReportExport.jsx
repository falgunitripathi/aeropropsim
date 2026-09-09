import { downloadReport } from "../utils/report.js";

/**
 * Phase 3 — report export beyond CSV: a complete, print-styled,
 * self-contained HTML report (configuration, assumptions, performance,
 * station and stage tables) for the currently solved design point.
 * Opens/prints/saves-as-PDF like any other web page — no PDF library,
 * no backend, consistent with this being a static, client-only app.
 */
export default function ReportExport({ config, result }) {
  return (
    <div className="report-export">
      <p className="section-note">
        Download a complete report for the current configuration&mdash;
        overall performance, station and stage tables, and the model&rsquo;s
        assumptions&mdash;as a standalone HTML file you can open, print, or
        save as a PDF from your browser.
      </p>
      <button
        type="button"
        className="reset-button"
        onClick={() => downloadReport(config, result)}
      >
        Export report (HTML / print to PDF)
      </button>
    </div>
  );
}
