"""
Turbine — Euler work equation, axial stage-stacking, radial-inflow turbine.

Ref: §6 (Turbine).

The stage-stacking design-decision note in compressor.py applies
symmetrically here: each stage's own pressure (expansion) ratio uses that
stage's own INLET stagnation temperature in the denominator, for the same
reasons given there.
"""

import math
from typing import List, Dict

from .constants import GAMMA_H


# ---------------------------------------------------------------------------
# §6.1 General — axial turbine stage work & expansion ratio
# ---------------------------------------------------------------------------

def stage_work(U: float, Vtheta2: float, Vtheta3: float) -> float:
    """W_T = U*(Vtheta2 + Vtheta3).  Ref: §6.1, p.590-592."""
    return U * (Vtheta2 + Vtheta3)


def stage_pressure_ratio_from_dT0(dT0s: float, T01: float, eta_tt: float,
                                   gamma_h: float = GAMMA_H) -> float:
    """p_out/p_in (< 1, an expansion) for a given stagnation-temperature
    drop dT0s across the stage.  Ref: §6.1, p.590-591.

        dT0s = eta_tt*T01*[1 - (p_out/p_in)^((gamma_h-1)/gamma_h)]
        => p_out/p_in = [1 - dT0s/(eta_tt*T01)]^(gamma_h/(gamma_h-1))

    Returns the ratio p_out/p_in directly (<=1). Callers wanting the
    "expansion ratio" as conventionally quoted (>=1, e.g. "2.5:1") should
    take 1/return-value.
    """
    bracket = 1.0 - dT0s / (eta_tt * T01)
    if bracket <= 0:
        raise ValueError(
            f"stage_pressure_ratio_from_dT0: non-physical (bracket={bracket:.4f} <= 0) "
            f"— dT0s={dT0s:.1f} K is too large for T01={T01:.1f} K at eta_tt={eta_tt}."
        )
    return bracket ** (gamma_h / (gamma_h - 1.0))


def dT0_from_stage_pressure_ratio(pr_out_over_in: float, T01: float, eta_tt: float,
                                   gamma_h: float = GAMMA_H) -> float:
    """Inverse of stage_pressure_ratio_from_dT0: back-solve dT0s from a
    required p_out/p_in ratio (<=1).  Ref: §6.1, p.590-591 (rearranged).
    """
    bracket = pr_out_over_in ** ((gamma_h - 1.0) / gamma_h)
    return eta_tt * T01 * (1.0 - bracket)


def loading_flow_reaction_coefficients(U: float, dT0s: float, Vz: float,
                                        beta2: float, beta3: float,
                                        cp_h: float = None) -> Dict[str, float]:
    """psi (stage loading), phi (flow coefficient), Lambda (degree of
    reaction) for an axial turbine stage.  Ref: §6.1, p.592-594.

        psi = 2*Cph*dT0s/U^2 = 2*phi*(tan(beta2)+tan(beta3))
        phi = Vz/U
        Lambda = (phi/2)*(tan(beta3) - tan(beta2))

    beta2, beta3 in radians. At Lambda=0.5 (standard design): beta3=alpha2,
    beta2=alpha3.
    """
    from .constants import CP_H
    if cp_h is None:
        cp_h = CP_H
    psi = 2.0 * cp_h * dT0s / U ** 2
    phi = Vz / U
    Lambda = (phi / 2.0) * (math.tan(beta3) - math.tan(beta2))
    return {"psi": psi, "phi": phi, "Lambda": Lambda}


# ---------------------------------------------------------------------------
# §6.1 Axial turbine — multi-stage stacking procedure
# ---------------------------------------------------------------------------

