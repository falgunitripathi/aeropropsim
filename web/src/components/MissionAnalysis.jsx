import { useMemo, useState } from "react";
import { solveEngine } from "../physics/engine.js";
import ExpandableSection from "./ExpandableSection.jsx";
import SweepChart from "./SweepChart.jsx";
import { downloadCsv } from "../utils/csv.js";
import { fmt, tsfcPerHour } from "../utils/format.js";

let nextId = 1;
function segment(label, altitude_m, mach_flight, duration_min) {
  return { id: nextId++, label, altitude_m, mach_flight, duration_min };
}

const DEFAULT_SEGMENTS = [
  segment("Takeoff", 0, 0.25, 2),
  segment("Climb", 5000, 0.6, 15),
  segment("Cruise", 11000, 0.85, 60),
  segment("Descent", 3000, 0.5, 20),
];

/** Build a step-function timeline for one output: two points per segment
 *  (start, end) at the same value, so consecutive points drawn as a
 *  straight line produce flat segments with a vertical jump between them —
 *  no extra charting code needed, `SweepChart` already just connects
 *  points in order. */
function buildTimeline(rows, valueFn) {
  const xValues = [];
  const yValues = [];
  for (const row of rows) {
    const v = row.valid ? valueFn(row) : null;
    xValues.push(row.tStart, row.tEnd);
    yValues.push(v, v);
  }
  return { xValues, yValues };
}

/**
 * 🚀 Mission analysis — a multi-segment flight profile (takeoff → climb →
 * cruise → descent, or whatever the user defines), solving the *current*
 * engine configuration at each segment's own altitude/Mach (holding
 * everything else fixed — the same off-design substrate `ParameterSweep`
 * already uses), then integrating fuel burn and distance over each
 * segment's duration to total mission fuel and range.
 */
