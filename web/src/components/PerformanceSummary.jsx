import { fmt, tsfcPerHour } from "../utils/format.js";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber.js";

/** A headline number that glides to its new value instead of jumping. */
function Stat({ value, digits = 2, unit }) {
  const shown = useAnimatedNumber(value);
  return (
    <span className="perf-value">
      {fmt(shown, digits)} {unit && <small>{unit}</small>}
    </span>
  );
}

/** Same, formatted as a percentage (value is a 0-1 ratio, or null). */
function PctStat({ value }) {
  const shown = useAnimatedNumber(value === null || value === undefined ? NaN : value * 100);
  return <span className="perf-value">{Number.isFinite(shown) ? `${fmt(shown, 1)}%` : "—"}</span>;
}

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
        <Stat value={performance.thrust} digits={1} unit="N" />
      </div>
      <div className="perf-card">
        <span className="perf-label">Specific thrust</span>
        <Stat value={performance.specific_thrust} digits={2} unit="N·s/kg" />
      </div>
      <div className="perf-card">
        <span className="perf-label">TSFC</span>
        <Stat value={tsfcHr} digits={3} unit="kg/(N·h)" />
      </div>
      <div className="perf-card">
        <span className="perf-label">Fuel-air ratio f</span>
        <Stat value={performance.f} digits={4} />
      </div>
      <div className="perf-card">
        <span className="perf-label">Thermal efficiency</span>
        <PctStat value={performance.eta_thermal} />
      </div>
      <div className="perf-card">
        <span className="perf-label">Propulsive efficiency</span>
        <PctStat value={performance.eta_propulsive} />
      </div>
      <div className="perf-card">
        <span className="perf-label">Overall efficiency</span>
        <PctStat value={performance.eta_overall} />
      </div>
      <div className="perf-card">
        <span className="perf-label">Nozzle</span>
        <span className="perf-value">{nozzle.choked ? "Choked" : "Unchoked (fully expanded)"}</span>
      </div>
    </div>
  );
}