def stack_axial_turbine(pr_overall_out_over_in: float, n_stages: int,
                         T01_in: float, eta_tt: float,
                         gamma_h: float = GAMMA_H) -> Dict:
    """Stage-stack an axial turbine across a target overall expansion.

    Ref: §6.1 "Stage-stacking procedure" — mirrors §4.2's compressor
    method in the temperature-DROP direction.

    Args:
        pr_overall_out_over_in: target overall p_out/p_in (<1) across all
            turbine stages, i.e. p05/p04 from the shaft power balance (§7)
            — NOT a free choice, see matching.py.
        n_stages: number of turbine stages (>= 1).
        T01_in: turbine inlet stagnation temperature (T04 = TIT), K.
        eta_tt: assumed constant per-stage total-to-total efficiency.
        gamma_h: hot-section ratio of specific heats.

    Returns:
        dict with "stages" (per-stage T01_in/T01_out/dT0/pr_stage,
        p_rel tracking p_in_rel/p_out_rel relative to turbine inlet=1.0),
        "T01_out" (turbine exit stagnation temperature), and "pr_actual"
        (product of all per-stage p_out/p_in ratios — should equal
        pr_overall_out_over_in to floating-point tolerance).
    """
    if n_stages < 1:
        raise ValueError("n_stages must be >= 1")
    if not (0.0 < pr_overall_out_over_in < 1.0):
        raise ValueError("pr_overall_out_over_in must be in (0,1) (a turbine expands)")

    dT_turbine_total = T01_in * eta_tt * (
        1.0 - pr_overall_out_over_in ** ((gamma_h - 1.0) / gamma_h)
    )
    # ^ This is simply stage_pressure_ratio_from_dT0 inverted at n_stages=1
    #   scale, i.e. dT0_from_stage_pressure_ratio applied to the OVERALL
    #   ratio; kept inline here since it's the "size the total drop" step
    #   (mirrors compressor step 1), before splitting across stages.
    dT0_stage_nominal = dT_turbine_total / n_stages

    stages: List[Dict] = []
    T01_running = T01_in
    p_rel_running = 1.0
    pr_product = 1.0

    if n_stages == 1:
        pr_last = pr_overall_out_over_in
        dT0_last = dT0_from_stage_pressure_ratio(pr_last, T01_running, eta_tt, gamma_h)
        stages.append({
            "T01_in": T01_running, "T01_out": T01_running - dT0_last,
            "dT0": dT0_last, "pr_stage": pr_last,
            "p_in_rel": p_rel_running, "p_out_rel": p_rel_running * pr_last,
        })
        pr_product = pr_last
        T01_running -= dT0_last
        p_rel_running *= pr_last
    else:
        for i in range(1, n_stages):
            pr_i = stage_pressure_ratio_from_dT0(dT0_stage_nominal, T01_running,
                                                  eta_tt, gamma_h)
            stages.append({
                "T01_in": T01_running, "T01_out": T01_running - dT0_stage_nominal,
                "dT0": dT0_stage_nominal, "pr_stage": pr_i,
                "p_in_rel": p_rel_running, "p_out_rel": p_rel_running * pr_i,
            })
            pr_product *= pr_i
            T01_running -= dT0_stage_nominal
            p_rel_running *= pr_i

        pr_last = pr_overall_out_over_in / pr_product
        dT0_last = dT0_from_stage_pressure_ratio(pr_last, T01_running, eta_tt, gamma_h)
        stages.append({
            "T01_in": T01_running, "T01_out": T01_running - dT0_last,
            "dT0": dT0_last, "pr_stage": pr_last,
            "p_in_rel": p_rel_running, "p_out_rel": p_rel_running * pr_last,
        })
        pr_product *= pr_last
        T01_running -= dT0_last
        p_rel_running *= pr_last

    return {
        "stages": stages,
        "T01_out": T01_running,
        "pr_actual": pr_product,
        "dT_turbine_total": dT_turbine_total,
    }


# ---------------------------------------------------------------------------
# §6.2 Radial-inflow turbine
# ---------------------------------------------------------------------------

def radial_turbine_work(U2: float) -> float:
    """W = U2^2, for the standard 90-degree IFR case (beta2=0 radial
    inlet, Vtheta3=0 zero exit swirl).  Ref: §6.2, p.628-630."""
    return U2 ** 2


def spouting_velocity(cp_h: float, T01: float, T03ss: float) -> float:
    """V0 = sqrt(2*Cph*(T01-T03ss)).  Ref: §6.2, p.629-630.

    T03ss is the ideal (isentropic-to-ambient-exit-pressure) static exit
    temperature.
    """
    return math.sqrt(2.0 * cp_h * (T01 - T03ss))


def radial_turbine_size_U2(V0: float, ratio: float = 0.707) -> float:
    """U2 = ratio * V0, with the source's recommended U2/V0 ~ 0.707.
    Ref: §6.2, p.629-630."""
    return ratio * V0


def radial_turbine_eta_tt(T01: float, T03: float, T03s: float) -> float:
    """eta_tt = (T01-T03)/(T01-T03s).  Ref: §6.2, p.629-630."""
    return (T01 - T03) / (T01 - T03s)
