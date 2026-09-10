import { useState } from "react";
import NumberField from "./NumberField.jsx";

/**
 * Design-value defaults and gas properties — Ref §10, plus the cold/hot
 * section gas properties from §0. Collapsed by default: these are the
 * project's DEFAULTS (constants.js), each independently sourced (or
 * flagged "NOT IN SOURCE" — see constants.js/constants.py comments), and
 * most users of the simulator won't need to touch them.
 */
export default function AdvancedSection({ config, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <fieldset className="config-section advanced">
      <legend>
        <button type="button" className="disclosure" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "▾" : "▸"} Advanced: design defaults &amp; gas properties
        </button>
      </legend>
      {open && (
        <div className="advanced-grid">
          <NumberField label="Intake efficiency η_d" value={config.eta_d}
            onChange={(v) => onChange({ eta_d: v })} min={0.5} max={1.0} step={0.01} />
          <NumberField label="Compressor stage efficiency η_c" value={config.eta_c_stage}
            onChange={(v) => onChange({ eta_c_stage: v })} min={0.5} max={1.0} step={0.01} />
          <NumberField label="Combustor efficiency η_b" value={config.eta_b}
            onChange={(v) => onChange({ eta_b: v })} min={0.5} max={1.0} step={0.01} />
          <NumberField label="Combustor Δp loss" value={config.delta_p_cc_pct}
            onChange={(v) => onChange({ delta_p_cc_pct: v })} min={0} max={0.2} step={0.01}
            hint="fraction, not %. NOT IN SOURCE (conventional placeholder, §10)" />
          <NumberField label="Fuel heating value Q_R" value={config.Q_R}
            onChange={(v) => onChange({ Q_R: v })} min={3.0e7} max={5.0e7} step={1.0e5}
            hint="J/kg. NOT IN SOURCE (standard published Jet-A LHV)" />
          <NumberField label="Shaft power fraction λ" value={config.lambda_shaft}
            onChange={(v) => onChange({ lambda_shaft: v })} min={0.5} max={1.0} step={0.01}
            hint="fraction of turbine power driving the compressor" />
          <NumberField label="Mechanical efficiency η_m" value={config.eta_m}
            onChange={(v) => onChange({ eta_m: v })} min={0.9} max={1.0} step={0.005} />
          <NumberField label="Turbine stage efficiency η_tt" value={config.eta_tt_stage}
            onChange={(v) => onChange({ eta_tt_stage: v })} min={0.5} max={1.0} step={0.01}
            hint="NOT IN SOURCE for axial (source only gives radial, >0.7)" />
          <NumberField label="Nozzle efficiency η_N" value={config.eta_N}
            onChange={(v) => onChange({ eta_N: v })} min={0.5} max={1.0} step={0.01} />

          <NumberField label="Cold section γ_c" value={config.gamma_c}
            onChange={(v) => onChange({ gamma_c: v })} min={1.2} max={1.5} step={0.001} />
          <NumberField label="Cold section Cp_c" value={config.cp_c}
            onChange={(v) => onChange({ cp_c: v })} min={800} max={1200} step={1}
            hint="J/(kg·K)" />
          <NumberField label="Hot section γ_h" value={config.gamma_h}
            onChange={(v) => onChange({ gamma_h: v })} min={1.2} max={1.45} step={0.001} />
          <NumberField label="Hot section Cp_h" value={config.cp_h}
            onChange={(v) => onChange({ cp_h: v })} min={900} max={1400} step={1}
            hint="J/(kg·K)" />
        </div>
      )}
    </fieldset>
  );
}
