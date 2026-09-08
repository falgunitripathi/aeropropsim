/**
 * Compressible-flow fundamentals and the station-state recipe.
 *
 * Ref: §2 (Compressible-Flow Fundamentals), §2.1 (Computing a complete
 * station state).
 *
 * Faithful JS port of aeropropsim/gasstate.py. Two layers, same as the
 * Python module:
 *   1. Bare isentropic-relation functions.
 *   2. `Station`, a small class that applies the §2.1 "station-state
 *      recipe" once T0, p0 and a through-flow velocity are known.
 */

// ---------------------------------------------------------------------------
// Bare isentropic relations — Ref: §2
// ---------------------------------------------------------------------------

/** a = sqrt(gamma*R*T).  Ref: §2, p.69-72. */
export function speedOfSound(gamma, R, T) {
  return Math.sqrt(gamma * R * T);
}

/** M = V/a.  Ref: §2, p.69-72. */
export function machNumber(V, a) {
  return V / a;
}

/** T0/T = 1 + (gamma-1)/2 * M^2.  Ref: §2, p.76-83. (adiabatic only) */
export function T0overT(gamma, M) {
  return 1.0 + (gamma - 1.0) / 2.0 * M ** 2;
}

/** p0/p = (T0/T)^(gamma/(gamma-1)).  Ref: §2, p.76-83. (isentropic) */
export function p0overP(gamma, M) {
  return T0overT(gamma, M) ** (gamma / (gamma - 1.0));
}

/** rho0/rho = (T0/T)^(1/(gamma-1)).  Ref: §2, p.76-83. (isentropic) */
export function rho0overRho(gamma, M) {
  return T0overT(gamma, M) ** (1.0 / (gamma - 1.0));
}

/**
 * p_critical/p0 = (2/(gamma+1))^(gamma/(gamma-1)).  Ref: §2, p.83.
 * Evaluates to 0.5283 for gamma=1.4 (matches the source's stated check
 * value).
 */
export function criticalPressureRatio(gamma) {
  return (2.0 / (gamma + 1.0)) ** (gamma / (gamma - 1.0));
}

/**
 * A/A* isentropic area-Mach relation.  Ref: §2, p.404.
 * Valid for M > 0 (undefined/singular at M=0, where A/A* -> infinity).
 */
export function areaMachRatio(gamma, M) {
  if (M <= 0) {
    throw new Error("areaMachRatio requires M > 0");
  }
  return (1.0 / M) * (
    ((2.0 + (gamma - 1.0) * M ** 2) / (gamma + 1.0)) ** ((gamma + 1.0) / (2.0 * (gamma - 1.0)))
  );
}

/** T = T0 - V^2/(2*Cp).  Ref: §2.1 step 2. */
export function staticTemperatureFromStagnation(T0, V, cp) {
  return T0 - V ** 2 / (2.0 * cp);
}

/**
 * p = p0 / (1+((gamma-1)/2)M^2)^(gamma/(gamma-1)).  Ref: §2.1 step 4.
 *
 * Valid pointwise even downstream of a lossy component: decelerating the
 * local flow back to rest *at that single point* is itself reversible;
 * the losses already live inside the actual p0 computed upstream.
 */
export function staticPressureFromStagnation(p0, gamma, M) {
  return p0 / (1.0 + (gamma - 1.0) / 2.0 * M ** 2) ** (gamma / (gamma - 1.0));
}

/**
 * Delta_s = Cp*ln(T/T_ref) - R*ln(p/p_ref), relative to a reference
 * station (e.g. ambient).  Ref: §2.1 step 7.
 */
export function entropyRelative(cp, R, T, p, T_ref, p_ref) {
  return cp * Math.log(T / T_ref) - R * Math.log(p / p_ref);
}

// ---------------------------------------------------------------------------
// Station-state recipe — Ref: §2.1
// ---------------------------------------------------------------------------

/**
 * A single flow station, fully resolved from (T0, p0, V, gamma, cp).
 *
 * Implements the §2.1 "station-state recipe" exactly:
 *   1. Inputs: T0, p0 (from the relevant cycle/stage equation) and the
 *      local through-flow velocity V (axial Vz if held constant through
 *      a stage, the resultant velocity-triangle V, or a continuity V).
 *   2. T   = T0 - V^2/(2*Cp)
 *   3. M   = V / sqrt(gamma*R*T)
 *   4. p   = p0 / (1+((gamma-1)/2)M^2)^(gamma/(gamma-1))
 *   5. rho = p/(R*T)
 *   6. h = Cp*T, h0 = Cp*T0
 *   7. Delta_s relative to a caller-supplied reference station (optional;
 *      call `.entropyRel(T_ref, p_ref)` explicitly since it needs a
 *      reference choice the recipe itself leaves open).
 *
 * V = 0 is the valid/expected input for a purely thermodynamic (no
 * kinetic-energy) station read: it collapses M to 0 and T, p to T0, p0,
 * which is correct (static = stagnation at zero velocity).
 */
