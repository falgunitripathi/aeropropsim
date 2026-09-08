/**
 * Combustor — energy balance for fuel-air ratio, pressure loss.
 *
 * Ref: §5 (Combustor).
 * Faithful JS port of aeropropsim/combustor.py.
 */

import { CP_C, CP_H } from "./constants.js";

/**
 * Solve the combustor energy balance for fuel-air ratio f.
 *
 * Ref: §5, p.288, 300. Rearranged form of
 *     (mdot_a + mdot_f)*Cph*T04 = mdot_a*Cpc*T03 + eta_b*mdot_f*Q_R
 *
 *     f = [(Cph/Cpc)(T04/T03) - 1] / [(eta_b*Q_R)/(Cpc*T03) - (Cph/Cpc)(T04/T03)]
 *
 * @param {number} T03 - combustor inlet (compressor exit) stagnation
 *   temperature, K.
 * @param {number} T04 - combustor exit stagnation temperature = TIT, the
 *   fixed design target, K.
 * @param {number} eta_b - combustor efficiency (typical ~0.97, §10).
 * @param {number} Q_R - fuel heating value, J/kg. NOT given a
 *   source-derived number for kerosene in the extracted reference (see
 *   constants.js DEFAULTS["Q_R"] comment) — pass explicitly for anything
 *   beyond a first sanity check.
 * @param {number} cp_c
 * @param {number} cp_h
 * @returns {number} f: fuel-air ratio (dimensionless, mdot_f/mdot_a).
 */
export function fuelAirRatio(T03, T04, eta_b, Q_R, cp_c = CP_C, cp_h = CP_H) {
  const ratio_cp = cp_h / cp_c;
  const temp_ratio = T04 / T03;
  const numerator = ratio_cp * temp_ratio - 1.0;
  const denominator = (eta_b * Q_R) / (cp_c * T03) - ratio_cp * temp_ratio;
  if (denominator <= 0) {
    throw new Error(
      "fuelAirRatio: non-physical result (denominator <= 0) — check that " +
      "Q_R is large enough relative to T04/T03 for this eta_b; typically " +
      "this means TIT (T04) has been set too high for the given inlet " +
      "temperature and fuel heating value."
    );
  }
  return numerator / denominator;
}

/**
 * p04 = p03*(1 - delta_p_cc_pct).  Ref: §5, p.288, 399.
 * delta_p_cc_pct is a fraction (e.g. 0.05 for a 5% loss), not a percent.
 */
export function combustorExitPressure(p03, delta_p_cc_pct) {
  return p03 * (1.0 - delta_p_cc_pct);
}

/**
 * phi_eq = f/f_stoich.  Ref: §5, p.288, 399.
 * Design rule (source): overall phi_eq should stay below 1 (lean overall)
 * to protect the liner and turbine.
 */
export function equivalenceRatio(f, f_stoich) {
  return f / f_stoich;
}
