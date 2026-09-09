import { fmt } from "../utils/format.js";

const CURRENT_VALUE_ROWS = [
  { label: "Intake / diffuser efficiency η_d", key: "eta_d", digits: 3 },
  { label: "Compressor stage efficiency η_c", key: "eta_c_stage", digits: 3 },
  { label: "Combustor efficiency η_b", key: "eta_b", digits: 3 },
  { label: "Combustor pressure-loss fraction", key: "delta_p_cc_pct", digits: 3 },
  { label: "Fuel heating value Q_R (MJ/kg)", key: "Q_R", digits: 1, scale: 1e-6 },
  { label: "Shaft power fraction λ", key: "lambda_shaft", digits: 3 },
  { label: "Mechanical efficiency η_m", key: "eta_m", digits: 3 },
  { label: "Turbine stage efficiency η_tt", key: "eta_tt_stage", digits: 3 },
  { label: "Nozzle efficiency η_N", key: "eta_N", digits: 3 },
  { label: "Cold-section γ_c", key: "gamma_c", digits: 3 },
  { label: "Cold-section Cp_c (J/(kg·K))", key: "cp_c", digits: 0 },
  { label: "Hot-section γ_h", key: "gamma_h", digits: 3 },
  { label: "Hot-section Cp_h (J/(kg·K))", key: "cp_h", digits: 0 },
];

const SIMPLIFICATIONS = [
  {
    title: "Ideal vs. real components",
    body: "Every component (intake, compressor, combustor, turbine, nozzle) is modeled with a single efficiency number rather than a detailed loss breakdown (blade losses, tip clearance, secondary flows, etc.) — the standard “component efficiency” abstraction used throughout gas-turbine cycle analysis, not a full CFD-level model.",
  },
  {
    title: "Gas properties",
    body: "Calorically perfect, ideal-gas air on the cold side and combustion products on the hot side, each with its own constant γ and Cp (no continuous variation of gas properties with temperature or composition across the combustor).",
  },
  {
    title: "Two documented judgment calls, found and resolved during textbook validation",
    body: "Intake ram-efficiency convention and choked-nozzle exit-temperature convention each have two legitimate forms in the literature; this app defaults to one (documented in each physics module) and exposes the alternate, textbook-matching convention only for the Validation panel above.",
  },
  {
    title: "Combustor fuel-air ratio",
    body: "Uses the fuller energy-balance formula by default rather than the common simplified linear estimate (mdot_f = mdot_a·Cp_g·(TIT−T_compexit)/Q_R, valid for f≪1) — the two differ by roughly 11% at typical operating points, a real and now-quantified simplification difference rather than a bug.",
  },
  {
    title: "Overall efficiency identity",
    body: "η_overall = η_thermal·η_propulsive and η_overall = Thrust·V/(mdot_f·Q_R) are algebraically identical only in the f→0 limit, not exactly — the standard “f≪1” simplification behind the general thrust equation.",
  },
  {
    title: "Atmosphere model",
    body: "The ISA troposphere relation only — altitudes above 11 km (stratosphere) intentionally raise an error rather than silently extrapolating.",
  },
  {
    title: "Radial turbine staging",
    body: "A radial turbine is modeled single-stage only, per the source material's own design guidance that multi-staging a radial turbine is impractical.",
  },
  {
    title: "Unsourced numeric defaults",
    body: "Combustor pressure-loss fraction (5%) and axial-turbine per-stage efficiency (0.90) have no explicit published number in this project's primary source material — both are conventional literature placeholders, flagged as such in the code, and freely editable in the Advanced section of the form on the left.",
  },
];

/**
 * Phase 3 — in-app assumptions panel: what this model assumes, surfaced
 * where a reader of the results can actually see it, rather than only in
 * code comments or the repository README. The efficiency/gas-property
 * table reflects the *current* configuration (including any Advanced
 * overrides); the simplification list is the project's fixed, documented
 * set of judgment calls independent of the current inputs.
 */
export default function AssumptionsPanel({ config }) {
  return (
    <section>
      <h2>Assumptions</h2>
      <p className="section-note">
        This is a single design-point, ideal-cycle turbojet model. The
        table below shows the efficiency and gas-property values behind
        the results above right now (editable in the Advanced section of
        the form on the left); the list below it is the fixed set of
        simplifications and judgment calls this model makes everywhere.
      </p>
      <div className="table-scroll">
        <table className="assumptions-table">
          <thead>
            <tr><th>Quantity</th><th>Current value</th></tr>
          </thead>
          <tbody>
            {CURRENT_VALUE_ROWS.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{fmt(config[row.key] * (row.scale || 1), row.digits)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="assumptions-list">
        {SIMPLIFICATIONS.map((s) => (
          <div className="assumptions-item" key={s.title}>
            <dt>{s.title}</dt>
            <dd>{s.body}</dd>
          </div>
        ))}
      </dl>
      <p className="section-note">
        Full derivations and provenance for each of these live in the
        repository README (&ldquo;Validation status&rdquo; and &ldquo;Known
        simplifications and judgment calls&rdquo;).
      </p>
    </section>
  );
}
