/**
 * Generic compressor characteristic — a smooth, analytic non-dimensional
 * compressor map used ONLY for off-design matching (see offDesign.js).
 *
 * NOT IN SOURCE. This is the one place this project departs from its
 * otherwise strict "everything traces to the reference PDF" discipline, and
 * it does so because the reference itself says so explicitly: its own text
 * calls off-design/component-map matching out of v1 scope precisely because
 * it never supplies actual compressor or turbine performance-map data (see
 * README "Known limitations"). There is no way to model off-design behavior
 * of a FIXED piece of hardware without a compressor map from somewhere; a
 * real one isn't in this project's source material, so this module builds a
 * generic, physically-shaped one instead of silently pretending it comes
 * from the book.
 *
 * This is not a digitization of any specific real compressor's published
 * map. It is a minimal analytic surrogate with the qualitative shape every
 * real axial-compressor map shares — pressure ratio and efficiency both
 * peak at the design corrected speed and design corrected flow, and both
 * fall away smoothly toward surge (too little flow for the speed) and choke
 * (too much) — built so that:
 *   (a) it passes through the actual design point exactly, by construction
 *       (Nr=1, mr=1 always gives back the design pi_c and design eta_c), and
 *   (b) its curvature constants are chosen from the generic, broadly-cited
 *       textbook range for axial compressor characteristics (Cohen, Rogers
 *       & Saravanamuttoo, "Gas Turbine Theory", ch. 3 discusses this general
 *       shape at length) rather than tuned to reproduce any one dataset.
 *
 * Everything downstream (offDesign.js) is explicit that its quantitative
 * off-design numbers inherit this map's genericness — the qualitative
 * TRENDS (thrust falling off more steeply at low throttle/high altitude
 * than a single-design-point re-solve shows) are the useful, defensible
 * result; the exact numbers are illustrative, not a substitute for a real
 * vendor map.
 *
 * Faithful JS port of aeropropsim/compressor_map.py.
 */

// ---------------------------------------------------------------------------
// Generic map shape constants — NOT IN SOURCE, see module docstring.
// Chosen once, not tuned per-config: they set the map's CURVATURE (how
// sharply PR/efficiency fall away from the design point), while the design
// point itself is always exactly (Nr=1, mr=1) -> (pi_c_design, eta_c_design)
// regardless of these constants, by construction (see mapPoint below).
// ---------------------------------------------------------------------------

/**
 * How steeply (pi_c - 1) scales with corrected speed at the design flow
 * coefficient. Real axial compressors sit roughly in the Nr^2-Nr^3 range
 * (the classic result that pressure rise goes roughly as blade speed
 * squared, §4 Euler-work reasoning, compounded slightly further by how
 * stage efficiency also improves with Mach number near the design speed).
 */
export const PR_SPEED_EXPONENT = 2.5;

/**
 * Curvature of the pressure-ratio "hump" along a speed line, in the
 * relative flow coordinate (mr/Nr - 1). Larger = narrower hump = surge and
 * choke arrive closer to the design flow coefficient. 2.5 gives a usable
 * +/-25%-ish flow range before the bracket term goes non-physical, in
 * line with typical published axial characteristics.
 */
export const PR_FLOW_CURVATURE = 2.5;

/**
 * Efficiency droop curvature vs. speed and vs. flow coefficient
 * respectively — how quickly the efficiency "island" closes up moving
 * away from the design point in each direction. Efficiency degrades more
 * gently than pressure ratio (real maps show broad, shallow efficiency
 * islands compared to the sharper PR humps), hence smaller coefficients.
 */
export const ETA_SPEED_CURVATURE = 0.35;
export const ETA_FLOW_CURVATURE = 0.55;

/**
 * Read the generic compressor map at a given operating point.
 *
 * @param {number} Nr - corrected speed relative to the design point (Nr=1
 *   at design).
 * @param {number} mr - corrected mass flow relative to the design point
 *   (mr=1 at design, for Nr=1). Off the design speed line, the natural
 *   flow coordinate is mr/Nr (see `flowCoefficientBounds` below).
 * @param {number} pi_c_design - the compressor's design-point overall
 *   pressure ratio (from the locked design point, offDesign.DesignPoint).
 * @param {number} eta_c_design - the compressor's design-point (stage or
 *   overall, whichever this map is calibrated against) isentropic
 *   efficiency.
 * @returns {{pi_c:number, eta_c:number, flow_coeff:number, valid:boolean}}
 *   `valid` is true iff this point is inside the map's physically
 *   meaningful envelope (see `flowCoefficientBounds`); an invalid point
 *   still returns numbers (so callers doing a root-find don't crash
 *   mid-bracket) but they should not be trusted as a converged operating
 *   point.
 *
 * At Nr=1, mr=1 this returns EXACTLY (pi_c_design, eta_c_design) — the map
 * is anchored to the actual design point by construction, regardless of
 * the module's generic curvature constants.
 */
export function mapPoint(Nr, mr, pi_c_design, eta_c_design) {
  if (Nr <= 0) {
    throw new Error(`mapPoint: Nr must be > 0 (got ${Nr})`);
  }

  const flow_coeff = mr / Nr; // 1.0 exactly at the design point

  const pr_bracket = 1.0 - PR_FLOW_CURVATURE * (flow_coeff - 1.0) ** 2;
  const pi_c = 1.0 + (pi_c_design - 1.0) * (Nr ** PR_SPEED_EXPONENT) * pr_bracket;

  const eta_bracket_N = 1.0 - ETA_SPEED_CURVATURE * (1.0 - Nr) ** 2;
  const eta_bracket_m = 1.0 - ETA_FLOW_CURVATURE * (flow_coeff - 1.0) ** 2;
  const eta_c = eta_c_design * eta_bracket_N * eta_bracket_m;

  const valid = pr_bracket > 0.0 && eta_bracket_N > 0.0 && eta_bracket_m > 0.0 && pi_c > 1.0;

  return { pi_c, eta_c, flow_coeff, valid };
}

/**
 * The flow-coefficient (mr/Nr) range where the map stays physical (both
 * brackets in `mapPoint` positive), independent of Nr — diagnostic helper
 * for callers building a search bracket for the off-design inner-loop
 * root-find.
 *
 * @returns {{low:number, high:number}} the flow_coeff values at which the
 *   PRESSURE-RATIO bracket (the tighter of the two constraints, since
 *   PR_FLOW_CURVATURE > ETA_FLOW_CURVATURE) first reaches zero.
 */
export function flowCoefficientBounds() {
  const half_width = (1.0 / PR_FLOW_CURVATURE) ** 0.5;
  return { low: 1.0 - half_width, high: 1.0 + half_width };
}
