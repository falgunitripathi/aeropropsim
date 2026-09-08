import pytest
from aeropropsim.turbine import stack_axial_turbine


@pytest.mark.parametrize("pr_target,n_stages", [
    (0.30, 1), (0.30, 2), (0.30, 4), (0.15, 3), (0.5, 1), (0.05, 6),
])
def test_pr_actual_matches_target_exactly(pr_target, n_stages):
    result = stack_axial_turbine(
        pr_overall_out_over_in=pr_target, n_stages=n_stages, T01_in=1400.0,
        eta_tt=0.90,
    )
    assert result["pr_actual"] == pytest.approx(pr_target, rel=1e-9)


def test_temperature_drops_monotonically_stage_to_stage():
    result = stack_axial_turbine(0.25, 4, 1400.0, 0.90)
    temps = [s["T01_in"] for s in result["stages"]] + [result["T01_out"]]
    for a, b in zip(temps, temps[1:]):
        assert b < a


def test_rejects_invalid_inputs():
    with pytest.raises(ValueError):
        stack_axial_turbine(0.3, 0, 1400.0, 0.9)
    with pytest.raises(ValueError):
        stack_axial_turbine(1.5, 3, 1400.0, 0.9)  # must be in (0,1)
    with pytest.raises(ValueError):
        stack_axial_turbine(-0.1, 3, 1400.0, 0.9)
