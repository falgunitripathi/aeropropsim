"""
Intake — adiabatic, non-isentropic deceleration from freestream to the
compressor face.

Ref: §3 (Intake).

Two different conventions for "intake/diffuser efficiency"
------------------------------------------------------------
Cross-checking this project's reference against an independent external
source (Ganesan, "Gas Turbines" 3/e — see Worked Example 7.5, pp.258-261)
surfaced that intake pressure recovery is modelled two genuinely
different ways across the gas-turbine literature, both legitimate, NOT
one right and one wrong:

  (A) `intake_exit_state` (this project's primary reference, §3): scales
      the Mach-number term INSIDE the isentropic exponent —
        p02 = pa*(1 + eta_d*(gamma-1)/2*M^2)^(gamma/(gamma-1))

  (B) `intake_exit_pressure_ram_efficiency` (Ganesan's convention, his
      Eq. 7.18/7.24): defines eta_ram as a linear interpolation of the
      ACTUAL pressure rise between ambient and the fully-isentropic ram
      rise —
        p01 = pa + eta_ram*(p01_isentropic - pa)

  These do NOT reduce to each other algebraically for eta < 1 (verified
  numerically: at Ta=248 K, pa=0.458 bar, M corresponding to 223.6 m/s,
  eta=0.95, they diverge at the ~1-2% level). Reproducing Ganesan's own
  Example 7.5 numbers requires his own formula (B) — see
  tests/test_validation_ganesan_example_7_5.py. `engine.solve_engine`
  still defaults to (A) (this project's primary source), since v1's
  design-value defaults and every other cross-checked component formula
  are sourced from that reference; (B) is provided so Ganesan's own
  worked examples can be reproduced exactly for validation, and as an
  alternative a future UI could expose.
"""

from .constants import GAMMA_C
from .atmosphere import freestream_stagnation


def intake_exit_state(T_a: float, p_a: float, M: float, eta_d: float,
                       gamma_c: float = GAMMA_C) -> dict:
    """Compressor-face (station 2) stagnation state.

    Ref: §3, p.288, 382. Temperature is unaffected by intake losses
    (adiabatic: T02 = T0a); pressure recovery is captured entirely
    through eta_d.

    Typical value: eta_d ~ 0.70-0.90 (§10). Assumption: freestream-to-lip
    flow isentropic; all real loss lumped between the lip and the
    compressor face.

    Returns a dict with T02, p02, T0a, p0a, r_d (= p02/p0a, total-pressure
    recovery factor).
    """
    T0a, p0a = freestream_stagnation(T_a, p_a, M, gamma_c)
    factor = 1.0 + eta_d * (gamma_c - 1.0) / 2.0 * M ** 2
    p02 = p_a * factor ** (gamma_c / (gamma_c - 1.0))
    T02 = T0a
    r_d = p02 / p0a
    return {"T02": T02, "p02": p02, "T0a": T0a, "p0a": p0a, "r_d": r_d}


def intake_exit_pressure_ram_efficiency(T_a: float, p_a: float, V_flight: float,
                                         eta_ram: float,
                                         gamma_c: float = GAMMA_C,
                                         cp_c: float = None) -> dict:
    """Compressor-face stagnation pressure via Ganesan's ram-efficiency
    convention (his Eq. 7.18/7.24) — see this module's docstring for how
    it differs from `intake_exit_state`.

    Ref: Ganesan, "Gas Turbines" 3/e, Eq. 7.18: eta_ram = (p01-pa)/(p01'-pa),
    rearranged (Eq. 7.24) to:

        p01' = pa*(1 + V^2/(2*Cp*Ta))^(gamma/(gamma-1))   [isentropic ram]
        p01  = pa + eta_ram*(p01' - pa)                    [actual]

    Args:
        T_a, p_a: ambient static temperature/pressure.
        V_flight: flight (forward) speed, m/s (Ganesan's c_i).
        eta_ram: ram/diffuser efficiency (his convention, NOT eta_d from
            `intake_exit_state` — the two are not interchangeable numbers).
        cp_c: defaults to constants.CP_C if not given.

    Returns dict with T02 (= T_a + V^2/(2*Cp), his T01), p02 (his p01),
    and p0_isentropic (his p01', for reference).
    """
    from .constants import CP_C
    if cp_c is None:
        cp_c = CP_C
    T02 = T_a + V_flight ** 2 / (2.0 * cp_c)
    p0_isentropic = p_a * (T02 / T_a) ** (gamma_c / (gamma_c - 1.0))
    p02 = p_a + eta_ram * (p0_isentropic - p_a)
    return {"T02": T02, "p02": p02, "p0_isentropic": p0_isentropic}
