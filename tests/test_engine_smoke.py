"""
Full single-design-point engine solve: physical-sanity and cross-module
consistency checks. Still NOT an external validation (see README) — this
confirms the assembled solver behaves the way basic thermodynamics
demands, across the whole §11 solve order at once, for a range of
configurations a user is likely to try in the eventual UI.
"""

import pytest
from aeropropsim.engine import EngineConfig, solve_engine


def _default_config(**overrides):
    cfg = EngineConfig(
        altitude_m=0.0, mach_flight=0.0,
        compressor_type="axial", n_compressor_stages=8, pi_c=12.0,
        T04=1400.0,
        turbine_type="axial", n_turbine_stages=2,
        nozzle_type="convergent",
        mdot_a=50.0,
    )
    for k, v in overrides.items():
        setattr(cfg, k, v)
    return cfg


@pytest.mark.parametrize("n_comp,pi_c,n_turb,T04,mach,alt", [
    (8, 12.0, 2, 1400.0, 0.0, 0.0),
    (12, 20.0, 3, 1500.0, 0.8, 9000.0),
    (1, 4.0, 1, 1300.0, 0.0, 0.0),
    (5, 8.0, 1, 1250.0, 0.6, 3000.0),
])
def test_engine_solves_without_error_and_is_physically_sane(n_comp, pi_c, n_turb, T04, mach, alt):
    cfg = _default_config(n_compressor_stages=n_comp, pi_c=pi_c,
                           n_turbine_stages=n_turb, T04=T04,
                           mach_flight=mach, altitude_m=alt)
    result = solve_engine(cfg)

    # Compressor raises both temperature and pressure.
    assert result.compressor["T01_out"] > result.intake["T02"]
    assert result.compressor["pi_actual"] == pytest.approx(pi_c, rel=1e-9)

    # Combustor: T04 is hit exactly (it's the design input), fuel-air ratio
    # is small and positive.
    assert 0.0 < result.combustor["f"] < 0.05

    # Turbine drops both temperature and pressure below combustor-exit values.
    T05 = result.shaft["T05"]
    assert T05 < T04
    assert result.shaft["p05_over_p04"] < 1.0

    # Turbine stage-stack must reproduce the shaft-balance-mandated overall
    # expansion ratio exactly (same guarantee as test_turbine_stacking.py,
    # now exercised through the full orchestrator).
    assert result.turbine["pr_actual"] == pytest.approx(result.shaft["p05_over_p04"], rel=1e-9)

    # Nozzle exit velocity must exceed flight velocity for the engine to
    # produce net positive (forward) thrust.
    assert result.nozzle["V_exit"] > result.atmosphere["V_flight"]
    assert result.performance["thrust"] > 0

    # TSFC must be positive and in a broad physically-plausible ballpark
    # for a turbojet (order 1e-5 to 1e-4 kg/(N*s), i.e. roughly
    # 0.5-4 lb/(lbf*hr) once unit-converted) — a broad sanity band, not a
    # validated absolute number (see README).
    assert 0.0 < result.performance["tsfc"] < 2e-4

    # Station-9 adiabatic-nozzle self-check: stagnation temperature is
    # conserved through the (adiabatic) nozzle, so T0 at station 9 must
    # equal T05; stagnation PRESSURE must come out strictly lower than p05
    # (the nozzle's real total-pressure loss, now visible precisely
    # because station 9 was built from its lossy static state — see
    # Station.from_static's docstring).
    st9 = result.stations["9"]
    assert st9.T0 == pytest.approx(T05, rel=1e-6)
    assert st9.p0 < result.shaft["p05"]


def test_centrifugal_compressor_path_runs():
    cfg = _default_config(compressor_type="centrifugal", n_compressor_stages=1,
                           centrifugal_U2=450.0)
    result = solve_engine(cfg)
    assert result.compressor["pi_actual"] > 1.0
    assert result.performance["thrust"] > 0


def test_radial_turbine_single_stage_runs():
    cfg = _default_config(turbine_type="radial", n_turbine_stages=1)
    result = solve_engine(cfg)
    assert result.turbine["type"] == "radial"
    assert result.performance["thrust"] > 0


