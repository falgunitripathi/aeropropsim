/**
 * Compressor — Euler work equation, axial stage-stacking, centrifugal stage.
 *
 * Ref: §4 (Compressor).
 * Faithful JS port of aeropropsim/compressor.py.
 *
 * Design-decision note (stage-stacking, §4.2)
 * --------------------------------------------
 * The reference's stacking procedure (see its own step 3) writes each
 * stage's own pressure ratio as
 *     pi_i = (1 + eta_st * dT0_stage / (T01)_i) ^ (gamma_c/(gamma_c-1))
 * where "(T01)_i" is defined one line earlier by the recursion
 *     (T01)_i = (T01)_{i-1} + dT0_stage.
 * Read literally, (T01)_i is the temperature AFTER stage i (its own exit
 * temperature), which would put the stage's *exit* temperature in the
 * denominator of its *own* pressure-ratio formula. That is NOT what the
 * base per-stage formula earlier in the same section says (that formula,
 * p03/p01 = (1 + eta_st*dT0/T01)^(...), unambiguously uses the stage's
 * *inlet* stagnation temperature T01 in the denominator).
 *
 * Rather than silently pick one reading, this module implements the
 * mathematically standard interpretation — denominator = that stage's own
 * INLET stagnation temperature, consistent with the base §4.2 formula —
 * and flags the discrepancy here explicitly. This is the more physically
 * conventional stacking approach (and is what produces the "pi_i drifts
 * slightly downward stage-to-stage" behavior the source text itself
 * describes, since a fixed dT0 is a shrinking fraction of a monotonically
 * RISING inlet temperature either way). If the user has access to the
 * original book and can confirm the literal reading was intended, this is
 * the one place in the codebase to revisit.
 */

import { GAMMA_C } from "./constants.js";

// ---------------------------------------------------------------------------
// §4.1 General — Euler's turbomachinery equation
// ---------------------------------------------------------------------------

/**
 * W = U2*Vtheta2 - U1*Vtheta1.  Ref: §4.1, p.437.
 * For an axial inlet with no inlet swirl (Vtheta1=0): W = U*Vtheta2.
 */
export function eulerWork(U2, Vtheta2, U1 = 0.0, Vtheta1 = 0.0) {
  return U2 * Vtheta2 - U1 * Vtheta1;
}

// ---------------------------------------------------------------------------
// §4.2 Axial compressor — single-stage relations
// ---------------------------------------------------------------------------

/** dT0/T01 = U*dVtheta / (Cpc*T01).  Ref: §4.2, p.503-508. */
export function stageTempRiseRatio(U, delta_Vtheta, T01, cp_c) {
  return U * delta_Vtheta / (cp_c * T01);
}

/**
 * pi_stage = (1 + eta_st * dT0/T01)^(gamma_c/(gamma_c-1)).
 * Ref: §4.2, p.503-508.
 */
export function stagePressureRatio(dT0_over_T01, eta_st, gamma_c = GAMMA_C) {
  return (1.0 + eta_st * dT0_over_T01) ** (gamma_c / (gamma_c - 1.0));
}

/**
 * Lambda = (Vz/2U)*(tan(beta1)+tan(beta2)).  Ref: §4.2, p.518-523.
 * Angles beta1, beta2 in radians. At Lambda=0.5 ("symmetrical blading",
 * the standard design choice): alpha1=beta2, alpha2=beta1.
 */
export function degreeOfReactionAxial(Vz, U, beta1, beta2) {
  return (Vz / (2.0 * U)) * (Math.tan(beta1) + Math.tan(beta2));
}

/**
 * Overall isentropic efficiency derived from a constant polytropic
 * efficiency and the overall pressure ratio.  Ref: §4.2, p.532-535.
 *
 *     eta_c = [(p02/p01)^((gamma_c-1)/gamma_c) - 1]
 *           / [(p02/p01)^((gamma_c-1)/(gamma_c*eta_poly)) - 1]
 *
 * Key result (source): for fixed eta_poly, eta_c always comes out LOWER
 * than eta_poly, and the gap widens as pressure ratio rises. Use this to
 * *report* a derived overall efficiency — do not hold eta_c itself
 * constant across a pressure-ratio sweep.
 */
export function overallIsentropicEfficiency(pressure_ratio, eta_poly, gamma_c = GAMMA_C) {
  const exponent_isen = (gamma_c - 1.0) / gamma_c;
  const exponent_poly = (gamma_c - 1.0) / (gamma_c * eta_poly);
  const num = pressure_ratio ** exponent_isen - 1.0;
  const den = pressure_ratio ** exponent_poly - 1.0;
  return num / den;
}

// ---------------------------------------------------------------------------
// §4.2 Axial compressor — multi-stage stacking procedure
// ---------------------------------------------------------------------------

/**
 * Stage-stack an axial compressor to a target overall pressure ratio.
 *
 * Ref: §4.2 "Stage-stacking procedure" (steps 1-4).
 *
 * Step 1: invert T02/T01 = pi_c^((gamma_c-1)/(gamma_c*eta_poly)) for the
 *         overall stagnation-temperature rise required, using an assumed
 *         constant polytropic efficiency eta_poly.
 * Step 2: nominal per-stage rise dT0_stage = dT_compressor / n_stages.
 * Step 3: march stages 1..n_stages-1 using the *stage-inlet* isentropic
 *         relation pi_i = (1 + eta_st*dT0_stage/T01_i)^(gamma_c/(gamma_c-1))
 *         (see module docstring for the inlet-vs-exit subscript note).
 * Step 4: the LAST stage closes the loop exactly: pi_last =
 *         pi_c_target / prod(pi_1..pi_{n-1}), then dT0_last is
 *         back-solved from that required pi_last (not from the nominal
 *         per-stage value).
 *
 * @returns {{stages: object[], T01_out: number, pi_actual: number,
 *   dT_compressor_step1: number}}
 */
