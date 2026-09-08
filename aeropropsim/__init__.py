"""
AeroPropSim — engineering core (Phase 1)
==========================================

A single-spool, single-design-point turbojet performance solver, built
directly from the compiled engineering reference
(`AeroPropSim Formula Reference`, published as a claude.ai artifact and
also delivered as a PDF), which is itself extracted section-by-section
from "Introduction to Airbreathing Propulsion" (Prof. Ashoke De, IIT
Kanpur, NPTEL).

Every formula used here carries a `Ref:` comment pointing at the section
of that reference document (e.g. "Ref: §4.2") so any formula can be
checked against its source at any time. Nothing here has been simplified
or "improved" relative to the reference without an explicit note — see
each module's docstring for the handful of places where an engineering
judgment call was required (unsourced defaults, an ambiguous subscript,
a formula that could not be independently derived from the extracted
transcript) — these are flagged, never silently resolved.

Module map
----------
constants     — gas properties (cold/hot section) and §10 design-value defaults
atmosphere    — §1  ISA troposphere + freestream stagnation state
gasstate      — §2  isentropic relations, station-state recipe (§2.1), Station dataclass
intake        — §3  intake pressure recovery
compressor    — §4  axial (+ stage-stacking) and centrifugal compressor
combustor     — §5  fuel-air ratio energy balance
turbine       — §6  axial (+ stage-stacking) and radial turbine
matching      — §7  compressor-turbine shaft power balance
nozzle        — §8  choking check, exit velocity, C-D nozzle geometry
performance   — §9  thrust, TSFC, efficiencies, Breguet range/endurance
engine        — §11 orchestrator: wires all of the above in the recommended solve order

Validation status
------------------
This package's *internal* consistency is exercised by the test suite in
`tests/` (energy-balance closure, stage-stacking pressure-ratio-product
closure, station-state round-tripping, choking-boundary continuity).
It has NOT yet been checked against an independent, externally published
worked example (e.g. Saravanamuttoo/Rogers/Cohen "Gas Turbine Theory" or
Mattingly "Elements of Gas Turbine Propulsion") — see README.md,
"Validation status", before trusting absolute output numbers.
"""

from . import constants, atmosphere, gasstate, intake, compressor, combustor
from . import turbine, matching, nozzle, performance, engine

__all__ = [
    "constants", "atmosphere", "gasstate", "intake", "compressor",
    "combustor", "turbine", "matching", "nozzle", "performance", "engine",
]
