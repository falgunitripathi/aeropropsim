/**
 * ISA atmosphere and freestream stagnation state.
 *
 * Ref: §1 (Atmosphere & Flight State).
 * Faithful JS port of aeropropsim/atmosphere.py.
 */

import { GAMMA_C } from "./constants.js";

/**
 * Standard-day ISA troposphere (0-11 km), quadratic curve-fit form.
 *
 * Ref: §1, p.114-118, 137.
 *
 * @param {number} z - geopotential altitude, m (0 <= z <= 11000).
 * @returns {[number, number]} [T_a, p_a]: ambient static temperature [K],
 *   ambient static pressure [Pa].
 * @throws if z is outside [0, 11000] m. The source gives an exact
 *   hydrostatic form for the stratosphere (above 11 km), but does not
 *   supply the specific reference constants (p, T at the 11 km boundary)
 *   needed to anchor it numerically within the extracted transcript —
 *   rather than substitute an unsourced "standard atmosphere" constant
 *   silently, this is left as an explicit Phase 2 extension. v1's flight
 *   envelope (subsonic cruise and below) sits well inside the troposphere
 *   anyway.
 */
export function isaTroposphere(z) {
  if (!(z >= 0.0 && z <= 11000.0)) {
    throw new Error(
      `isaTroposphere: z=${z} m is outside the source's valid 0-11000 m ` +
      `troposphere range. Stratosphere support (z > 11000 m) is a Phase 2 ` +
      `extension — see module docstring.`
    );
  }
  const T_a = 288.0 - 0.0065 * z;
  const p_a = (1.01325 - 1.12e-4 * z + 3.8e-9 * z ** 2) * 1.0e5; // bar -> Pa
  return [T_a, p_a];
}

/**
 * Freestream-to-intake stagnation state at flight Mach M.
 *
 * Ref: §1, p.288. Assumption: isentropic freestream deceleration ahead of
 * the intake lip.
 *
 * @param {number} T_a - ambient static temperature, K.
 * @param {number} p_a - ambient static pressure, Pa.
 * @param {number} M - flight Mach number.
 * @param {number} gamma_c - cold-section ratio of specific heats.
 * @returns {[number, number]} [T0a, p0a]: freestream stagnation
 *   temperature [K], pressure [Pa].
 */
export function freestreamStagnation(T_a, p_a, M, gamma_c = GAMMA_C) {
  const factor_T = 1.0 + (gamma_c - 1.0) / 2.0 * M ** 2;
  const T0a = T_a * factor_T;
  const p0a = p_a * factor_T ** (gamma_c / (gamma_c - 1.0));
  return [T0a, p0a];
}
