import { fmt, fmtPct, tsfcPerHour } from "../utils/format.js";

/**
 * Headline overall-performance numbers — Ref §9 (Overall Performance).
 * `performance` is `EngineResult.performance` (thrust, specific_thrust,
 * tsfc, eta_thermal, eta_propulsive, eta_overall, f).
 */
export default function PerformanceSummary({ performance, nozzle }) {
  const tsfcHr = tsfcPerHour(performance.tsfc);
  return (
    <div className="performance-summary">
      <div className="perf-card">
        <span className="perf-label">Thrust</span>
        <span className="perf-value">{fmt(performance.thrust, 1)} <small>N</small></span>
      </div>
      <div className="perf-card">
        <span className="perf-label">Specific thrust</span>
        <span className="perf-value">{fmt(performance.specific_thrust, 2)} <small>N·s/kg</small></span>
      </div>
      <div className="perf-card">
        <span className="perf-label">TSFC</span>
        <span className="perf-value">{fmt(tsfcHr, 3)} <small>kg/(N·h)</small></span>
      </div>
      <div className="perf-card">
        <span className="perf-label">Fuel-air ratio f</span>
        <span className="perf-value">{fmt(performance.f, 4)}</span>
      </div>
      <div className="perf-card">
        <span className="perf-label">Thermal efficiency</span>
        <span className="perf-value">{fmtPct(performance.eta_thermal)}</span>
      </div>
      <div className="perf-card">
        <span className="perf-label">Propulsive efficiency</span>
        <span className="perf-value">{fmtPct(performance.eta_propulsive)}</span>
      </div>
      <div className="perf-card">
        <span className="perf-label">Overall efficiency</span>
        <span className="perf-value">{fmtPct(performance.eta_overall)}</span>
      </div>
      <div className="perf-card">
        <span className="perf-label">Nozzle</span>
        <span className="perf-value">{nozzle.choked ? "Choked" : "Unchoked (fully expanded)"}</span>
      </div>
    </div>
  );
}
