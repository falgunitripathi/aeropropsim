import pytest
from aeropropsim.nozzle import (
    critical_pressure, is_choked, choked_exit_temperature,
    choked_exit_temperature_ganesan_convention,
    choked_exit_velocity, unchoked_exit_velocity,
)
from aeropropsim.constants import GAMMA_H, R_H, CP_H
from aeropropsim.gasstate import mach_number, speed_of_sound


def test_choked_exit_is_exactly_sonic():
    """A choked nozzle exit must sit at exactly M=1 by definition —
    check the choked_exit_temperature/velocity pair reproduces M=1. This
    holds regardless of eta_N: see choked_exit_temperature's docstring
    for why this project deliberately keeps that formula eta_N-
    independent (adiabatic T0-conservation + the definition of M=1 don't
    depend on friction/entropy)."""
    T0_in = 1300.0
    T_exit = choked_exit_temperature(T0_in, GAMMA_H)
    V_exit = choked_exit_velocity(T_exit, GAMMA_H, R_H)
    a_exit = speed_of_sound(GAMMA_H, R_H, T_exit)
    M_exit = mach_number(V_exit, a_exit)
    assert M_exit == pytest.approx(1.0, rel=1e-9)


def test_ganesan_convention_reduces_to_default_at_eta_N_1():
    T0_in = 1300.0
    assert choked_exit_temperature_ganesan_convention(T0_in, 1.0, GAMMA_H) == pytest.approx(
        choked_exit_temperature(T0_in, GAMMA_H)
    )


def test_ganesan_convention_matches_his_own_worked_example_7_5():
    """Ref: Ganesan, Gas Turbines 3/e, Example 7.5 (p.260): T04=961.75 K,
    eta_N=0.95, gamma_g=1.33 -> his own Tc=818.35 K. This project's
    DEFAULT choked_exit_temperature gives a different number (825.14 K)
    for the same inputs — see that function's docstring for why the
    default deliberately does not match this book-specific convention."""
    T_exit = choked_exit_temperature_ganesan_convention(961.75, 0.95, 1.33)
    assert T_exit == pytest.approx(818.35, abs=0.05)
    default = choked_exit_temperature(961.75, 1.33)
    assert default == pytest.approx(825.14, abs=0.5)
    assert default != pytest.approx(T_exit, abs=0.5)  # documents the two conventions differ


def test_choking_decision_is_consistent_with_ambient_comparison():
    p0_in = 400000.0
    eta_N = 0.95
    p_c = critical_pressure(p0_in, eta_N, GAMMA_H)
    # High ambient (low altitude, low PR available) -> unchoked
    assert is_choked(p_c, p_a=380000.0) is False
    # Low ambient (design PR well above critical) -> choked
    assert is_choked(p_c, p_a=100000.0) is True


def test_unchoked_velocity_zero_at_pa_equals_p0():
    V = unchoked_exit_velocity(T0_in=1300.0, p_a=300000.0, p0_in=300000.0,
                                eta_N=0.95, gamma_h=GAMMA_H, cp_h=CP_H)
    assert V == pytest.approx(0.0, abs=1e-6)


def test_unchoked_velocity_positive_when_expanding():
    V = unchoked_exit_velocity(T0_in=1300.0, p_a=101325.0, p0_in=300000.0,
                                eta_N=0.95, gamma_h=GAMMA_H, cp_h=CP_H)
    assert V > 0


def test_unchoked_velocity_rejects_backward_pressure_ratio():
    with pytest.raises(ValueError):
        unchoked_exit_velocity(T0_in=1300.0, p_a=400000.0, p0_in=300000.0,
                                eta_N=0.95, gamma_h=GAMMA_H, cp_h=CP_H)
