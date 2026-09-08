"""
Compressor-turbine shaft power balance — the single physical constraint
that turns two independent component models into one working engine.

Ref: §7 (Compressor-Turbine Matching).

Design-decision note
---------------------
The reference gives TWO forms for the shaft balance:

  (A) the basic energy balance (its first equation):
        Cpc*(T03-T02) = lambda*eta_m*(1+f)*Cph*(T04-T05)

  (B) a rearranged closed form solving directly for T05/T04 (its second
      equation), which additionally carries eta_c and eta_t inside the
      denominator:
        T05/T04 = 1 - [(Cpc/Cph)*T02 / (lambda*(1+f)*eta_m*eta_c*eta_t*T04)]
                      * [T03/T02 - 1]

  Algebraically inverting (A) for T05/T04 gives
        T05/T04 = 1 - [Cpc*(T03-T02)] / [lambda*eta_m*(1+f)*Cph*T04]
  which does NOT reduce to (B) — (B) carries extra eta_c*eta_t factors in
  the denominator that (A) does not produce under a direct rearrangement.
  This could mean (B) additionally re-expresses T03-T02 in terms of the
  compressor's IDEAL (isentropic) temperature rise via eta_c (and folds an
  analogous turbine-side redefinition via eta_t) rather than the actual
  rise — but that reading cannot be confirmed from the extracted
  transcript alone.

  Rather than wire an algebraic relationship into the solver that this
  package cannot independently re-derive and confirm, `turbine_temp_ratio`
  below implements ONLY the unambiguous, first-principles form (A) — pure
  energy conservation, nothing else. Form (B) is kept here purely as
  documentation/citation, in `turbine_temp_ratio_source_closed_form`,
  clearly marked as NOT used by the solver and worth checking against the
  original book (Saravanamuttoo/Mattingly) before ever wiring it in.
"""

from .constants import GAMMA_H, CP_C, CP_H


def turbine_temp_ratio(T02: float, T03: float, T04: float, lam: float,
                        eta_m: float, f: float,
                        cp_c: float = CP_C, cp_h: float = CP_H) -> float:
    """T05/T04 from the basic shaft energy balance (form A, see module
    docstring).  Ref: §7, p.289-291.

        Cpc*(T03-T02) = lambda*eta_m*(1+f)*Cph*(T04-T05)
        => T05/T04 = 1 - Cpc*(T03-T02) / (lambda*eta_m*(1+f)*Cph*T04)

    Args:
        T02: compressor inlet stagnation temperature, K.
        T03: compressor exit stagnation temperature, K.
        T04: turbine inlet stagnation temperature (TIT), K.
        lam: lambda, fraction of turbine power driving the compressor
            (typical 0.75-0.85, §10).
        eta_m: mechanical (shaft) efficiency (typical ~0.98, §10).
        f: fuel-air ratio.
        cp_c, cp_h: cold/hot section specific heats.

    Returns:
        T05/T04 (turbine stagnation-temperature ratio across the turbine).
    """
    compressor_work_specific = cp_c * (T03 - T02)
    turbine_capacity = lam * eta_m * (1.0 + f) * cp_h * T04
    return 1.0 - compressor_work_specific / turbine_capacity


def turbine_temp_ratio_source_closed_form(T02: float, T03: float, T04: float,
                                           lam: float, eta_m: float, f: float,
                                           eta_c: float, eta_t: float,
                                           cp_c: float = CP_C,
                                           cp_h: float = CP_H) -> float:
    """The reference's second (compound) closed form for T05/T04 — Ref:
    §7, p.289-291. NOT used by the solver; kept for citation/comparison
    only. See module docstring's "Design-decision note" before using this.
    """
    ratio_cp = cp_c / cp_h
    bracket = (T03 / T02) - 1.0
    return 1.0 - (ratio_cp * T02) / (lam * (1.0 + f) * eta_m * eta_c * eta_t * T04) * bracket


def turbine_pressure_ratio(T05_over_T04: float, eta_t: float,
                            gamma_h: float = GAMMA_H) -> float:
    """p05/p04 from the turbine's isentropic efficiency definition.
    Ref: §7, p.289-291.

        eta_t = (T04-T05)/(T04-T05s)
        => T05s/T04 = 1 - (1/eta_t)*(1-T05/T04)
        => p05/p04 = (T05s/T04)^(gamma_h/(gamma_h-1))
    """
    T05s_over_T04 = 1.0 - (1.0 / eta_t) * (1.0 - T05_over_T04)
    if T05s_over_T04 <= 0:
        raise ValueError(
            f"turbine_pressure_ratio: non-physical (T05s/T04={T05s_over_T04:.4f} <= 0) "
            f"— check eta_t and T05/T04 inputs."
        )
    return T05s_over_T04 ** (gamma_h / (gamma_h - 1.0))


def mass_flow_turbine(mdot_c: float, f: float, b: float = 0.0) -> float:
    """mdot_t = mdot_c*(1+f-b).  Ref: §7, p.635. b = bleed-air ratio
    (0 if unmodelled)."""
    return mdot_c * (1.0 + f - b)
