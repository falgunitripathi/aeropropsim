/**
 * Intake — adiabatic, non-isentropic deceleration from freestream to the
 * compressor face.
 *
 * Ref: §3 (Intake).
 * Faithful JS port of aeropropsim/intake.py.
 *
 * Two different conventions for "intake/diffuser efficiency"
 * ------------------------------------------------------------
 * Cross-checking this project's reference against an independent external
 * source (Ganesan, "Gas Turbines" 3/e — see Worked Example 7.5, pp.258-261)
 * surfaced that intake pressure recovery is modelled two genuinely
 * different ways across the gas-turbine literature, both legitimate, NOT
 * one right and one wrong:
 *
 *   (A) `intakeExitState` (this project's primary reference, §3): scales
 *       the Mach-number term INSIDE the isentropic exponent —
 *         p02 = pa*(1 + eta_d*(gamma-1)/2*M^2)^(gamma/(gamma-1))
 *
 *   (B) `intakeExitPressureRamEfficiency` (Ganesan's convention, his
 *       Eq. 7.18/7.24): defines eta_ram as a linear interpolation of the
 *       ACTUAL pressure rise between ambient and the fully-isentropic ram
 *       rise —
 *         p01 = pa + eta_ram*(p01_isentropic - pa)
 *
 *   These do NOT reduce to each other algebraically for eta < 1 (verified
 *   numerically). Reproducing Ganesan's own Example 7.5 numbers requires
 *   his own formula (B). `solveEngine` still defaults to (A) (this
 *   project's primary source); (B) is provided so Ganesan's own worked
 *   examples can be reproduced exactly for validation, and as an
 *   alternative a future UI could expose.
 */

import { GAMMA_C, CP_C } from "./constants.js";
import { freestreamStagnation } from "./atmosphere.js";

/**
 * Compressor-face (station 2) stagnation state.
 *
 * Ref: §3, p.288, 382. Temperature is unaffected by intake losses
 * (adiabatic: T02 = T0a); pressure recovery is captured entirely through
 * eta_d.
 *
 * Typical value: eta_d ~ 0.70-0.90 (§10). Assumption: freestream-to-lip
 * flow isentropic; all real loss lumped between the lip and the
 * compressor face.
 *
 * @returns {{T02:number,p02:number,T0a:number,p0a:number,r_d:number}}
 */
export function intakeExitState(T_a, p_a, M, eta_d, gamma_c = GAMMA_C) {
  const [T0a, p0a] = freestreamStagnation(T_a, p_a, M, gamma_c);
  const factor = 1.0 + eta_d * (gamma_c - 1.0) / 2.0 * M ** 2;
  const p02 = p_a * factor ** (gamma_c / (gamma_c - 1.0));
  const T02 = T0a;
  const r_d = p02 / p0a;
  return { T02, p02, T0a, p0a, r_d };
}

/**
 * Compressor-face stagnation pressure via Ganesan's ram-efficiency
 * convention (his Eq. 7.18/7.24) — see this module's docstring for how it
 * differs from `intakeExitState`.
 *
 * Ref: Ganesan, "Gas Turbines" 3/e, Eq. 7.18: eta_ram = (p01-pa)/(p01'-pa),
 * rearranged (Eq. 7.24) to:
 *     p01' = pa*(1 + V^2/(2*Cp*Ta))^(gamma/(gamma-1))   [isentropic ram]
 *     p01  = pa + eta_ram*(p01' - pa)                    [actual]
 *
 * @param {number} T_a
 * @param {number} p_a
 * @param {number} V_flight - flight (forward) speed, m/s (Ganesan's c_i).
 * @param {number} eta_ram - ram/diffuser efficiency (his convention, NOT
 *   eta_d from `intakeExitState` — the two are not interchangeable numbers).
 * @param {number} gamma_c
 * @param {number|null} cp_c - defaults to CP_C if not given.
 * @returns {{T02:number,p02:number,p0_isentropic:number}}
 */
export function intakeExitPressureRamEfficiency(T_a, p_a, V_flight, eta_ram,
                                                 gamma_c = GAMMA_C, cp_c = null) {
  const cpc = cp_c === null || cp_c === undefined ? CP_C : cp_c;
  const T02 = T_a + V_flight ** 2 / (2.0 * cpc);
  const p0_isentropic = p_a * (T02 / T_a) ** (gamma_c / (gamma_c - 1.0));
  const p02 = p_a + eta_ram * (p0_isentropic - p_a);
  return { T02, p02, p0_isentropic };
}
