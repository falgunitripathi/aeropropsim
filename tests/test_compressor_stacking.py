"""
The one property the §4.2 stage-stacking procedure GUARANTEES by
construction (its own step 4: "last stage closes the loop exactly") is
that the product of all per-stage pressure ratios equals the target
overall pressure ratio. This is the sharpest possible internal-consistency
check available without an external worked example — if this doesn't
hold, the stacking implementation has a bug, full stop.
"""

import pytest
from aeropropsim.compressor import stack_axial_compressor


@pytest.mark.parametrize("pi_target,n_stages", [
    (4.0, 1), (4.0, 3), (8.0, 1), (8.0, 5), (8.0, 9),
    (15.0, 10), (30.0, 14), (2.0, 2),
])
def test_pi_actual_matches_target_exactly(pi_target, n_stages):
    result = stack_axial_compressor(
        pi_c_target=pi_target, n_stages=n_stages, T01_in=288.0,
        eta_poly=0.90, eta_st=0.90,
    )
    assert result["pi_actual"] == pytest.approx(pi_target, rel=1e-9)


def test_stage_count_matches_requested():
    result = stack_axial_compressor(8.0, 5, 288.0, 0.90, 0.90)
    assert len(result["stages"]) == 5


def test_temperature_rises_monotonically_stage_to_stage():
    result = stack_axial_compressor(12.0, 6, 288.0, 0.90, 0.90)
    temps = [s["T01_in"] for s in result["stages"]] + [result["T01_out"]]
    for a, b in zip(temps, temps[1:]):
        assert b > a


def test_pressure_ratio_drifts_downward_across_stages_as_documented():
    """Source's own stated behavior (§4.2): 'pi_i drifts slightly downward
    stage-to-stage because the same dT0 is a shrinking fraction of a
    rising T01' — check this holds for the marched (non-last) stages."""
    result = stack_axial_compressor(10.0, 6, 288.0, 0.90, 0.90)
    marched = result["stages"][:-1]  # exclude the closing last stage
    ratios = [s["pi_stage"] for s in marched]
    for a, b in zip(ratios, ratios[1:]):
        assert b < a


def test_rejects_invalid_inputs():
    with pytest.raises(ValueError):
        stack_axial_compressor(8.0, 0, 288.0, 0.9, 0.9)
    with pytest.raises(ValueError):
        stack_axial_compressor(0.9, 3, 288.0, 0.9, 0.9)  # PR must be > 1
