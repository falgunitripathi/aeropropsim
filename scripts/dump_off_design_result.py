#!/usr/bin/env python3
"""
Parity-harness helper: lock a design point and solve one off-design
scenario with the Python reference implementation, printing a flat JSON
result to stdout.

Usage: python3 scripts/dump_off_design_result.py '<json-encoded args>'

`args` is a single object: {"config_overrides": {...}, "altitude_m": ...,
"mach_flight": ..., "T04_target": ..., "Nr_guess": ...} (Nr_guess optional).

Companion to web/scripts/dump_off_design_result.mjs, which does the same
thing for the JS port. web/scripts/parity_check.mjs runs both for a battery
of scenarios and diffs the results numerically.
"""
import json
import sys

from aeropropsim.engine import EngineConfig
from aeropropsim.off_design import lock_design_point, solve_off_design, OffDesignError


def flatten(result):
    stations_flat = {k: v.as_dict() for k, v in result.stations.items()}
    return {
        "Nr": result.Nr,
        "mr": result.mr,
        "T04": result.T04,
        "f": result.f,
        "mdot_a": result.mdot_a,
        "thrust": result.thrust,
        "tsfc": result.tsfc,
        "specific_thrust": result.specific_thrust,
        "nozzle_choked": result.nozzle_choked,
        "stations": stations_flat,
    }


def main():
    args = json.loads(sys.argv[1] if len(sys.argv) > 1 else "{}")
    cfg = EngineConfig(**args.get("config_overrides", {}))
    kwargs = {}
    if "Nr_guess" in args:
        kwargs["Nr_guess"] = args["Nr_guess"]
    try:
        dp = lock_design_point(cfg)
        result = solve_off_design(
            dp, args["altitude_m"], args["mach_flight"], args["T04_target"], **kwargs
        )
    except OffDesignError as e:
        sys.stdout.write(json.dumps({"error": "OffDesignError", "message": str(e)}))
        return
    sys.stdout.write(json.dumps(flatten(result)))


if __name__ == "__main__":
    main()