def test_radial_turbine_rejects_multi_stage():
    cfg = _default_config(turbine_type="radial", n_turbine_stages=2)
    with pytest.raises(ValueError):
        solve_engine(cfg)


def test_higher_tit_gives_more_specific_thrust_all_else_equal():
    """Basic monotonicity sanity check: raising TIT (more energy added per
    unit mass flow) should increase specific thrust, holding everything
    else fixed — a coarse but meaningful physical-direction check."""
    low = solve_engine(_default_config(T04=1200.0))
    high = solve_engine(_default_config(T04=1500.0))
    assert high.performance["specific_thrust"] > low.performance["specific_thrust"]


def test_pressure_ratio_sweep_stays_physically_bounded():
    """A directional claim ("higher PR always means higher efficiency")
    was tried here first and FAILED — at fixed TIT (a real design
    constraint, §0: TIT is bounded by blade material limits, not a free
    parameter), thermal efficiency does not have to rise monotonically
    with pressure ratio the way the unconstrained ideal-Brayton formula
    (eta_th = 1 - 1/PR^((g-1)/g)) suggests; real gas-turbine theory gives
    an efficiency-optimal PR for a given TIT, and this engine's own
    §4.2-sourced fact that overall isentropic efficiency DEGRADES as PR
    rises (see compressor.overall_isentropic_efficiency) adds a second
    reason efficiency can fall at high PR. Rather than assert a specific
    shape this project cannot yet confirm against an external source, this
    test only locks in the bound every eta_thermal value must satisfy
    regardless of shape: strictly between 0 and 1."""
    for pi_c, n in [(4.0, 2), (8.0, 5), (12.0, 8), (20.0, 12), (30.0, 15)]:
        result = solve_engine(_default_config(pi_c=pi_c, n_compressor_stages=n))
        assert 0.0 < result.performance["eta_thermal"] < 1.0


def test_overall_efficiency_identity_holds_to_O_f_for_a_fully_expanded_nozzle():
    """eta_0 = eta_th * eta_p (component form, §9) and the direct
    definition eta_0 = Thrust*V_flight/(mdot_f*Q_R) (also §9) are
    algebraically identical ONLY in the f -> 0 limit — not exactly, for
    any f > 0. Worked by hand while writing this test:

        eta_th*eta_p  = V*[(1+f)Ve^2 - V^2] / (f*Q_R*(Ve+V))
        T*V/(mdotf*QR) = V*[(1+f)Ve - V]   / (f*Q_R)

    These match only if (1+f)Ve^2 - V^2 factors as [(1+f)Ve-V]*(Ve+V),
    which requires (1+f)Ve^2 - V^2 = (1+f)Ve^2 + Ve*V - Ve*V - V^2 —
    i.e. an extra f*Ve*V term is dropped, which is exactly the same
    f-is-small approximation the source itself invokes elsewhere (§5
    callout: "confirms why f << 1 is used to simplify the general thrust
    equation"). So the two forms should agree to O(f), not to machine
    precision — that's what this test actually checks (loose tolerance,
    with the residual explicitly attributed rather than papered over by a
    tight tolerance that would make the test meaningless, or a false
    'exact' claim that would be wrong).
    """
    from aeropropsim.performance import overall_efficiency_direct

    cfg = _default_config(altitude_m=0.0, mach_flight=0.5, pi_c=2.5,
                           n_compressor_stages=1, n_turbine_stages=1,
                           T04=1100.0, mdot_a=50.0)
    result = solve_engine(cfg)
    assert result.nozzle["choked"] is False  # confirms the regime assumption holds

    f = result.performance["f"]
    eta_0_components = result.performance["eta_overall"]
    mdot_f = cfg.mdot_a * f
    eta_0_direct = overall_efficiency_direct(
        result.performance["thrust"], result.atmosphere["V_flight"],
        mdot_f, cfg.Q_R,
    )
    # Discrepancy should scale with f (here f~0.021, observed discrepancy
    # ~0.008 i.e. within a few x f) — generous enough to not be a tight
    # coincidence, tight enough that an unrelated bug (wrong sign, wrong
    # variable) would still fail it.
    assert eta_0_direct == pytest.approx(eta_0_components, rel=max(0.05, 5 * f))
