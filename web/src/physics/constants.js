/**
 * Gas properties (cold/hot section) and design-value defaults.
 *
 * Ref: §0 (Nomenclature/Properties), §10 (Design-value defaults).
 *
 * Faithful JS port of aeropropsim/constants.py — see that file for the
 * authoritative Python reference and full provenance notes. Every value
 * here must stay numerically identical to its Python counterpart; the
 * Python->JS parity harness (web/scripts/parity_check) checks this.
 */

// --- Cold section (compressor/intake side) gas properties ---
export const GAMMA_C = 1.400;
export const CP_C = 1005.0; // J/(kg*K)
export const R_C = CP_C * (GAMMA_C - 1.0) / GAMMA_C;

// --- Hot section (combustor/turbine/nozzle side) gas properties ---
export const GAMMA_H = 1.333;
export const CP_H = 1148.0; // J/(kg*K)
export const R_H = CP_H * (GAMMA_H - 1.0) / GAMMA_H;

/**
 * Design-value defaults, Ref: §10, each with its own provenance.
 * Several are explicitly "NOT IN SOURCE" — see aeropropsim/constants.py
 * for the full per-value commentary; kept here only as inline comments
 * so the JS port doesn't silently drop that context.
 */
export const DEFAULTS = {
  eta_d: 0.80, // intake/diffuser efficiency, §10 (typical 0.70-0.90)
  eta_c_stage: 0.90, // per-stage compressor isentropic/polytropic efficiency, §10
  sigma_slip: 0.90, // centrifugal compressor slip factor, §10
  V_z_axial: 175.0, // m/s, typical axial through-flow velocity, §10
  eta_b: 0.97, // combustor efficiency, §10
  delta_p_cc_pct: 0.05, // combustor pressure-loss fraction — NOT IN SOURCE (conventional placeholder)
  Q_R: 43.0e6, // J/kg, aviation kerosene (Jet-A) heating value — NOT IN SOURCE (standard published LHV)
  lambda_shaft: 0.80, // fraction of turbine power driving the compressor, §10 (typical 0.75-0.85)
  eta_m: 0.98, // mechanical (shaft) efficiency, §10
  eta_tt_stage: 0.90, // axial turbine per-stage total-to-total efficiency — NOT IN SOURCE (source only gives a number for the radial turbine, >0.7)
  eta_N: 0.95, // nozzle efficiency, §10
};

export const AXIAL_STAGE_DT0_BANDS_K = {
  subsonic: [10, 30],
  transonic: [45, 55],
  supersonic: [80, 80],
};

export const AXIAL_TURBINE_STAGE_PR_BAND = [2.0, 3.0];
export const AXIAL_TURBINE_STAGE_PR_MAX = 4.5;