export function stackAxialCompressor(pi_c_target, n_stages, T01_in, eta_poly, eta_st,
                                      gamma_c = GAMMA_C) {
  if (n_stages < 1) {
    throw new Error("n_stages must be >= 1");
  }
  if (pi_c_target <= 1.0) {
    throw new Error("pi_c_target must be > 1 (a compressor raises pressure)");
  }

  // Step 1: overall temperature rise required for the target overall PR,
  // via the polytropic relation.
  const exponent_poly = (gamma_c - 1.0) / (gamma_c * eta_poly);
  const dT_compressor = T01_in * (pi_c_target ** exponent_poly - 1.0);

  // Step 2: nominal per-stage rise.
  const dT0_stage_nominal = dT_compressor / n_stages;

  const stages = [];
  let T01_running = T01_in;
  let p01_rel_running = 1.0; // relative pressure, p01_in of compressor == 1.0
  let pi_product = 1.0;

  if (n_stages === 1) {
    // Single stage: no "nominal march" — the one stage IS the last
    // stage, and must exactly hit pi_c_target.
    const pi_last = pi_c_target;
    const dT0_last = T01_running / eta_st * (
      pi_last ** ((gamma_c - 1.0) / gamma_c) - 1.0
    );
    stages.push({
      T01_in: T01_running, T01_out: T01_running + dT0_last,
      dT0: dT0_last, pi_stage: pi_last,
      p01_in_rel: p01_rel_running, p01_out_rel: p01_rel_running * pi_last,
    });
    pi_product = pi_last;
    T01_running += dT0_last;
    p01_rel_running *= pi_last;
  } else {
    // Step 3: march stages 1..n_stages-1 at the nominal rise.
    for (let i = 1; i < n_stages; i++) {
      const dT0_over_T01 = eta_st * dT0_stage_nominal / T01_running;
      const pi_i = (1.0 + dT0_over_T01) ** (gamma_c / (gamma_c - 1.0));
      stages.push({
        T01_in: T01_running, T01_out: T01_running + dT0_stage_nominal,
        dT0: dT0_stage_nominal, pi_stage: pi_i,
        p01_in_rel: p01_rel_running, p01_out_rel: p01_rel_running * pi_i,
      });
      pi_product *= pi_i;
      T01_running += dT0_stage_nominal;
      p01_rel_running *= pi_i;
    }

    // Step 4: last stage closes the overall pressure ratio exactly.
    const pi_last = pi_c_target / pi_product;
    const dT0_last = T01_running / eta_st * (
      pi_last ** ((gamma_c - 1.0) / gamma_c) - 1.0
    );
    stages.push({
      T01_in: T01_running, T01_out: T01_running + dT0_last,
      dT0: dT0_last, pi_stage: pi_last,
      p01_in_rel: p01_rel_running, p01_out_rel: p01_rel_running * pi_last,
    });
    pi_product *= pi_last;
    T01_running += dT0_last;
    p01_rel_running *= pi_last;
  }

  return {
    stages,
    T01_out: T01_running,
    pi_actual: pi_product,
    dT_compressor_step1: dT_compressor,
  };
}

// ---------------------------------------------------------------------------
// §4.3 Centrifugal compressor
// ---------------------------------------------------------------------------

/**
 * (T02-T01)/T01 = (gamma_c-1)*(U2/a01)^2 * (1 - (Wr2/U2)*tan(beta)).
 * Ref: §4.3, p.446-451. Straight-radial blade (beta=0) reduces to
 * (gamma_c-1)*(U2/a01)^2; pass Wr2=0 (default) for that case.
 * beta in radians; beta>0 backward-lean, beta<0 forward-lean.
 */
export function centrifugalTempRiseRatio(U2, a01, gamma_c = GAMMA_C, Wr2 = 0.0, beta_rad = 0.0) {
  const base = (gamma_c - 1.0) * (U2 / a01) ** 2;
  if (beta_rad === 0.0) {
    return base;
  }
  return base * (1.0 - (Wr2 / U2) * Math.tan(beta_rad));
}

/**
 * p03/p01 = [1 + eta_c*(gamma_c-1)*(U2/a01)^2*(1-(Wr2/U2)tan(beta))]^(gamma_c/(gamma_c-1)).
 * Ref: §4.3, p.468, 450.
 */
export function centrifugalStagePressureRatio(eta_c, U2, a01, gamma_c = GAMMA_C,
                                               Wr2 = 0.0, beta_rad = 0.0) {
  const dT_ratio = centrifugalTempRiseRatio(U2, a01, gamma_c, Wr2, beta_rad);
  return (1.0 + eta_c * dT_ratio) ** (gamma_c / (gamma_c - 1.0));
}

/**
 * sigma = Vtheta2/U2.  Ref: §4.3, p.468, 450.
 * (Renamed from the source's overloaded "epsilon" — see §0 transcription
 * note — to avoid clashing with the unrelated nozzle expansion-area-ratio
 * epsilon in §8.)
 */
export function slipFactor(Vtheta2, U2) {
  return Vtheta2 / U2;
}