export default function MissionAnalysis({ config }) {
  const [segments, setSegments] = useState(DEFAULT_SEGMENTS);

  const updateSegment = (id, field, value) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };
  const removeSegment = (id) => {
    setSegments((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  };
  const addSegment = () => {
    setSegments((prev) => [...prev, segment("New segment", 5000, 0.6, 10)]);
  };

  const rows = useMemo(() => {
    let cum = 0;
    return segments.map((seg) => {
      const duration = Number.isFinite(seg.duration_min) ? Math.max(seg.duration_min, 0) : 0;
      const tStart = cum;
      const tEnd = cum + duration;
      cum = tEnd;
      try {
        const r = solveEngine({ ...config, altitude_m: seg.altitude_m, mach_flight: seg.mach_flight });
        const mdotF = r.performance.f * config.mdot_a;
        const durationSec = duration * 60;
        return {
          ...seg, tStart, tEnd, valid: true,
          thrust: r.performance.thrust,
          tsfcHr: tsfcPerHour(r.performance.tsfc),
          mdotF,
          fuelBurn: mdotF * durationSec,
          distance: r.atmosphere.V_flight * durationSec,
        };
      } catch {
        return { ...seg, tStart, tEnd, valid: false };
      }
    });
  }, [segments, config]);

  const totals = useMemo(() => {
    const validRows = rows.filter((r) => r.valid);
    return {
      time: rows.reduce((a, r) => a + (r.tEnd - r.tStart), 0),
      fuel: validRows.reduce((a, r) => a + r.fuelBurn, 0),
      distance: validRows.reduce((a, r) => a + r.distance, 0),
      invalidCount: rows.length - validRows.length,
    };
  }, [rows]);

  const thrustLine = useMemo(() => buildTimeline(rows, (r) => r.thrust), [rows]);
  const fuelFlowLine = useMemo(() => buildTimeline(rows, (r) => r.mdotF * 3600), [rows]);
  const tsfcLine = useMemo(() => buildTimeline(rows, (r) => r.tsfcHr), [rows]);
  const altitudeLine = useMemo(() => buildTimeline(rows, (r) => r.altitude_m), [rows]);
  const machLine = useMemo(() => buildTimeline(rows, (r) => r.mach_flight), [rows]);

  const exportMission = () => {
    downloadCsv(
      "thrustforge-mission.csv",
      rows.map((r) => ({
        Segment: r.label,
        "Start (min)": r.tStart,
        "End (min)": r.tEnd,
        "Altitude (m)": r.altitude_m,
        "Mach": r.mach_flight,
        "Thrust (N)": r.valid ? r.thrust : null,
        "TSFC (kg/(N·h))": r.valid ? r.tsfcHr : null,
        "Fuel flow (kg/h)": r.valid ? r.mdotF * 3600 : null,
        "Fuel burned this segment (kg)": r.valid ? r.fuelBurn : null,
        "Distance this segment (km)": r.valid ? r.distance / 1000 : null,
      }))
    );
  };

  return (
    <ExpandableSection
      title="🚀 Mission analysis"
      summary={`Takeoff → climb → cruise → descent (or your own profile) — this engine solved at each segment's flight condition, with fuel and range integrated over the mission. ${totals.fuel > 0 ? `Total: ${fmt(totals.fuel, 1)} kg fuel, ${fmt(totals.distance / 1000, 0)} km.` : ""} Expand to build one.`}
    >
      <p className="section-note">
        The current engine configuration (on the left) stays fixed; only
        altitude and flight Mach change per segment, exactly like the
        off-design sweeps above. Fuel burn and distance are integrated
        segment by segment (steady-state within each) and summed to a
        mission total.
      </p>

      <div className="table-scroll">
        <table className="mission-table">
          <thead>
            <tr>
              <th>Segment</th>
              <th>Altitude (m)</th>
              <th>Mach</th>
              <th>Duration (min)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {segments.map((seg) => (
              <tr key={seg.id}>
                <td>
                  <input
                    type="text"
                    value={seg.label}
                    onChange={(e) => updateSegment(seg.id, "label", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number" min={0} max={11000} step={100}
                    value={seg.altitude_m}
                    onChange={(e) => updateSegment(seg.id, "altitude_m", parseFloat(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="number" min={0} max={3} step={0.05}
                    value={seg.mach_flight}
                    onChange={(e) => updateSegment(seg.id, "mach_flight", parseFloat(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="number" min={0} step={1}
                    value={seg.duration_min}
                    onChange={(e) => updateSegment(seg.id, "duration_min", parseFloat(e.target.value))}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="reset-button"
                    onClick={() => removeSegment(seg.id)}
                    disabled={segments.length <= 1}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sweep-controls">
        <button type="button" className="reset-button" onClick={addSegment}>+ Add segment</button>
        <button type="button" className="reset-button sweep-export-button" onClick={exportMission}>
          Export CSV
        </button>
      </div>

      {totals.invalidCount > 0 && (
        <p className="section-note">
          {totals.invalidCount} segment{totals.invalidCount > 1 ? "s aren't" : " isn't"} a
          physically valid engine at that flight condition and {totals.invalidCount > 1 ? "are" : "is"} excluded
          from the totals and shown as gaps below.
        </p>
      )}

      <div className="performance-summary">
        <div className="perf-card">
          <span className="perf-label">Total mission time</span>
          <span className="perf-value">{fmt(totals.time, 0)} <small>min</small></span>
        </div>
        <div className="perf-card">
          <span className="perf-label">Total fuel burned</span>
          <span className="perf-value">{fmt(totals.fuel, 1)} <small>kg</small></span>
        </div>
        <div className="perf-card">
          <span className="perf-label">Total range</span>
          <span className="perf-value">{fmt(totals.distance / 1000, 1)} <small>km</small></span>
        </div>
      </div>

      <div className="sweep-charts">
        <SweepChart title="Thrust" xValues={thrustLine.xValues} yValues={thrustLine.yValues} unit="N" color="#2a78d6" decimals={0} xUnit="min" xDecimals={0} />
        <SweepChart title="Fuel flow" xValues={fuelFlowLine.xValues} yValues={fuelFlowLine.yValues} unit="kg/h" color="#eb6834" decimals={1} xUnit="min" xDecimals={0} />
        <SweepChart title="TSFC" xValues={tsfcLine.xValues} yValues={tsfcLine.yValues} unit="kg/(N·h)" color="#1baf7a" decimals={3} xUnit="min" xDecimals={0} />
        <SweepChart title="Altitude" xValues={altitudeLine.xValues} yValues={altitudeLine.yValues} unit="m" color="#8a7cf5" decimals={0} xUnit="min" xDecimals={0} />
        <SweepChart title="Flight Mach" xValues={machLine.xValues} yValues={machLine.yValues} unit="" color="#d64f8a" decimals={2} xUnit="min" xDecimals={0} />
      </div>
    </ExpandableSection>
  );
}
