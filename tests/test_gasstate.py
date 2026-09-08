"""
Internal-consistency checks for §2 isentropic relations and the §2.1
station-state recipe. These do NOT validate against an external published
example (see README "Validation status") — they check that the machinery
is self-consistent (round-trips, matches the source's own stated check
value, etc).
"""

import math
import pytest

from aeropropsim.gasstate import (
    speed_of_sound, mach_number, T0_over_T, p0_over_p, rho0_over_rho,
    critical_pressure_ratio, area_mach_ratio, Station,
)
from aeropropsim.constants import GAMMA_C, CP_C, R_C


def test_critical_pressure_ratio_matches_source_check_value():
    # Ref §2, p.83: source explicitly states this evaluates to 0.528 for
    # gamma=1.4.
    assert critical_pressure_ratio(1.4) == pytest.approx(0.528, abs=1e-3)


def test_speed_of_sound_sea_level_air():
    # a = sqrt(gamma*R*T) at T=288K, gamma=1.4, R=287.1 -> ~340 m/s
    a = speed_of_sound(GAMMA_C, R_C, 288.0)
    assert a == pytest.approx(340.0, abs=1.0)


def test_stagnation_ratios_reduce_to_unity_at_M0():
    assert T0_over_T(1.4, 0.0) == pytest.approx(1.0)
    assert p0_over_p(1.4, 0.0) == pytest.approx(1.0)
    assert rho0_over_rho(1.4, 0.0) == pytest.approx(1.0)


def test_area_mach_ratio_is_unity_at_M1():
    assert area_mach_ratio(1.4, 1.0) == pytest.approx(1.0, abs=1e-9)


def test_area_mach_ratio_rejects_M_zero():
    with pytest.raises(ValueError):
        area_mach_ratio(1.4, 0.0)


def test_station_zero_velocity_static_equals_stagnation():
    s = Station("test", T0=500.0, p0=200000.0, gamma=GAMMA_C, cp=CP_C, V=0.0)
    assert s.T == pytest.approx(s.T0)
    assert s.p == pytest.approx(s.p0)
    assert s.M == pytest.approx(0.0)


def test_station_round_trips_through_from_static():
    """Building a Station from (T0,p0,V) and then rebuilding one from its
    OWN resulting static state via Station.from_static must reproduce the
    same T0, p0 — this is the round-trip the §2.1 recipe promises
    ("valid pointwise... nothing new to derive")."""
    s1 = Station("s1", T0=550.0, p0=300000.0, gamma=GAMMA_C, cp=CP_C, V=180.0)
    s2 = Station.from_static("s2", T=s1.T, p=s1.p, V=s1.V, gamma=GAMMA_C, cp=CP_C)
    assert s2.T0 == pytest.approx(s1.T0, rel=1e-9)
    assert s2.p0 == pytest.approx(s1.p0, rel=1e-9)
    assert s2.M == pytest.approx(s1.M, rel=1e-9)


def test_station_rejects_non_physical_velocity():
    # V so large that T0 - V^2/(2cp) <= 0
    with pytest.raises(ValueError):
        Station("bad", T0=300.0, p0=100000.0, gamma=GAMMA_C, cp=CP_C, V=5000.0)


def test_station_entropy_zero_at_reference_state():
    s = Station("ref", T0=288.0, p0=101325.0, gamma=GAMMA_C, cp=CP_C, V=0.0)
    assert s.entropy_rel(T_ref=s.T, p_ref=s.p) == pytest.approx(0.0, abs=1e-9)
