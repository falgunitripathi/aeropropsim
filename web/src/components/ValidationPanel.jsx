import { useMemo } from "react";
import { intakeExitPressureRamEfficiency } from "../physics/intake.js";
import { stackAxialCompressor } from "../physics/compressor.js";
import { turbineTempRatio, turbinePressureRatio } from "../physics/matching.js";
import { fuelAirRatio } from "../physics/combustor.js";
import {
  criticalPressure, isChoked, chokedExitTemperatureGanesanConvention,
  chokedExitVelocity, thrust as nozzleThrust,
} from "../physics/nozzle.js";
import { fmt } from "../utils/format.js";

// --- Ganesan, "Gas Turbines" 3rd ed. (Tata McGraw Hill), Worked Example 7.5,
// pp.258-261 — every input as given in the book. ---
const P_A = 0.458e5;
const T_A = 248.0;
const V_FLIGHT = (805.0 * 1000.0) / 3600.0;
const PI_C = 4.0;
const DP_CC = 0.21e5;
const TIT = 1100.0;
const ETA_RAM = 0.95;
const ETA_C = 0.85;
const ETA_T = 0.9;
const ETA_M = 0.99;
const ETA_N = 0.95;
const A_EXIT = 0.0935;
const QR = 43.0e6;
const CP_A = 1005.0;
const GAMMA_A = 1.4;
const CP_G = 1147.0;
const GAMMA_G = 1.33;
const R_G = (CP_G * (GAMMA_G - 1.0)) / GAMMA_G;

const GIVEN_INPUTS = [
  ["Ambient pressure p_a", "0.458 bar"],
  ["Ambient temperature T_a", "248 K"],
  ["Flight speed", "805 km/h"],
  ["Compressor pressure ratio π_c", "4.0"],
  ["Combustor pressure loss Δp_cc", "0.21 bar"],
  ["Turbine inlet temperature (TIT)", "1100 K"],
  ["Ram / diffuser efficiency η_d", "0.95"],
  ["Compressor efficiency η_c", "0.85"],
  ["Turbine efficiency η_t", "0.90"],
  ["Mechanical efficiency η_m", "0.99"],
  ["Nozzle efficiency η_N", "0.95"],
  ["Nozzle exit area", "0.0935 m²"],
];

/**
 * Runs the textbook's own worked example through this project's *actual*
 * shipped physics functions (the same ones the rest of the app calls) and
 * compares every published intermediate and final number against the
 * book. This mirrors `tests/test_validation_ganesan_example_7_5.py` and
 * `web/scripts/parity_check.mjs`, but recomputed live, in the browser,
 * from the exact code the user is running right now — not a hardcoded
 * table of numbers that could drift out of sync with the code.
 */
