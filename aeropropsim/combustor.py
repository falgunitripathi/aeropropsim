"""
Combustor — energy balance for fuel-air ratio, pressure loss.

Ref: §5 (Combustor).
"""

from .constants import CP_C, CP_H


def fuel_air_ratio(T03: float, T04: float, eta_b: float, Q_R: float,
                    cp_c: float = CP_C, cp_h: float = CP_H) -> float:
    """Solve the combustor energy balance for fuel-air ratio f.

    Ref: §5, p.288, 300. Rearranged form of
        (mdot_a + mdot_f)*Cph*T04 = mdot_a*Cpc*T03 + eta_b*mdot_f*Q_R

        f = [(Cph/Cpc)(T04/T03) - 1] / [(eta_b*Q_R)/(Cpc*T03) - (Cph/Cpc)(T04/T03)]

    Args:
        T03: combustor inlet (compressor exit) stagnation temperature, K.
        T04: combustor exit stagnation temperature = TIT, the fixed
            design target, K.
        eta_b: combustor efficiency (typical ~0.97, §10).
        Q_R: fuel heating value, J/kg. NOT given a source-derived number
            for kerosene in the extracted reference (see constants.py
            DEFAULTS["Q_R"] docstring) — pass explicitly for anything
            beyond a first sanity check.
        cp_c, cp_h: cold/hot section specific heats.

    Returns:
        f: fuel-air ratio (dimensionless, mdot_f/mdot_a).
    """
    ratio_cp = cp_h / cp_c
    temp_ratio = T04 / T03
    numerator = ratio_cp * temp_ratio - 1.0
    denominator = (eta_b * Q_R) / (cp_c * T03) - ratio_cp * temp_ratio
    if denominator <= 0:
        raise ValueError(
            "fuel_air_ratio: non-physical result (denominator <= 0) — "
            "check that Q_R is large enough relative to T04/T03 for this "
            "eta_b; typically this means TIT (T04) has been set too high "
            "for the given inlet temperature and fuel heating value."
        )
    return numerator / denominator


def combustor_exit_pressure(p03: float, delta_p_cc_pct: float) -> float:
    """p04 = p03*(1 - delta_p_cc_pct).  Ref: §5, p.288, 399.

    delta_p_cc_pct is a fraction (e.g. 0.05 for a 5% loss), not a percent.
    """
    return p03 * (1.0 - delta_p_cc_pct)


def equivalence_ratio(f: float, f_stoich: float) -> float:
    """phi_eq = f/f_stoich.  Ref: §5, p.288, 399.

    Design rule (source): overall phi_eq should stay below 1 (lean
    overall) to protect the liner and turbine.
    """
    return f / f_stoich
