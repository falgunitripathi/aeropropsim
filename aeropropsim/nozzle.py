"""
Nozzle — choking check, exit velocity, thrust, and convergent vs.
convergent-divergent geometry.

Ref: §8 (Nozzle).
"""

import math
from .constants import GAMMA_H, CP_H, R_H
from .gasstate import area_mach_ratio


def critical_pressure(p0_in: float, eta_N: float,
                       gamma_h: float = GAMMA_H) -> float:
    """Critical (choking) static pressure p_c at the nozzle throat.

    Ref: §8, p.292-293, 403.

        p0,in/p_c = 1 / [1 - (1/eta_N)*((gamma_h-1)/(gamma_h+1))]^(gamma_h/(gamma_h-1))
        => p_c = p0,in * [1 - (1/eta_N)*((gamma_h-1)/(gamma_h+1))]^(gamma_h/(gamma_h-1))
    """
    bracket = 1.0 - (1.0 / eta_N) * ((gamma_h - 1.0) / (gamma_h + 1.0))
    return p0_in * bracket ** (gamma_h / (gamma_h - 1.0))


def is_choked(p_c: float, p_a: float) -> bool:
    """Choking comparison: choked iff p_c >= p_a.  Ref: §8, p.292-293."""
    return p_c >= p_a


def choked_exit_temperature(T0_in: float, gamma_h: float = GAMMA_H) -> float:
    """T_exit for a choked (M=1) nozzle: T0,in/T_exit = (gamma_h+1)/2.
    Ref: §8, p.292-293, 302.

    Deliberately independent of eta_N — this is NOT an oversight, see the
    "Choked exit temperature: eta_N or not?" note below, added after
    cross-checking against Ganesan, "Gas Turbines" 3/e, Worked Example 7.5
    (pp.258-261).

    For an ADIABATIC nozzle (no heat transfer, no shaft work), the steady-
    flow energy equation conserves stagnation enthalpy h0 = Cp*T0 exactly,
    with or without friction — friction increases entropy but does not
    remove energy from the flow. So T0 at the throat equals T0_in exactly,
    regardless of nozzle losses; and at M=1, T/T0 = 2/(gamma+1) follows
    purely from the definition of Mach number, again independent of
    entropy generation. Both steps hold with or without friction, so this
    formula should NOT depend on eta_N — unlike `critical_pressure` (where
    eta_N legitimately shifts what pressure is needed to reach that fixed
    temperature) and `unchoked_exit_velocity` (where eta_N legitimately
    reduces the fraction of the ideal enthalpy drop that becomes kinetic
    energy).

    Choked exit temperature: eta_N or not?
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Ganesan's own Example 7.5 instead computes Tc as
    T04*(p_c/p04)^((gamma-1)/gamma) using the eta_N-ADJUSTED p_c from
    `critical_pressure` — i.e. he runs the ISENTROPIC pressure-temperature
    relation using a friction-adjusted pressure. Worked by hand while
    validating this module: that formula reduces to T0_in*2/(gamma+1)
    (this function, exactly) only at eta_N=1; for eta_N<1 it gives a
    DIFFERENT, LOWER temperature (818.35 K vs. this function's 825.14 K
    for his own numbers) that is not obviously consistent with strict
    adiabatic T0-conservation at M=1. This looks like a common textbook
    engineering shortcut (treat the loss as an "equivalent isentropic"
    expansion to a corrected pressure) rather than a more fundamental
    result — so this project's default keeps the T0-conservation-derived
    form here, and reproduces Ganesan's own convention separately, only
    for validating against his published numbers, via
    `choked_exit_temperature_ganesan_convention` below. See
    tests/test_validation_ganesan_example_7_5.py for both numbers side by
    side.
    """
    return T0_in / ((gamma_h + 1.0) / 2.0)


def choked_exit_temperature_ganesan_convention(T0_in: float, eta_N: float,
                                                gamma_h: float = GAMMA_H) -> float:
    """Ganesan's own choked-exit-temperature convention (his Worked
    Example 7.5, p.260) — NOT this project's default, see
    `choked_exit_temperature`'s docstring for why. Provided only to
    reproduce his published numbers for external validation.

        T_exit = T0_in * [1 - (1/eta_N)*((gamma_h-1)/(gamma_h+1))]

    (algebraically, `critical_pressure`'s own bracket term to the power 1
    instead of gamma_h/(gamma_h-1) — reduces exactly to
    `choked_exit_temperature` at eta_N=1).
    """
    bracket = 1.0 - (1.0 / eta_N) * ((gamma_h - 1.0) / (gamma_h + 1.0))
    return T0_in * bracket


