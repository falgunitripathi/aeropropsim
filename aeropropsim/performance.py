"""
Overall performance — specific thrust, TSFC, efficiencies, Breguet range.

Ref: §9 (Overall Performance).
"""

import math


def specific_thrust(f: float, V_exit: float, V_flight: float, A_exit: float,
                     mdot_a: float, p_exit: float, p_a: float) -> float:
    """T/mdot_a = [(1+f)*V_exit - V_flight] + (Ae/mdot_a)*(p_exit-p_a).
    Ref: §9, p.296, 163."""
    return ((1.0 + f) * V_exit - V_flight) + (A_exit / mdot_a) * (p_exit - p_a)


def tsfc(f: float, specific_thrust_val: float) -> float:
    """TSFC = mdot_f/T = f / (T/mdot_a).  Ref: §9, p.296, 163.

    Units: kg fuel per (N*s), i.e. per unit thrust per unit time.
    """
    if specific_thrust_val <= 0:
        raise ValueError("tsfc: specific_thrust_val must be > 0")
    return f / specific_thrust_val


def static_takeoff_thrust(mdot_a: float, f: float, V_exit: float) -> float:
    """Static/take-off case (V->0, fully expanded): F_TO = mdot_a*(1+f)*V_exit.
    Ref: §9, p.296, 163."""
    return mdot_a * (1.0 + f) * V_exit


def thermal_efficiency(f: float, V_exit: float, V_flight: float,
                        Q_R: float) -> float:
    """eta_th = [(1+f)*V_exit^2/2 - V_flight^2/2] / (f*Q_R).
    Ref: §9, p.141-147."""
    return ((1.0 + f) * V_exit ** 2 / 2.0 - V_flight ** 2 / 2.0) / (f * Q_R)


def propulsive_efficiency(V_flight: float, V_exit: float) -> float:
    """eta_p = 2*(V/Vexit) / (1+(V/Vexit)).  Ref: §9, p.141-147.

    eta_p -> 1 as V -> V_exit, but thrust -> 0 there too — not a usable
    design target on its own.
    """
    ratio = V_flight / V_exit
    return 2.0 * ratio / (1.0 + ratio)


def overall_efficiency_from_components(eta_th: float, eta_p: float) -> float:
    """eta_0 = eta_th * eta_p.  Ref: §9, p.141-147."""
    return eta_th * eta_p


def overall_efficiency_direct(thrust_val: float, V_flight: float,
                               mdot_f: float, Q_R: float) -> float:
    """eta_0 = T*V / (mdot_f*Q_R).  Ref: §9, p.141-147.

    Direct definition — useful as a cross-check against
    overall_efficiency_from_components (both should agree; a persistent
    mismatch flags an upstream bug, exactly the kind of thing the test
    suite's internal-consistency checks are for).
    """
    return thrust_val * V_flight / (mdot_f * Q_R)


def breguet_range(Q_R: float, eta_0: float, g: float, L_over_D: float,
                   m1: float, m2: float) -> float:
    """S = (Q_R*eta_0/g)*(L/D)*ln(m1/m2).  Ref: §9, p.157-163 (bonus)."""
    return (Q_R * eta_0 / g) * L_over_D * math.log(m1 / m2)


def breguet_endurance(tsfc_val: float, L_over_D: float, m1: float,
                       m2: float) -> float:
    """E = (1/TSFC)*(L/D)*ln(m1/m2).  Ref: §9, p.157-163 (bonus)."""
    return (1.0 / tsfc_val) * L_over_D * math.log(m1 / m2)
