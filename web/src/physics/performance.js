/**
 * Overall performance — specific thrust, TSFC, efficiencies, Breguet range.
 *
 * Ref: §9 (Overall Performance).
 * Faithful JS port of aeropropsim/performance.py.
 */

/**
 * T/mdot_a = [(1+f)*V_exit - V_flight] + (Ae/mdot_a)*(p_exit-p_a).
 * Ref: §9, p.296, 163.
 */
export function specificThrust(f, V_exit, V_flight, A_exit, mdot_a, p_exit, p_a) {
  return ((1.0 + f) * V_exit - V_flight) + (A_exit / mdot_a) * (p_exit - p_a);
}

/**
 * TSFC = mdot_f/T = f / (T/mdot_a).  Ref: §9, p.296, 163.
 * Units: kg fuel per (N*s), i.e. per unit thrust per unit time.
 */
export function tsfc(f, specific_thrust_val) {
  if (specific_thrust_val <= 0) {
    throw new Error("tsfc: specific_thrust_val must be > 0");
  }
  return f / specific_thrust_val;
}

/**
 * Static/take-off case (V->0, fully expanded): F_TO = mdot_a*(1+f)*V_exit.
 * Ref: §9, p.296, 163.
 */
export function staticTakeoffThrust(mdot_a, f, V_exit) {
  return mdot_a * (1.0 + f) * V_exit;
}

/**
 * eta_th = [(1+f)*V_exit^2/2 - V_flight^2/2] / (f*Q_R).
 * Ref: §9, p.141-147.
 */
export function thermalEfficiency(f, V_exit, V_flight, Q_R) {
  return ((1.0 + f) * V_exit ** 2 / 2.0 - V_flight ** 2 / 2.0) / (f * Q_R);
}

/**
 * eta_p = 2*(V/Vexit) / (1+(V/Vexit)).  Ref: §9, p.141-147.
 * eta_p -> 1 as V -> V_exit, but thrust -> 0 there too — not a usable
 * design target on its own.
 */
export function propulsiveEfficiency(V_flight, V_exit) {
  const ratio = V_flight / V_exit;
  return 2.0 * ratio / (1.0 + ratio);
}

/** eta_0 = eta_th * eta_p.  Ref: §9, p.141-147. */
export function overallEfficiencyFromComponents(eta_th, eta_p) {
  return eta_th * eta_p;
}

/**
 * eta_0 = T*V / (mdot_f*Q_R).  Ref: §9, p.141-147.
 *
 * Direct definition — useful as a cross-check against
 * overallEfficiencyFromComponents (both should agree; a persistent
 * mismatch flags an upstream bug, exactly the kind of thing the test
 * suite's internal-consistency checks are for).
 */
export function overallEfficiencyDirect(thrust_val, V_flight, mdot_f, Q_R) {
  return thrust_val * V_flight / (mdot_f * Q_R);
}

/** S = (Q_R*eta_0/g)*(L/D)*ln(m1/m2).  Ref: §9, p.157-163 (bonus). */
export function breguetRange(Q_R, eta_0, g, L_over_D, m1, m2) {
  return (Q_R * eta_0 / g) * L_over_D * Math.log(m1 / m2);
}

/** E = (1/TSFC)*(L/D)*ln(m1/m2).  Ref: §9, p.157-163 (bonus). */
export function breguetEndurance(tsfc_val, L_over_D, m1, m2) {
  return (1.0 / tsfc_val) * L_over_D * Math.log(m1 / m2);
}