def choked_exit_velocity(T_exit: float, gamma_h: float = GAMMA_H,
                          R_h: float = R_H) -> float:
    """V_exit = sqrt(gamma_h*R_h*T_exit) at M=1.  Ref: §8, p.292-293, 302."""
    return math.sqrt(gamma_h * R_h * T_exit)


def unchoked_exit_velocity(T0_in: float, p_a: float, p0_in: float, eta_N: float,
                            gamma_h: float = GAMMA_H, cp_h: float = CP_H) -> float:
    """V_exit for an unchoked (fully expanded to ambient) nozzle.

    Ref: §8, p.292-293, 302. Uses eta_N (nozzle efficiency) — see the §0
    transcription note (source's raw text used eta_m here, corrected to
    eta_N to match every parallel formula in the chapter).

        V_exit = sqrt(2*Cph*eta_N*T0,in*[1-(p_a/p0,in)^((gamma_h-1)/gamma_h)])
    """
    bracket = 1.0 - (p_a / p0_in) ** ((gamma_h - 1.0) / gamma_h)
    if bracket < 0:
        raise ValueError(
            f"unchoked_exit_velocity: non-physical (bracket={bracket:.4f} < 0) — "
            f"p_a should be <= p0_in for an expanding nozzle."
        )
    return math.sqrt(2.0 * cp_h * eta_N * T0_in * bracket)


def thrust(mdot_a: float, f: float, V_exit: float, V_flight: float,
           p_exit: float, p_a: float, A_exit: float) -> float:
    """T = mdot_a*[(1+f)*V_exit - V_flight] + (p_exit-p_a)*A_exit.

    Ref: §8, p.127-132, 404. The pressure term is nonzero only when
    choked (or, for a C-D nozzle, off-design expansion) — vanishes for an
    unchoked, fully-expanded exhaust (p_exit = p_a there by construction).
    """
    return mdot_a * ((1.0 + f) * V_exit - V_flight) + (p_exit - p_a) * A_exit


# ---------------------------------------------------------------------------
# §8.1 Nozzle geometry — convergent vs. convergent-divergent
# ---------------------------------------------------------------------------

def expansion_area_ratio_for_exit_mach(M_exit: float,
                                        gamma_h: float = GAMMA_H) -> float:
    """epsilon = Ae/A* required to fully expand to a chosen supersonic
    exit Mach number.  Ref: §8.1, p.404-406 (reuses the §2 area-Mach
    relation). Convergent-only nozzles are the M_exit=1, epsilon=1 case
    (this function is for sizing a C-D section, M_exit > 1)."""
    if M_exit <= 1.0:
        raise ValueError("expansion_area_ratio_for_exit_mach requires M_exit > 1 "
                          "(use epsilon=1 for a convergent-only nozzle)")
    return area_mach_ratio(gamma_h, M_exit)


def conical_nozzle_length(D_star: float, Ae_over_Astar: float,
                           half_angle_deg: float) -> float:
    """Axial length L of a conical diverging section.  Ref: §8.1, p.405-406.

        L = D*(sqrt(Ae/A*) - 1) / (2*tan(alpha))

    Args:
        D_star: throat diameter, m.
        Ae_over_Astar: expansion area ratio epsilon.
        half_angle_deg: nozzle half-angle alpha, degrees.
    """
    alpha = math.radians(half_angle_deg)
    return D_star * (math.sqrt(Ae_over_Astar) - 1.0) / (2.0 * math.tan(alpha))


def conical_nozzle_area_ratio(D_star: float, L: float,
                               half_angle_deg: float) -> float:
    """Ae/A* achieved by a conical section of given length L and half-angle.
    Ref: §8.1, p.405-406 (inverse of conical_nozzle_length).

        Ae/A* = ((D* + 2*L*tan(alpha)) / D*)^2
    """
    alpha = math.radians(half_angle_deg)
    return ((D_star + 2.0 * L * math.tan(alpha)) / D_star) ** 2
