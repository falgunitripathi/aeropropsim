"""
EXTERNAL validation against a published, independently-worked turbojet
cycle: Ganesan, "Gas Turbines" 3/e (Tata McGraw Hill), Worked Example 7.5
(pp.258-261) — a full single-spool turbojet design point with every input
given and a published numeric answer, exactly the kind of check the
project's README previously flagged as missing.

This is different in kind from every other test in this suite: those
check internal consistency (the code agrees with itself); this checks
the code against a real textbook's own worked numbers, using this
project's actual formula modules, not hand-reproduced arithmetic.

Given (Ganesan's own problem statement):
    Altitude 6.1 km:      p_a = 0.458 bar,  T_a = 248 K
    Flight speed:         805 km/h = 223.61 m/s
    Compressor PR:        4:1
    Combustor dp loss:    0.21 bar
    Turbine inlet temp:   1100 K   (Ganesan's "T03" = this project's T04)
    Intake (ram) eff.:    0.95     (Ganesan's convention — see intake.py)
    Compressor eta:       0.85
    Turbine eta:          0.90
    Mechanical/transm.:   0.99
    Nozzle eta:           0.95
    Nozzle exit area:     0.0935 m^2
    Fuel LCV:             43 MJ/kg
    Cold section:         Cpa=1005 J/(kg.K), gamma_a=1.4
    Hot section:          Cpg=1147 J/(kg.K), gamma_g=1.33   (note: 1.33, not
                           this project's default 1.333 — use the book's
                           own rounded value throughout this test so the
                           comparison isn't contaminated by a property
                           mismatch)

Ganesan's own published answers (p.261):
    Nozzle chokes; T5=Tc=818.35 K; c_j=556.56 m/s; mdot_a=14.67 kg/s
    (back-solved from the GIVEN nozzle area, not an input in this problem);
    mdot_f = 0.263 kg/s; Total thrust F = 6745.17 N;
    sfc = 0.140 kg/(N.h)

Known, DOCUMENTED modelling differences from this project's primary
(IIT Kanpur / AeroPropSim reference) formulas — not bugs, see intake.py
and combustor.py-adjacent notes below:
  1. Intake: Ganesan's ram-efficiency convention, not this project's
     primary eta_d convention — see intake.py's module docstring.
  2. Shaft balance: Ganesan's worked example implicitly uses lambda=1
     (all turbine power drives the compressor) and neglects the fuel-air
     ratio f in the turbine mass flow (mdot_t ~ mdot_a) — both are
     special cases of this project's more general matching.turbine_temp_ratio
     (lam=1.0, f=0.0 reproduces his simplified form exactly).
  3. Combustor: Ganesan's worked example uses the simplified linear fuel-
     flow estimate mdot_f = mdot_a*Cpg*(T_TIT-T_compexit)/QR (valid for
     f<<1, eta_b=1), rather than this project's more complete energy-
     balance combustor.fuel_air_ratio. Both are checked below; the gap
     between them (~11% relative, worked out while writing this test) is
     asserted to stay in that ballpark rather than exactly zero — it's the
     real, quantifiable cost of the linear approximation, not noise.
  4. Choked nozzle exit temperature: this test deliberately calls
     `choked_exit_temperature_ganesan_convention`, NOT this project's
     default `choked_exit_temperature` — the two give different numbers
     for eta_N<1, and `nozzle.py`'s docstring explains why the default was
     kept independent of eta_N (adiabatic T0-conservation at M=1) rather
     than matched to this one book's specific convention. Using his
     formula here is what lets the rest of this test reproduce his
     published thrust number; it is not a claim that his formula is this
     project's preferred physics.
"""

import pytest

from aeropropsim.intake import intake_exit_pressure_ram_efficiency
from aeropropsim.compressor import stack_axial_compressor
from aeropropsim.matching import turbine_temp_ratio, turbine_pressure_ratio
from aeropropsim.combustor import fuel_air_ratio
from aeropropsim.nozzle import (
    critical_pressure, is_choked, choked_exit_temperature_ganesan_convention,
    choked_exit_velocity, thrust,
)

# --- Given (Ganesan Example 7.5) ---
P_A = 0.458e5       # Pa
T_A = 248.0          # K
V_FLIGHT = 805.0 * 1000.0 / 3600.0  # m/s = 223.61
PI_C = 4.0
DP_CC = 0.21e5       # Pa
TIT = 1100.0         # K  (Ganesan's T03 = this project's T04)
ETA_RAM = 0.95
ETA_C = 0.85
ETA_T = 0.90
ETA_M = 0.99
ETA_N = 0.95
A_EXIT = 0.0935      # m^2
QR = 43.0e6          # J/kg
CP_A, GAMMA_A = 1005.0, 1.4
CP_G, GAMMA_G = 1147.0, 1.33
R_G = CP_G * (GAMMA_G - 1.0) / GAMMA_G  # 284.6 J/(kg.K), matches book


