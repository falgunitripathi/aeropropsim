import pytest
from aeropropsim.atmosphere import isa_troposphere, freestream_stagnation


def test_sea_level_matches_standard_day():
    T_a, p_a = isa_troposphere(0.0)
    assert T_a == pytest.approx(288.0)
    assert p_a == pytest.approx(1.01325e5, rel=1e-6)


def test_temperature_decreases_with_altitude():
    T0, _ = isa_troposphere(0.0)
    T5000, _ = isa_troposphere(5000.0)
    assert T5000 < T0
    assert T5000 == pytest.approx(288.0 - 0.0065 * 5000.0)


def test_out_of_range_altitude_raises():
    with pytest.raises(ValueError):
        isa_troposphere(-100.0)
    with pytest.raises(ValueError):
        isa_troposphere(20000.0)


def test_freestream_stagnation_at_M0_equals_static():
    T_a, p_a = isa_troposphere(0.0)
    T0a, p0a = freestream_stagnation(T_a, p_a, 0.0)
    assert T0a == pytest.approx(T_a)
    assert p0a == pytest.approx(p_a)


def test_freestream_stagnation_increases_with_mach():
    T_a, p_a = isa_troposphere(0.0)
    T0a, p0a = freestream_stagnation(T_a, p_a, 0.8)
    assert T0a > T_a
    assert p0a > p_a
