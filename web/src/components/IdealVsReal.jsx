import { useMemo } from "react";
import { solveEngine } from "../physics/engine.js";
import { fmt, tsfcPerHour } from "../utils/format.js";
import ExpandableSection from "./ExpandableSection.jsx";

const STATION_ORDER = ["a", "2", "3", "4", "5", "9"];

const PERF_ROWS = [
  { label: "Thrust", key: "thrust", digits: 1, unit: " N" },
  { label: "TSFC", key: "tsfc", digits: 3, unit: " kg/(N·h)", tsfcHr: true },
  { label: "Thermal efficiency", key: "eta_thermal", digits: 1, unit: "%", pct: true },
  { label: "Propulsive efficiency", key: "eta_propulsive", digits: 1, unit: "%", pct: true },
  { label: "Overall efficiency", key: "eta_overall", digits: 1, unit: "%", pct: true },
];

/**
 * Re-solves the current configuration with every loss mechanism switched
 * off — all component efficiencies forced to 1.0 and the combustor
 * pressure loss forced to 0 — to isolate what those losses actually cost
 * in thrust and efficiency. Zero new physics: this is the same
 * `solveEngine` the rest of the app calls, just fed an idealized copy of
 * the current inputs.
 */
function solveIdeal(config) {
  return solveEngine({
    ...config,
    eta_d: 1.0,
    eta_c_stage: 1.0,
    eta_b: 1.0,
    eta_m: 1.0,
    eta_tt_stage: 1.0,
    eta_N: 1.0,
    delta_p_cc_pct: 0.0,
  });
}

function perfValue(perf, row) {
  const v = perf[row.key];
  if (v === null || v === undefined) return null;
  if (row.tsfcHr) return tsfcPerHour(v);
  if (row.pct) return v * 100;
  return v;
}

export default function IdealVsReal({ config, result }) {
  const ideal = useMemo(() => {
    try {
      return solveIdeal(config);
    } catch {
      return null;
    }
  }, [config]);

  if (!ideal) {
    return (
      <ExpandableSection title="Ideal vs. real engine" summary="Couldn't solve the idealized (loss-free) version of this configuration.">
        <p className="section-note">
          The loss-free version of this configuration isn&rsquo;t physically
          valid (it likely violates a nozzle or matching constraint) — try
          a different design point.
        </p>
      </ExpandableSection>
    );
  }

  return (
    <ExpandableSection
      title="Ideal vs. real engine"
      summary="Same configuration re-solved with every component loss switched off (η=1, no combustor pressure loss) — isolates what real-world losses actually cost. Expand for the full comparison."
    >
      <p className="section-note">
        &ldquo;Real&rdquo; is this configuration exactly as solved on the
        left. &ldquo;Ideal&rdquo; re-solves the same design with intake,
        compressor, combustor, mechanical, turbine, and nozzle efficiencies
        all forced to 1.0 and combustor pressure loss forced to 0 — an
        upper bound this design could never actually reach, useful only as
        a reference for how much the real component losses cost.
      </p>
      <div className="table-scroll">
        <table className="validation-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Real (as configured)</th>
              <th>Ideal (loss-free)</th>
              <th>Cost of losses</th>
            </tr>
          </thead>
          <tbody>
            {PERF_ROWS.map((row) => {
              const realV = perfValue(result.performance, row);
              const idealV = perfValue(ideal.performance, row);
              const delta = realV !== null && idealV !== null && idealV !== 0
                ? ((realV - idealV) / idealV) * 100
                : null;
              return (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td>{realV !== null ? `${fmt(realV, row.digits)}${row.unit}` : "—"}</td>
                  <td>{idealV !== null ? `${fmt(idealV, row.digits)}${row.unit}` : "—"}</td>
                  <td>{delta !== null ? `${delta >= 0 ? "+" : ""}${fmt(delta, 1)}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3>Per-station stagnation losses</h3>
      <p className="section-note">
        How far each station&rsquo;s stagnation temperature and pressure
        fall short of the loss-free case — the running tally of where the
        real design is paying for its component efficiencies.
      </p>
      <div className="table-scroll">
        <table className="validation-table">
          <thead>
            <tr>
              <th>Station</th>
              <th>T0 real</th>
              <th>T0 ideal</th>
              <th>p0 real</th>
              <th>p0 ideal</th>
            </tr>
          </thead>
          <tbody>
            {STATION_ORDER.filter((key) => result.stations[key] && ideal.stations[key]).map((key) => {
              const r = result.stations[key];
              const i = ideal.stations[key];
              return (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{fmt(r.T0, 1)} K</td>
                  <td>{fmt(i.T0, 1)} K</td>
                  <td>{fmt(r.p0 / 1000, 1)} kPa</td>
                  <td>{fmt(i.p0 / 1000, 1)} kPa</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ExpandableSection>
  );
}
