"""
Energy-conservation closure checks: after solving for the unknown (f, or
T05), plug back into the RAW conservation law the formula was derived
from and confirm it balances. This is the strongest check available
without an external worked example, because it isn't just "does the code
match the formula I typed in" (a bug could be in the formula) — it goes
back to the physical law (energy in = energy out) that the formula
itself claims to satisfy.
"""

import pytest
from aeropropsim.combustor import fuel_air_ratio, combustor_exit_pressure
from aeropropsim.matching import turbine_temp_ratio, turbine_pressure_ratio
from aeropropsim.constants import CP_C, CP_H


def test_combustor_energy_balance_closes():
    T03, T04, eta_b, Q_R = 480.0, 1400.0, 0.97, 43.0e6
    f = fuel_air_ratio(T03, T04, eta_b, Q_R)

    # Raw conservation law (§5): (mdot_a+mdot_f)*Cph*T04 = mdot_a*Cpc*T03 + eta_b*mdot_f*Q_R
    # Per unit mdot_a, with f = mdot_f/mdot_a:
    lhs = (1.0 + f) * CP_H * T04
    rhs = CP_C * T03 + eta_b * f * Q_R
    assert lhs == pytest.approx(rhs, rel=1e-9)


def test_combustor_f_is_small_and_positive_for_realistic_inputs():
    f = fuel_air_ratio(T03=480.0, T04=1400.0, eta_b=0.97, Q_R=43.0e6)
    assert 0.0 < f < 0.05  # realistic turbojet f is a few percent


def test_combustor_pressure_loss():
    p04 = combustor_exit_pressure(p03=800000.0, delta_p_cc_pct=0.05)
    assert p04 == pytest.approx(760000.0)


def test_shaft_energy_balance_closes():
    T02, T03, T04 = 288.0, 480.0, 1400.0
    lam, eta_m, f = 0.80, 0.98, 0.02
    T05_over_T04 = turbine_temp_ratio(T02, T03, T04, lam, eta_m, f)
    T05 = T05_over_T04 * T04

    # Raw conservation law (§7, form A): Cpc*(T03-T02) = lambda*eta_m*(1+f)*Cph*(T04-T05)
    lhs = CP_C * (T03 - T02)
    rhs = lam * eta_m * (1.0 + f) * CP_H * (T04 - T05)
    assert lhs == pytest.approx(rhs, rel=1e-9)


def test_shaft_pressure_ratio_less_than_one():
    T05_over_T04 = 0.75
    pr = turbine_pressure_ratio(T05_over_T04, eta_t=0.90)
    assert 0.0 < pr < 1.0


def test_shaft_pressure_ratio_matches_isentropic_efficiency_definition():
    """Rearranged self-check: given a chosen eta_t and T05/T04, the
    pressure ratio this function returns must, when run BACKWARD through
    the ideal isentropic relation, reproduce the same eta_t."""
    from aeropropsim.constants import GAMMA_H
    T05_over_T04 = 0.72
    eta_t = 0.88
    pr = turbine_pressure_ratio(T05_over_T04, eta_t, GAMMA_H)
    T05s_over_T04 = pr ** ((GAMMA_H - 1.0) / GAMMA_H)
    eta_t_recovered = (1.0 - T05_over_T04) / (1.0 - T05s_over_T04)
    assert eta_t_recovered == pytest.approx(eta_t, rel=1e-9)
