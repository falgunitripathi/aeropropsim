#!/usr/bin/env node
/**
 * Parity-harness helper: lock a design point and solve one off-design
 * scenario with the JS port, printing a flat JSON result to stdout.
 *
 * Usage: node scripts/dump_off_design_result.mjs '<json-encoded args>'
 *
 * `args` is a single object: {"config_overrides": {...}, "altitude_m": ...,
 * "mach_flight": ..., "T04_target": ..., "Nr_guess": ...} (Nr_guess optional).
 *
 * Companion to scripts/dump_off_design_result.py, which does the same thing
 * for the Python reference implementation. web/scripts/parity_check.mjs runs
 * both for a battery of scenarios and diffs the results numerically.
 */

import { makeEngineConfig } from "../src/physics/engine.js";
import { lockDesignPoint, solveOffDesign, OffDesignError } from "../src/physics/offDesign.js";

function flatten(result) {
  const stationsFlat = {};
  for (const [key, st] of Object.entries(result.stations)) {
    stationsFlat[key] = st.asDict();
  }
  return {
    Nr: result.Nr,
    mr: result.mr,
    T04: result.T04,
    f: result.f,
    mdot_a: result.mdot_a,
    thrust: result.thrust,
    tsfc: result.tsfc,
    specific_thrust: result.specific_thrust,
    nozzle_choked: result.nozzle_choked,
    stations: stationsFlat,
  };
}

const argJson = process.argv[2] || "{}";
const args = JSON.parse(argJson);
const cfg = makeEngineConfig(args.config_overrides || {});

try {
  const dp = lockDesignPoint(cfg);
  const result = solveOffDesign(
    dp, args.altitude_m, args.mach_flight, args.T04_target,
    args.Nr_guess !== undefined ? args.Nr_guess : 1.0
  );
  process.stdout.write(JSON.stringify(flatten(result)));
} catch (e) {
  if (e instanceof OffDesignError) {
    process.stdout.write(JSON.stringify({ error: "OffDesignError", message: e.message }));
  } else {
    throw e;
  }
}
