"""
Off-design / component-map matching (aeropropsim.off_design) — checks
against the design-point baseline it must reproduce exactly, physically-
expected off-design trends, and the method's own stated preconditions.
"""

import pytest

from aeropropsim.engine import EngineConfig, solve_engine
from aeropropsim.off_design import (
    lock_design_point, solve_off_design, OffDesignError,
)


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


@pytest.mark.parametrize("n_comp,pi_c,n_turb,T04,mdot_a", [
    (8, 12.0, 2, 1400.0, 50.0),
    (12, 18.0, 3, 1500.0, 80.0),
    (5, 9.0, 1, 1350.0, 20.0),
])
def test_off_design_reproduces_design_point_exactly(n_comp, pi_c, n_turb, T04, mdot_a):
    """The single most important correctness check: solving off-design
    AT the design point's own flight condition and throttle must recover
    the exact same thrust/TSFC/mass flow the design-point solver gives,
    to tight numerical tolerance. If this doesn't hold, the matching
    method has a bug — the generic map is anchored to the design point
    by construction (compressor_map.map_point(1, 1, ...)) and the shaft-
    balance/choking algebra is derived FROM the design-point solve, so
    Nr=mr=1 must be a fixed point of the whole procedure.
    """
    cfg = _default_config(n_compressor_stages=n_comp, pi_c=pi_c,
                           n_turbine_stages=n_turb, T04=T04, mdot_a=mdot_a)
    design = solve_engine(cfg)
    dp = lock_design_point(cfg)

    result = solve_off_design(dp, cfg.altitude_m, cfg.mach_flight, cfg.T04)

    assert result.Nr == pytest.approx(1.0, abs=1e-6)
    assert result.mr == pytest.approx(1.0, abs=1e-6)
    assert result.mdot_a == pytest.approx(cfg.mdot_a, rel=1e-6)
    assert result.thrust == pytest.approx(design.performance["thrust"], rel=1e-5)
    assert result.tsfc == pytest.approx(design.performance["tsfc"], rel=1e-5)
    assert result.f == pytest.approx(design.combustor["f"], rel=1e-5)
    assert result.nozzle_choked == design.nozzle["choked"]


def test_thrust_falls_with_altitude_at_fixed_throttle_and_mach():
    """The exact bug item 07 called out: Mission Analysis re-solving the
    same design cycle at each altitude made thrust rise with altitude
    (colder inlet air improves an idealized fixed-cycle solve). A real
    fixed-geometry engine's thrust falls with altitude at a constant
    throttle setting and Mach number, because true air density (and
    hence true mass flow through the fixed hardware) drops. This is the
    headline result this whole module exists to produce correctly.
    """
    cfg = _default_config()
    dp = lock_design_point(cfg)

    altitudes = [0.0, 3000.0, 6000.0, 9000.0, 11000.0]
    thrusts = [solve_off_design(dp, alt, 0.6, cfg.T04).thrust for alt in altitudes]

    for earlier, later in zip(thrusts, thrusts[1:]):
        assert later < earlier, f"thrust should fall with altitude: {thrusts}"


def test_thrust_rises_with_throttle():
    """More T04 (more fuel/heat) should mean more thrust, at fixed flight
    condition — matches the direct physics finding from engine.solve_engine
    (T04 increases thrust in every configuration tested)."""
    cfg = _default_config()
    dp = lock_design_point(cfg)

    T04_targets = [1100.0, 1200.0, 1300.0, 1400.0]
    thrusts = [solve_off_design(dp, 3000.0, 0.5, t).thrust for t in T04_targets]

    for earlier, later in zip(thrusts, thrusts[1:]):
        assert later > earlier, f"thrust should rise with T04: {thrusts}"


def test_thrust_falls_with_mach_at_fixed_altitude_and_throttle():
    """Ram-drag effect (see the physics explanation this project already
    gave for engine.solve_engine): net thrust ~ mdot*(V_exit - V_flight);
    V_flight climbs with Mach while V_exit stays comparatively flat for a
    fixed-hardware engine at constant TIT, so thrust should fall."""
    cfg = _default_config()
    dp = lock_design_point(cfg)

    machs = [0.3, 0.5, 0.7, 0.85]
    thrusts = [solve_off_design(dp, 5000.0, m, cfg.T04).thrust for m in machs]

    for earlier, later in zip(thrusts, thrusts[1:]):
        assert later < earlier, f"thrust should fall with Mach: {thrusts}"


def test_corrected_speed_rises_with_altitude_at_fixed_throttle():
    """A real engine has to spin its compressor relatively faster
    (higher corrected speed Nr) to keep hitting the same TIT as the air
    thins with altitude — this is standard off-design behavior and a
    good sanity check that Nr is doing physically meaningful work, not
    just converging to an arbitrary number."""
    cfg = _default_config()
    dp = lock_design_point(cfg)

    altitudes = [0.0, 3000.0, 6000.0, 9000.0]
    Nrs = [solve_off_design(dp, alt, 0.6, cfg.T04).Nr for alt in altitudes]

    for earlier, later in zip(Nrs, Nrs[1:]):
        assert later > earlier, f"Nr should rise with altitude: {Nrs}"


def test_rejects_centrifugal_compressor_design_point():
    cfg = _default_config(compressor_type="centrifugal", n_compressor_stages=1,
                          centrifugal_U2=420.0)
    with pytest.raises(OffDesignError, match="axial"):
        lock_design_point(cfg)


def test_rejects_conv_di_nozzle_design_point():
    cfg = _default_config(nozzle_type="conv-di", nozzle_exit_mach_design=1.4)
    with pytest.raises(OffDesignError, match="convergent"):
        lock_design_point(cfg)


def test_rejects_unchoked_design_point():
    """A low pressure ratio / low TIT design point may never choke its
    propelling nozzle — this method's whole derivation assumes it does
    (see off_design.py module docstring), so locking such a design point
    must fail clearly rather than silently produce nonsense downstream.
    """
    cfg = _default_config(pi_c=1.5, n_compressor_stages=1, T04=900.0, mdot_a=10.0)
    design = solve_engine(cfg)
    assert not design.nozzle["choked"], "test setup expects an unchoked design point"
    with pytest.raises(OffDesignError, match="not choked"):
        lock_design_point(cfg)


def test_infeasible_target_raises_off_design_error_not_silent_garbage():
    """Asking for a TIT well below this hardware's idle floor has no
    solution under the fixed-turbine-ratio assumption (see module
    docstring) — this must be reported as an explicit, catchable error,
    not a wrong number."""
    cfg = _default_config()
    dp = lock_design_point(cfg)
    with pytest.raises(OffDesignError):
        solve_off_design(dp, 0.0, 0.0, 300.0)
