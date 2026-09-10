"""
Generic compressor characteristic — a smooth, analytic non-dimensional
compressor map used ONLY for off-design matching (see off_design.py).

NOT IN SOURCE. This is the one place this project departs from its
otherwise strict "everything traces to the reference PDF" discipline, and
it does so because the reference itself says so explicitly: its own text
calls off-design/component-map matching out of v1 scope precisely because
it never supplies actual compressor or turbine performance-map data (see
README "Known limitations"). There is no way to model off-design behavior
of a FIXED piece of hardware without a compressor map from somewhere; a
real one isn't in this project's source material, so this module builds a
generic, physically-shaped one instead of silently pretending it comes
from the book.

This is not a digitization of any specific real compressor's published
map. It is a minimal analytic surrogate with the qualitative shape every
real axial-compressor map shares — pressure ratio and efficiency both
peak at the design corrected speed and design corrected flow, and both
fall away smoothly toward surge (too little flow for the speed) and choke
(too much) — built so that:
  (a) it passes through the actual design point exactly, by construction
      (Nr=1, mr=1 always gives back the design pi_c and design eta_c), and
  (b) its curvature constants are chosen from the generic, broadly-cited
      textbook range for axial compressor characteristics (Cohen, Rogers
      & Saravanamuttoo, "Gas Turbine Theory", ch. 3 discusses this general
      shape at length) rather than tuned to reproduce any one dataset.

Everything downstream (off_design.py) is explicit that its quantitative
off-design numbers inherit this map's genericness — the qualitative
TRENDS (thrust falling off more steeply at low throttle/high altitude
than the current single-design-point Mission Analysis shows) are the
useful, defensible result; the exact numbers are illustrative, not a
substitute for a real vendor map.
"""

from typing import Dict


# ---------------------------------------------------------------------------
# Generic map shape constants — NOT IN SOURCE, see module docstring.
# Chosen once, not tuned per-config: they set the map's CURVATURE (how
# sharply PR/efficiency fall away from the design point), while the design
# point itself is always exactly (Nr=1, mr=1) -> (pi_c_design, eta_c_design)
# regardless of these constants, by construction (see map_point below).
# ---------------------------------------------------------------------------

# How steeply (pi_c - 1) scales with corrected speed at the design flow
# coefficient. Real axial compressors sit roughly in the Nr^2-Nr^3 range
# (the classic result that pressure rise goes roughly as blade speed
# squared, §4 Euler-work reasoning, compounded slightly further by how
# stage efficiency also improves with Mach number near the design speed).
PR_SPEED_EXPONENT = 2.5

# Curvature of the pressure-ratio "hump" along a speed line, in the
# relative flow coordinate (mr/Nr - 1). Larger = narrower hump = surge and
# choke arrive closer to the design flow coefficient. 2.5 gives a usable
# +/-25%-ish flow range before the bracket term goes non-physical, in
# line with typical published axial characteristics.
PR_FLOW_CURVATURE = 2.5

# Efficiency droop curvature vs. speed and vs. flow coefficient
# respectively — how quickly the efficiency "island" closes up moving
# away from the design point in each direction. Efficiency degrades more
# gently than pressure ratio (real maps show broad, shallow efficiency
# islands compared to the sharper PR humps), hence smaller coefficients.
ETA_SPEED_CURVATURE = 0.35
ETA_FLOW_CURVATURE = 0.55


def map_point(Nr: float, mr: float, pi_c_design: float,
              eta_c_design: float) -> Dict[str, float]:
    """Read the generic compressor map at a given operating point.

    Args:
        Nr: corrected speed relative to the design point (Nr=1 at design).
        mr: corrected mass flow relative to the design point (mr=1 at
            design, for Nr=1). Off the design speed line, the natural
            flow coordinate is mr/Nr (see `flow_coefficient_ok` below).
        pi_c_design: the compressor's design-point overall pressure
            ratio (from the locked design point, off_design.DesignPoint).
        eta_c_design: the compressor's design-point (stage or overall,
            whichever this map is calibrated against) isentropic
            efficiency.

    Returns:
        dict with:
          "pi_c": pressure ratio at this (Nr, mr).
          "eta_c": isentropic efficiency at this (Nr, mr).
          "flow_coeff": mr/Nr, the relative flow coordinate used
              internally — returned for diagnostics/plotting.
          "valid": True iff this point is inside the map's physically
              meaningful envelope (see `flow_coefficient_ok`); an invalid
              point still returns numbers (so callers doing a root-find
              don't crash mid-bracket) but they should not be trusted as
              a converged operating point.

    At Nr=1, mr=1 this returns EXACTLY (pi_c_design, eta_c_design) — the
    map is anchored to the actual design point by construction, regardless
    of the module's generic curvature constants.
    """
    if Nr <= 0:
        raise ValueError(f"map_point: Nr must be > 0 (got {Nr})")

    flow_coeff = mr / Nr  # 1.0 exactly at the design point

    pr_bracket = 1.0 - PR_FLOW_CURVATURE * (flow_coeff - 1.0) ** 2
    pi_c = 1.0 + (pi_c_design - 1.0) * (Nr ** PR_SPEED_EXPONENT) * pr_bracket

    eta_bracket_N = 1.0 - ETA_SPEED_CURVATURE * (1.0 - Nr) ** 2
    eta_bracket_m = 1.0 - ETA_FLOW_CURVATURE * (flow_coeff - 1.0) ** 2
    eta_c = eta_c_design * eta_bracket_N * eta_bracket_m

    valid = pr_bracket > 0.0 and eta_bracket_N > 0.0 and eta_bracket_m > 0.0 and pi_c > 1.0

    return {"pi_c": pi_c, "eta_c": eta_c, "flow_coeff": flow_coeff, "valid": valid}


def flow_coefficient_bounds() -> Dict[str, float]:
    """The flow-coefficient (mr/Nr) range where the map stays physical
    (both brackets in `map_point` positive), independent of Nr —
    diagnostic helper for callers building a search bracket for the
    off-design inner-loop root-find.

    Returns dict with "low" (surge side) and "high" (choke side), the
    flow_coeff values at which the PRESSURE-RATIO bracket (the tighter of
    the two constraints, since PR_FLOW_CURVATURE > ETA_FLOW_CURVATURE)
    first reaches zero.
    """
    half_width = (1.0 / PR_FLOW_CURVATURE) ** 0.5
    return {"low": 1.0 - half_width, "high": 1.0 + half_width}