export class Station {
  /**
   * @param {string} name
   * @param {number} T0 - K
   * @param {number} p0 - Pa
   * @param {number} gamma
   * @param {number} cp - J/(kg*K)
   * @param {number|null} R - defaults to cp*(gamma-1)/gamma if not given
   * @param {number} V - m/s, local through-flow velocity at this station
   */
  constructor(name, T0, p0, gamma, cp, R = null, V = 0.0) {
    this.name = name;
    this.T0 = T0;
    this.p0 = p0;
    this.gamma = gamma;
    this.cp = cp;
    this.R = R === null || R === undefined ? cp * (gamma - 1.0) / gamma : R;
    this.V = V;

    if (this.T0 <= 0 || this.p0 <= 0) {
      throw new Error(
        `Station '${this.name}': T0 and p0 must be positive (got T0=${this.T0}, p0=${this.p0})`
      );
    }

    const T = staticTemperatureFromStagnation(this.T0, this.V, this.cp);
    if (T <= 0) {
      throw new Error(
        `Station '${this.name}': computed static T=${T.toFixed(2)} K <= 0 — ` +
        `V=${this.V} m/s is not physically achievable from T0=${this.T0} K with cp=${this.cp}.`
      );
    }
    let M;
    if (this.V > 0) {
      const a = speedOfSound(this.gamma, this.R, T);
      M = machNumber(this.V, a);
    } else {
      M = 0.0;
    }
    const p = staticPressureFromStagnation(this.p0, this.gamma, M);
    const rho = p / (this.R * T);

    this.T = T;
    this.M = M;
    this.p = p;
    this.rho = rho;
    this.h = this.cp * T;
    this.h0 = this.cp * this.T0;
  }

  /** Delta_s relative to an arbitrary reference (T_ref, p_ref). Ref: §2.1 step 7. */
  entropyRel(T_ref, p_ref) {
    return entropyRelative(this.cp, this.R, this.T, this.p, T_ref, p_ref);
  }

  /**
   * Build a Station from an already-known STATIC state (T, p, V) rather
   * than from (T0, p0, V).
   *
   * Use this — not the normal (T0, p0, V) constructor — whenever the
   * static state was computed directly by a lossy-component formula
   * (e.g. the §8 nozzle exit velocity/pressure, which already bakes in
   * eta_N). Feeding that component's upstream T0/p0 into the normal
   * constructor together with the lossy exit V would silently apply the
   * ISENTROPIC p0->p relation to an upstream p0 that does not reflect the
   * loss actually incurred — double-counting nothing, but reporting the
   * wrong static pressure. Going forward from a known static state
   * instead (M = V/sqrt(gamma*R*T), then T0 = T*(T0/T), p0 = p*(p0/p)) is
   * exactly as valid an application of the same §2.1 isentropic point
   * relations, just run in the other direction — and it makes the ACTUAL
   * total-pressure loss through the component visible by comparison
   * against the component's inlet p0 (e.g. p09 < p05 for a real nozzle,
   * even though T09 = T05 since the nozzle is adiabatic).
   */
  static fromStatic(name, T, p, V, gamma, cp, R = null) {
    const Rval = R === null || R === undefined ? cp * (gamma - 1.0) / gamma : R;
    if (T <= 0 || p <= 0) {
      throw new Error(`Station.fromStatic '${name}': T and p must be positive (got T=${T}, p=${p})`);
    }
    const M = V > 0 ? machNumber(V, speedOfSound(gamma, Rval, T)) : 0.0;
    const T0 = T * T0overT(gamma, M);
    const p0 = p * p0overP(gamma, M);
    return new Station(name, T0, p0, gamma, cp, Rval, V);
  }

  asDict() {
    return {
      name: this.name, T0: this.T0, p0: this.p0, T: this.T,
      p: this.p, M: this.M, V: this.V, rho: this.rho,
      h: this.h, h0: this.h0,
    };
  }
}
