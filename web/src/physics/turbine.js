/**
 * Turbine — Euler work equation, axial stage-stacking, radial-inflow turbine.
 *
 * Ref: §6 (Turbine).
 * Faithful JS port of aeropropsim/turbine.py.
 *
 * The stage-stacking design-decision note in compressor.js applies
 * symmetrically here: each stage's own pressure (expansion) ratio uses
 * that stage's own INLET stagnation temperature in the denominator, for
 * the same reasons given there.
 */

import { GAMMA_H, CP_H } from "./constants.js";

// ---------------------------------------------------------------------------
// §6.1 General — axial turbine stage work & expansion ratio
// ---------------------------------------------------------------------------

/** W_T = U*(Vtheta2 + Vtheta3).  Ref: §6.1, p.590-592. */
export function stageWork(U, Vtheta2, Vtheta3) {
  return U * (Vtheta2 + Vtheta3);
}

/**
 * p_out/p_in (< 1, an expansion) for a given stagnation-temperature drop
 * dT0s across the stage.  Ref: §6.1, p.590-591.
 *
 *     dT0s = eta_tt*T01*[1 - (p_out/p_in)^((gamma_h-1)/gamma_h)]
 *     => p_out/p_in = [1 - dT0s/(eta_tt*T01)]^(gamma_h/(gamma_h-1))
 *
 * Returns the ratio p_out/p_in directly (<=1). Callers wanting the
 * "expansion ratio" as conventionally quoted (>=1, e.g. "2.5:1") should
 * take 1/return-value.
 */
export function stagePressureRatioFromDT0(dT0s, T01, eta_tt, gamma_h = GAMMA_H) {
  const bracket = 1.0 - dT0s / (eta_tt * T01);
  if (bracket <= 0) {
    throw new Error(
      `stagePressureRatioFromDT0: non-physical (bracket=${bracket.toFixed(4)} <= 0) ` +
      `— dT0s=${dT0s.toFixed(1)} K is too large for T01=${T01.toFixed(1)} K at eta_tt=${eta_tt}.`
    );
  }
  return bracket ** (gamma_h / (gamma_h - 1.0));
}

/**
 * Inverse of stagePressureRatioFromDT0: back-solve dT0s from a required
 * p_out/p_in ratio (<=1).  Ref: §6.1, p.590-591 (rearranged).
 */
export function dT0FromStagePressureRatio(pr_out_over_in, T01, eta_tt, gamma_h = GAMMA_H) {
  const bracket = pr_out_over_in ** ((gamma_h - 1.0) / gamma_h);
  return eta_tt * T01 * (1.0 - bracket);
}

/**
 * psi (stage loading), phi (flow coefficient), Lambda (degree of
 * reaction) for an axial turbine stage.  Ref: §6.1, p.592-594.
 *
 *     psi = 2*Cph*dT0s/U^2 = 2*phi*(tan(beta2)+tan(beta3))
 *     phi = Vz/U
 *     Lambda = (phi/2)*(tan(beta3) - tan(beta2))
 *
 * beta2, beta3 in radians. At Lambda=0.5 (standard design): beta3=alpha2,
 * beta2=alpha3.
 */
export function loadingFlowReactionCoefficients(U, dT0s, Vz, beta2, beta3, cp_h = null) {
  const cph = cp_h === null || cp_h === undefined ? CP_H : cp_h;
  const psi = 2.0 * cph * dT0s / U ** 2;
  const phi = Vz / U;
  const Lambda = (phi / 2.0) * (Math.tan(beta3) - Math.tan(beta2));
  return { psi, phi, Lambda };
}

// ---------------------------------------------------------------------------
// §6.1 Axial turbine — multi-stage stacking procedure
// ---------------------------------------------------------------------------

/**
 * Stage-stack an axial turbine across a target overall expansion.
 *
 * Ref: §6.1 "Stage-stacking procedure" — mirrors §4.2's compressor method
 * in the temperature-DROP direction.
 *
 * @param {number} pr_overall_out_over_in - target overall p_out/p_in (<1)
 *   across all turbine stages, i.e. p05/p04 from the shaft power balance
 *   (§7) — NOT a free choice, see matching.js.
 * @param {number} n_stages - number of turbine stages (>= 1).
 * @param {number} T01_in - turbine inlet stagnation temperature (T04 = TIT), K.
 * @param {number} eta_tt - assumed constant per-stage total-to-total efficiency.
 * @param {number} gamma_h
 * @returns {{stages: object[], T01_out: number, pr_actual: number,
 *   dT_turbine_total: number}}
 */
