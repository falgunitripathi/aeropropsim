import math
import pytest
from aeropropsim.performance import breguet_range, breguet_endurance


def test_breguet_range_endurance_velocity_identity():
    """For constant-cruise-velocity flight, range and endurance must
    satisfy R = V*E exactly (same fuel burn, same L/D, same duration —
    just distance vs. time). This is the cross-check that caught
    breguet_endurance's earlier missing `/g` factor: without it, E came
    out ~g times too large and this identity failed by that same factor.
    """
    Q_R = 43e6
    eta_0 = 0.25
    g = 9.80665
    L_over_D = 15.0
    m1, m2 = 20000.0, 16000.0
    tsfc_val = 5e-5  # kg/(N*s)
    V = Q_R * eta_0 * tsfc_val  # the cruise velocity implied by eta_0 = T*V/(mdot_f*Q_R)

    R = breguet_range(Q_R, eta_0, g, L_over_D, m1, m2)
    E = breguet_endurance(tsfc_val, g, L_over_D, m1, m2)

    assert R == pytest.approx(V * E, rel=1e-9)


def test_breguet_endurance_matches_hand_derivation():
    tsfc_val = 6e-5
    g = 9.80665
    L_over_D = 12.0
    m1, m2 = 15000.0, 11000.0
    expected = (L_over_D / (tsfc_val * g)) * math.log(m1 / m2)
    assert breguet_endurance(tsfc_val, g, L_over_D, m1, m2) == pytest.approx(expected, rel=1e-12)
