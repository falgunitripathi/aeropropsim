#!/usr/bin/env node
/**
 * Python <-> JS parity harness.
 *
 * Runs a battery of EngineConfig-equivalent scenarios through both the
 * Python reference implementation (aeropropsim.engine.solve_engine, via
 * scripts/dump_engine_result.py) and the JS port
 * (web/src/physics/engine.js solveEngine, via
 * web/scripts/dump_engine_result.mjs), then recursively diffs the two
 * flattened JSON results with a tight numeric tolerance.
 *
 * This is the guard against the JS and Python physics implementations
 * silently drifting apart, which is the accepted tradeoff of porting the
 * engine to JS for a static, server-free site (see project README).
 *
 * Usage (from web/):  node scripts/parity_check.mjs
 * Exit code 0 = all scenarios match; 1 = at least one mismatch.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PY_SCRIPT = path.join(REPO_ROOT, "scripts", "dump_engine_result.py");
const JS_SCRIPT = path.join(__dirname, "dump_engine_result.mjs");

// Relative tolerance for numeric comparisons. Floating-point arithmetic
// order can differ subtly between Python and JS (both are IEEE-754
// doubles, but not necessarily evaluated in bit-identical operation
// order), so exact equality is not the bar — matching to ~1e-9 relative
// is.
const REL_TOL = 1e-9;
const ABS_TOL = 1e-9;

const SCENARIOS = [
  {
    name: "default config (sea level, static)",
    overrides: {},
  },
  {
    name: "cruise, 10-stage axial compressor, 2-stage axial turbine",
    overrides: {
      altitude_m: 10000, mach_flight: 0.8,
      compressor_type: "axial", n_compressor_stages: 10, pi_c: 8.0,
      T04: 1400.0,
      turbine_type: "axial", n_turbine_stages: 2,
      mdot_a: 50.0,
    },
  },
  {
    name: "single-stage axial compressor, low pi_c, static ground run",
    overrides: {
      altitude_m: 0, mach_flight: 0.0,
      compressor_type: "axial", n_compressor_stages: 1, pi_c: 4.0,
      T04: 1100.0,
      turbine_type: "axial", n_turbine_stages: 1,
      mdot_a: 14.67,
    },
  },
  {
    name: "centrifugal compressor, radial turbine",
    overrides: {
      altitude_m: 3000, mach_flight: 0.3,
      compressor_type: "centrifugal", n_compressor_stages: 1, centrifugal_U2: 450.0,
      T04: 1200.0,
      turbine_type: "radial", n_turbine_stages: 1,
      mdot_a: 20.0,
    },
  },
  {
    name: "high altitude, high Mach, 3-stage centrifugal",
    overrides: {
      altitude_m: 9000, mach_flight: 0.85,
      compressor_type: "centrifugal", n_compressor_stages: 3, centrifugal_U2: 380.0,
      T04: 1500.0,
      turbine_type: "axial", n_turbine_stages: 3,
      mdot_a: 35.0,
      eta_d: 0.85, eta_c_stage: 0.88, eta_b: 0.98, eta_m: 0.97,
      eta_tt_stage: 0.91, eta_N: 0.96,
    },
  },
];

function runPython(overrides) {
  const out = execFileSync(
    "python3", [PY_SCRIPT, JSON.stringify(overrides)],
    { cwd: REPO_ROOT, encoding: "utf-8" }
  );
  return JSON.parse(out);
}

function runJs(overrides) {
  const out = execFileSync(
    "node", [JS_SCRIPT, JSON.stringify(overrides)],
    { cwd: __dirname, encoding: "utf-8" }
  );
  return JSON.parse(out);
}

/** Recursively diff two JSON-like values; returns a list of mismatch descriptions. */
function diff(pathStr, a, b) {
  const mismatches = [];
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return mismatches;
    const absDiff = Math.abs(a - b);
    const relDiff = absDiff / Math.max(Math.abs(a), Math.abs(b), 1e-30);
    if (absDiff > ABS_TOL && relDiff > REL_TOL) {
      mismatches.push(`${pathStr}: python=${a} js=${b} (abs=${absDiff.toExponential(3)}, rel=${relDiff.toExponential(3)})`);
    }
    return mismatches;
  }
  if (a === null || b === null || typeof a === "boolean" || typeof b === "boolean" || typeof a === "string") {
    if (a !== b) {
      mismatches.push(`${pathStr}: python=${JSON.stringify(a)} js=${JSON.stringify(b)}`);
    }
    return mismatches;
  }
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    const allKeys = new Set([...keysA, ...keysB]);
    for (const key of allKeys) {
      if (!(key in a)) {
        mismatches.push(`${pathStr}.${key}: missing in python result`);
        continue;
      }
      if (!(key in b)) {
        mismatches.push(`${pathStr}.${key}: missing in js result`);
        continue;
      }
      mismatches.push(...diff(`${pathStr}.${key}`, a[key], b[key]));
    }
    return mismatches;
  }
  if (a !== b) {
    mismatches.push(`${pathStr}: python=${JSON.stringify(a)} js=${JSON.stringify(b)}`);
  }
  return mismatches;
}

function main() {
  let anyFailed = false;
  for (const scenario of SCENARIOS) {
    process.stdout.write(`Scenario: ${scenario.name} ... `);
    let pyResult, jsResult;
    try {
      pyResult = runPython(scenario.overrides);
    } catch (err) {
      console.log("FAIL (python error)");
      console.error(err.stderr ? err.stderr.toString() : err);
      anyFailed = true;
      continue;
    }
    try {
      jsResult = runJs(scenario.overrides);
    } catch (err) {
      console.log("FAIL (js error)");
      console.error(err.stderr ? err.stderr.toString() : err);
      anyFailed = true;
      continue;
    }
    const mismatches = diff("result", pyResult, jsResult);
    if (mismatches.length === 0) {
      console.log("OK");
    } else {
      console.log(`FAIL (${mismatches.length} mismatch(es))`);
      for (const m of mismatches) {
        console.error(`  ${m}`);
      }
      anyFailed = true;
    }
  }

  if (anyFailed) {
    console.error("\nParity check FAILED — Python and JS engines disagree on at least one scenario.");
    process.exit(1);
  } else {
    console.log(`\nParity check PASSED — ${SCENARIOS.length} scenario(s), Python and JS agree to rel tol ${REL_TOL}.`);
  }
}

main();