@pytest.fixture(scope="module")
def solved():
    """Run the whole Example 7.5 cycle through this project's actual
    component functions (not hand arithmetic) and return every
    intermediate for the assertions below."""
    intake = intake_exit_pressure_ram_efficiency(T_A, P_A, V_FLIGHT, ETA_RAM,
                                                  GAMMA_A, CP_A)
    T02, p02_book_p01 = intake["T02"], intake["p02"]  # book's T01, p01

    p02 = p02_book_p01 * PI_C  # book's p02 = r * p01

    comp = stack_axial_compressor(pi_c_target=PI_C, n_stages=1, T01_in=T02,
                                   eta_poly=ETA_C, eta_st=ETA_C, gamma_c=GAMMA_A)
    T03 = comp["T01_out"]  # book's T02 (compressor exit)

    p03 = p02 - DP_CC  # book's p03 (combustor exit, before nozzle)

    T05_over_T04 = turbine_temp_ratio(T02=T02, T03=T03, T04=TIT, lam=1.0,
                                       eta_m=ETA_M, f=0.0, cp_c=CP_A, cp_h=CP_G)
    T04 = T05_over_T04 * TIT  # book's T04 (turbine exit)

    p04_over_p03 = turbine_pressure_ratio(T05_over_T04, ETA_T, GAMMA_G)
    p04 = p03 * p04_over_p03  # book's p04 (nozzle inlet)

    p_c = critical_pressure(p04, ETA_N, GAMMA_G)
    choked = is_choked(p_c, P_A)
    # Ganesan's own convention (see module docstring, point 4) — needed
    # here specifically to reproduce his published numbers.
    T_exit = choked_exit_temperature_ganesan_convention(T04, ETA_N, GAMMA_G)
    V_exit = choked_exit_velocity(T_exit, GAMMA_G, R_G)
    rho_exit = p_c / (R_G * T_exit)
    mdot_a = rho_exit * A_EXIT * V_exit  # back-solved from the GIVEN area

    F = thrust(mdot_a, 0.0, V_exit, V_FLIGHT, p_c, P_A, A_EXIT)

    # Book's own simplified linear fuel-flow estimate (module docstring,
    # point 3) — mdot_f in kg/s, matching his published 0.263 kg/s.
    mdot_f_book_estimate = mdot_a * CP_G * (TIT - T03) / QR
    f_book_estimate = mdot_f_book_estimate / mdot_a  # dimensionless f
    f_rigorous = fuel_air_ratio(T03=T03, T04=TIT, eta_b=1.0, Q_R=QR,
                                 cp_c=CP_A, cp_h=CP_G)

    return dict(T02=T02, p01=p02_book_p01, p02=p02, T03=T03, p03=p03,
                T04=T04, p04=p04, p_c=p_c, choked=choked, T_exit=T_exit,
                V_exit=V_exit, rho_exit=rho_exit, mdot_a=mdot_a, F=F,
                mdot_f_book_estimate=mdot_f_book_estimate,
                f_book_estimate=f_book_estimate, f_rigorous=f_rigorous)


def test_intake_matches_book(solved):
    assert solved["T02"] == pytest.approx(272.87, abs=0.05)   # book's T01
    assert solved["p01"] / 1e5 == pytest.approx(0.631, abs=0.001)


def test_compressor_matches_book(solved):
    # abs=0.3 K, not 0.05: the book itself rounds T01=272.87 (we carry full
    # precision), so a ~0.2 K rounding-propagation gap here is the book's
    # own arithmetic, not this project's.
    assert solved["T03"] == pytest.approx(429.08, abs=0.3)   # book's T02
    assert solved["p02"] / 1e5 == pytest.approx(2.524, abs=0.01)


def test_shaft_balance_and_turbine_exit_match_book(solved):
    T04_book = 961.75
    assert solved["T04"] == pytest.approx(T04_book, abs=0.5)


def test_combustor_exit_pressure_matches_book(solved):
    assert solved["p03"] / 1e5 == pytest.approx(2.31, abs=0.01)


def test_turbine_pressure_ratio_matches_book(solved):
    # Book: p04 = 1.26 bar
    assert solved["p04"] / 1e5 == pytest.approx(1.26, abs=0.01)


def test_nozzle_chokes_as_book_found(solved):
    assert solved["choked"] is True


def test_choked_exit_temperature_matches_book(solved):
    # Book: Tc = 818.35 K, reproduced here via
    # choked_exit_temperature_ganesan_convention (see module docstring,
    # point 4 — this project's default formula gives a different,
    # independently-justified number, ~825 K, for the same inputs).
    assert solved["T_exit"] == pytest.approx(818.35, abs=0.3)


def test_choked_exit_velocity_matches_book(solved):
    # Book: cj = 556.56 m/s
    assert solved["V_exit"] == pytest.approx(556.56, abs=0.5)


def test_mass_flow_back_solved_from_area_matches_book(solved):
    # Book: mdot = 14.67 kg/s (from the GIVEN nozzle exit area)
    assert solved["mdot_a"] == pytest.approx(14.67, rel=0.005)


def test_total_thrust_matches_book_published_answer(solved):
    # Book's headline published answer: F = 6745.17 N
    assert solved["F"] == pytest.approx(6745.17, rel=0.01)


def test_rigorous_combustor_formula_is_close_to_books_simplified_estimate(solved):
    """Ganesan's own worked mdot_f (=0.263 kg/s, giving an f-equivalent of
    0.263/14.67=0.01793) uses the simplified linear fuel-flow estimate
    (see module docstring, point 3). This project's more complete
    combustor.fuel_air_ratio lands about 11% higher (0.0199 vs 0.0179,
    worked out while writing this test) — checked here to stay in that
    observed ballpark rather than asserted equal: that 11% is the real,
    quantified cost of the linear approximation for this operating point,
    not test slop to paper over.
    """
    f_book_equivalent = 0.263 / 14.67  # from the book's own published numbers
    assert solved["f_rigorous"] == pytest.approx(f_book_equivalent, rel=0.15)
    assert solved["f_book_estimate"] == pytest.approx(f_book_equivalent, rel=0.02)


def test_sfc_matches_book(solved):
    # Book: sfc = 0.140 kg/(N.h). mdot_f here uses the book's own
    # simplified estimate (see test above) since sfc is reported against
    # THAT mdot_f in the book, not the rigorous combustor formula.
    sfc = solved["mdot_f_book_estimate"] * 3600.0 / solved["F"]
    assert sfc == pytest.approx(0.140, rel=0.02)
