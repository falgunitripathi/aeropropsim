/**
 * Compressor-turbine shaft power balance — the single physical constraint
 * that turns two independent component models into one working engine.
 *
 * Ref: §7 (Compressor-Turbine Matching).
 * Faithful JS port of aeropropsim/matching.py.
 *
 * Design-decision note
 * ---------------------
 * The reference gives TWO forms for the shaft balance:
 *
 *   (A) the basic energy balance (its first equation):
 *         Cpc*(T03-T02) = lambda*eta_m*(1+f)*Cph*(T04-T05)
 *
 *   (B) a rearranged closed form solving directly for T05/T04 (its second
 *       equation), which additionally carries eta_c and eta_t inside the
 *       denominator:
 *         T05/T04 = 1 - [(Cpc/Cph)*T02 / (lambda*(1+f)*eta_m*eta_c*eta_t*T04)]
 *                       * [T03/T02 - 1]
 *
 *   Algebraically inverting (A) for T05/T04 gives
 *         T05/T04 = 1 - [Cpc*(T03-T02)] / [lambda*eta_m*(1+f)*Cph*T04]
 *   which does NOT reduce to (B) — (B) carries extra eta_c*eta_t factors
 *   in the denominator that (A) does not produce under a direct
 *   rearrangement. This could mean (B) additionally re-expresses T03-T02
 *   in terms of the compressor's IDEAL (isentropic) temperature rise via
 *   eta_c (and folds an analogous turbine-side redefinition via eta_t)
 *   rather than the actual rise — but that reading cannot be confirmed
 *   from the extracted transcript alone.
 *
 *   Rather than wire an algebraic relationship into the solver that this
 *   package cannot independently re-derive and confirm, `turbineTempRatio`
 *   below implements ONLY the unambiguous, first-principles form (A) —
 *   pure energy conservation, nothing else. Form (B) is kept here purely
 *   as documentation/citation, in `turbineTempRatioSourceClosedForm`,
 *   clearly marked as NOT used by the solver and worth checking against
 *   the original book (Saravanamuttoo/Mattingly) before ever wiring it in.
 */

import { GAMMA_H, CP_C, CP_H } from "./constants.js";

/**
 * T05/T04 from the basic shaft energy balance (form A, see module
 * docstring).  Ref: §7, p.289-291.
 *
 *     Cpc*(T03-T02) = lambda*eta_m*(1+f)*Cph*(T04-T05)
 *     => T05/T04 = 1 - Cpc*(T03-T02) / (lambda*eta_m*(1+f)*Cph*T04)
 *
 * @param {number} T02 - compressor inlet stagnation temperature, K.
 * @param {number} T03 - compressor exit stagnation temperature, K.
 * @param {number} T04 - turbine inlet stagnation temperature (TIT), K.
 * @param {number} lam - lambda, fraction of turbine power driving the
 *   compressor (typical 0.75-0.85, §10).
 * @param {number} eta_m - mechanical (shaft) efficiency (typical ~0.98, §10).
 * @param {number} f - fuel-air ratio.
 * @param {number} cp_c
 * @param {number} cp_h
 * @returns {number} T05/T04 (turbine stagnation-temperature ratio across
 *   the turbine).
 */
export function turbineTempRatio(T02, T03, T04, lam, eta_m, f, cp_c = CP_C, cp_h = CP_H) {
  const compressor_work_specific = cp_c * (T03 - T02);
  const turbine_capacity = lam * eta_m * (1.0 + f) * cp_h * T04;
  return 1.0 - compressor_work_specific / turbine_capacity;
}

/**
 * The reference's second (compound) closed form for T05/T04 — Ref: §7,
 * p.289-291. NOT used by the solver; kept for citation/comparison only.
 * See module docstring's "Design-decision note" before using this.
 */
export function turbineTempRatioSourceClosedForm(T02, T03, T04, lam, eta_m, f,
                                                  eta_c, eta_t, cp_c = CP_C, cp_h = CP_H) {
  const ratio_cp = cp_c / cp_h;
  const bracket = (T03 / T02) - 1.0;
  return 1.0 - (ratio_cp * T02) / (lam * (1.0 + f) * eta_m * eta_c * eta_t * T04) * bracket;
}

/**
 * p05/p04 from the turbine's isentropic efficiency definition.
 * Ref: §7, p.289-291.
 *
 *     eta_t = (T04-T05)/(T04-T05s)
 *     => T05s/T04 = 1 - (1/eta_t)*(1-T05/T04)
 *     => p05/p04 = (T05s/T04)^(gamma_h/(gamma_h-1))
 */
export function turbinePressureRatio(T05_over_T04, eta_t, gamma_h = GAMMA_H) {
  const T05s_over_T04 = 1.0 - (1.0 / eta_t) * (1.0 - T05_over_T04);
  if (T05s_over_T04 <= 0) {
    throw new Error(
      `turbinePressureRatio: non-physical (T05s/T04=${T05s_over_T04.toFixed(4)} <= 0) ` +
      `— check eta_t and T05/T04 inputs.`
    );
  }
  return T05s_over_T04 ** (gamma_h / (gamma_h - 1.0));
}

/**
 * mdot_t = mdot_c*(1+f-b).  Ref: §7, p.635. b = bleed-air ratio (0 if
 * unmodelled).
 */
export function massFlowTurbine(mdot_c, f, b = 0.0) {
  return mdot_c * (1.0 + f - b);
}
