import { fmt } from "../utils/format.js";

/**
 * Small ISA-atmosphere readout: static temperature, static pressure, air
 * density, and the local speed of sound at the current altitude — plus
 * flight speed for context. No new physics: `result.atmosphere` already
 * carries T_a/p_a/V_flight from `solveEngine` (Ref §1, ISA troposphere
 * relation); density and speed of sound are the standard closed-form
 * derivations from T_a/p_a using the cold-section gas constants already in
 * `config`.
 */
export default function AtmosphereReadout({ config, result }) {
  const { T_a, p_a, V_flight } = result.atmosphere;
  const R_c = (config.cp_c * (config.gamma_c - 1.0)) / config.gamma_c;
  const rho_a = p_a / (R_c * T_a);
  const speedOfSound = Math.sqrt(config.gamma_c * R_c * T_a);
  const mach = speedOfSound > 0 ? V_flight / speedOfSound : 0;

  return (
    <div className="performance-summary atmosphere-readout">
      <div className="perf-card">
        <span className="perf-label">Static temperature T_a</span>
        <span className="perf-value">{fmt(T_a, 1)} <small>K</small></span>
      </div>
      <div className="perf-card">
        <span className="perf-label">Static pressure p_a</span>
        <span className="perf-value">{fmt(p_a / 1000, 2)} <small>kPa</small></span>
      </div>
      <div className="perf-card">
        <span className="perf-label">Air density ρ_a</span>
        <span className="perf-value">{fmt(rho_a, 3)} <small>kg/m³</small></span>
      </div>
      <div className="perf-card">
        <span className="perf-label">Speed of sound a</span>
        <span className="perf-value">{fmt(speedOfSound, 1)} <small>m/s</small></span>
      </div>
      <div className="perf-card">
        <span className="perf-label">Flight speed V</span>
        <span className="perf-value">{fmt(V_flight, 1)} <small>m/s</small></span>
      </div>
      <div className="perf-card">
        <span className="perf-label">Flight Mach (check)</span>
        <span className="perf-value">{fmt(mach, 3)}</span>
      </div>
    </div>
  );
}