export function stackAxialTurbine(pr_overall_out_over_in, n_stages, T01_in, eta_tt,
                                   gamma_h = GAMMA_H) {
  if (n_stages < 1) {
    throw new Error("n_stages must be >= 1");
  }
  if (!(pr_overall_out_over_in > 0.0 && pr_overall_out_over_in < 1.0)) {
    throw new Error("pr_overall_out_over_in must be in (0,1) (a turbine expands)");
  }

  const dT_turbine_total = T01_in * eta_tt * (
    1.0 - pr_overall_out_over_in ** ((gamma_h - 1.0) / gamma_h)
  );
  // ^ This is simply stagePressureRatioFromDT0 inverted at n_stages=1
  //   scale, i.e. dT0FromStagePressureRatio applied to the OVERALL
  //   ratio; kept inline here since it's the "size the total drop" step
  //   (mirrors compressor step 1), before splitting across stages.
  const dT0_stage_nominal = dT_turbine_total / n_stages;

  const stages = [];
  let T01_running = T01_in;
  let p_rel_running = 1.0;
  let pr_product = 1.0;

  if (n_stages === 1) {
    const pr_last = pr_overall_out_over_in;
    const dT0_last = dT0FromStagePressureRatio(pr_last, T01_running, eta_tt, gamma_h);
    stages.push({
      T01_in: T01_running, T01_out: T01_running - dT0_last,
      dT0: dT0_last, pr_stage: pr_last,
      p_in_rel: p_rel_running, p_out_rel: p_rel_running * pr_last,
    });
    pr_product = pr_last;
    T01_running -= dT0_last;
    p_rel_running *= pr_last;
  } else {
    for (let i = 1; i < n_stages; i++) {
      const pr_i = stagePressureRatioFromDT0(dT0_stage_nominal, T01_running, eta_tt, gamma_h);
      stages.push({
        T01_in: T01_running, T01_out: T01_running - dT0_stage_nominal,
        dT0: dT0_stage_nominal, pr_stage: pr_i,
        p_in_rel: p_rel_running, p_out_rel: p_rel_running * pr_i,
      });
      pr_product *= pr_i;
      T01_running -= dT0_stage_nominal;
      p_rel_running *= pr_i;
    }

    const pr_last = pr_overall_out_over_in / pr_product;
    const dT0_last = dT0FromStagePressureRatio(pr_last, T01_running, eta_tt, gamma_h);
    stages.push({
      T01_in: T01_running, T01_out: T01_running - dT0_last,
      dT0: dT0_last, pr_stage: pr_last,
      p_in_rel: p_rel_running, p_out_rel: p_rel_running * pr_last,
    });
    pr_product *= pr_last;
    T01_running -= dT0_last;
    p_rel_running *= pr_last;
  }

  return {
    stages,
    T01_out: T01_running,
    pr_actual: pr_product,
    dT_turbine_total: dT_turbine_total,
  };
}

// ---------------------------------------------------------------------------
// §6.2 Radial-inflow turbine
// ---------------------------------------------------------------------------

/**
 * W = U2^2, for the standard 90-degree IFR case (beta2=0 radial inlet,
 * Vtheta3=0 zero exit swirl).  Ref: §6.2, p.628-630.
 */
export function radialTurbineWork(U2) {
  return U2 ** 2;
}

/**
 * V0 = sqrt(2*Cph*(T01-T03ss)).  Ref: §6.2, p.629-630.
 * T03ss is the ideal (isentropic-to-ambient-exit-pressure) static exit
 * temperature.
 */
export function spoutingVelocity(cp_h, T01, T03ss) {
  return Math.sqrt(2.0 * cp_h * (T01 - T03ss));
}

/**
 * U2 = ratio * V0, with the source's recommended U2/V0 ~ 0.707.
 * Ref: §6.2, p.629-630.
 */
export function radialTurbineSizeU2(V0, ratio = 0.707) {
  return ratio * V0;
}

/** eta_tt = (T01-T03)/(T01-T03s).  Ref: §6.2, p.629-630. */
export function radialTurbineEtaTt(T01, T03, T03s) {
  return (T01 - T03) / (T01 - T03s);
}