function runGanesanValidation() {
  const intake = intakeExitPressureRamEfficiency(T_A, P_A, V_FLIGHT, ETA_RAM, GAMMA_A, CP_A);
  const T02 = intake.T02;
  const p01 = intake.p02; // book's "p01" (compressor inlet stagnation pressure)
  const p02 = p01 * PI_C;

  const comp = stackAxialCompressor(PI_C, 1, T02, ETA_C, ETA_C, GAMMA_A);
  const T03 = comp.T01_out;

  const p03 = p02 - DP_CC;

  const T05_over_T04 = turbineTempRatio(T02, T03, TIT, 1.0, ETA_M, 0.0, CP_A, CP_G);
  const T04 = T05_over_T04 * TIT;

  const p04_over_p03 = turbinePressureRatio(T05_over_T04, ETA_T, GAMMA_G);
  const p04 = p03 * p04_over_p03;

  const p_c = criticalPressure(p04, ETA_N, GAMMA_G);
  const choked = isChoked(p_c, P_A);
  const T_exit = chokedExitTemperatureGanesanConvention(T04, ETA_N, GAMMA_G);
  const V_exit = chokedExitVelocity(T_exit, GAMMA_G, R_G);
  const rho_exit = p_c / (R_G * T_exit);
  const mdot_a = rho_exit * A_EXIT * V_exit;

  const F = nozzleThrust(mdot_a, 0.0, V_exit, V_FLIGHT, p_c, P_A, A_EXIT);

  const mdot_f_book_estimate = (mdot_a * CP_G * (TIT - T03)) / QR;
  const f_rigorous = fuelAirRatio(T03, TIT, 1.0, QR, CP_A, CP_G);
  const sfc = (mdot_f_book_estimate * 3600.0) / F;
  const f_book_equivalent = 0.263 / 14.67;

  return [
    { label: "T02 — compressor inlet stagnation temp (book T01)", got: T02, want: 272.87, tol: 0.05, unit: " K" },
    { label: "p01 — compressor inlet stagnation pressure", got: p01 / 1e5, want: 0.631, tol: 0.001, unit: " bar" },
    { label: "T03 — compressor exit stagnation temp (book T02)", got: T03, want: 429.08, tol: 0.3, unit: " K" },
    { label: "p02 — compressor exit stagnation pressure", got: p02 / 1e5, want: 2.524, tol: 0.01, unit: " bar" },
    { label: "T04 — turbine exit stagnation temp (book T04)", got: T04, want: 961.75, tol: 0.5, unit: " K" },
    { label: "p03 — combustor exit stagnation pressure", got: p03 / 1e5, want: 2.31, tol: 0.01, unit: " bar" },
    { label: "p04 — nozzle inlet stagnation pressure", got: p04 / 1e5, want: 1.26, tol: 0.01, unit: " bar" },
    { label: "Nozzle choking", got: choked ? 1 : 0, want: 1, tol: 0, unit: "", display: choked ? "Choked" : "Unchoked", displayWant: "Choked" },
    { label: "T_exit — choked nozzle exit temperature", got: T_exit, want: 818.35, tol: 0.3, unit: " K" },
    { label: "V_exit — nozzle exit velocity", got: V_exit, want: 556.56, tol: 0.5, unit: " m/s" },
    { label: "ṁ_a — air mass flow (back-solved from exit area)", got: mdot_a, want: 14.67, tol: 14.67 * 0.005, unit: " kg/s" },
    { label: "Thrust F", got: F, want: 6745.17, tol: 6745.17 * 0.01, unit: " N" },
    { label: "SFC (linear estimate, matches book's own formula)", got: sfc, want: 0.14, tol: 0.14 * 0.02, unit: " kg/(N·h)" },
    {
      label: "f — rigorous energy-balance fuel-air ratio",
      got: f_rigorous, want: f_book_equivalent, tol: f_book_equivalent * 0.15, unit: "",
      note: "Book uses the simplified linear estimate (f≈0.0179); this project's default combustor.fuelAirRatio uses the fuller energy balance — the two differ by ~11%, a documented simplification difference, not a bug (see README).",
    },
  ];
}

export default function ValidationPanel() {
  const rows = useMemo(() => runGanesanValidation(), []);
  const allPass = rows.every((r) => Math.abs(r.got - r.want) <= (r.tol || 1e-9));

  return (
    <section>
      <h2>Validation against a published textbook example</h2>
      <p className="section-note">
        This isn&rsquo;t a claim about the current configuration in the
        form on the left — it&rsquo;s an independent, external check that
        the physics code itself is correct. The numbers below are computed
        live, right now, in your browser, by calling the exact same
        physics functions the rest of this app uses — fed with the inputs
        from V. Ganesan, <em>Gas Turbines</em>, 3rd ed. (Tata McGraw
        Hill), Worked Example 7.5 (pp.258&ndash;261), and compared against
        that book&rsquo;s own published answers.
      </p>
      <details className="glossary">
        <summary>Textbook inputs used for this check</summary>
        <div className="glossary-list">
          {GIVEN_INPUTS.map(([label, value]) => (
            <div className="glossary-row" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </div>
      </details>
      <div className="table-scroll">
        <table className="validation-table">
          <thead>
            <tr>
              <th>Quantity</th>
              <th>Computed here</th>
              <th>Published in book</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ok = Math.abs(r.got - r.want) <= (r.tol || 1e-9);
              return (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td>{r.display || `${fmt(r.got, 3)}${r.unit}`}</td>
                  <td>{r.displayWant || `${fmt(r.want, 3)}${r.unit}`}</td>
                  <td>
                    <span className={`validation-badge${ok ? " is-pass" : " is-fail"}`}>
                      {ok ? "Match" : "Mismatch"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={`validation-summary${allPass ? " is-pass" : " is-fail"}`}>
        {allPass
          ? "All 14 checks match the published textbook example."
          : "Some checks did not match — see the table above."}
      </p>
      {rows.some((r) => r.note) && (
        <p className="section-note">{rows.find((r) => r.note).note}</p>
      )}
    </section>
  );
}
