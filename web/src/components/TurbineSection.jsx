import { useState } from "react";
import NumberField from "./NumberField.jsx";
import SelectField from "./SelectField.jsx";

/**
 * Turbine configuration — Ref §6 (Turbine).
 *
 * The turbine's thermodynamic station values (T05, p05) always come from
 * the §7 shaft power balance, not from a chosen turbine architecture —
 * axial vs. radial only changes how many stages are used to reach that
 * expansion (see engine.js module docstring). Radial turbines are
 * single-stage only, per the source's own design guidance (§6.2).
 *
 * Collapsed by default — click the legend to open it.
 */
export default function TurbineSection({ config, onChange }) {
  const [open, setOpen] = useState(false);
  const isAxial = config.turbine_type === "axial";
  return (
    <fieldset className="config-section">
      <legend>
        <button type="button" className="disclosure" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "▾" : "▸"} Turbine
        </button>
      </legend>
      {open && (
        <>
          <SelectField
            label="Type"
            value={config.turbine_type}
            onChange={(v) => onChange({
              turbine_type: v,
              ...(v === "radial" ? { n_turbine_stages: 1 } : {}),
            })}
            options={[
              { value: "axial", label: "Axial (stage-stacked)" },
              { value: "radial", label: "Radial-inflow" },
            ]}
          />
          <NumberField
            label="Number of stages"
            value={config.n_turbine_stages}
            onChange={(v) => onChange({ n_turbine_stages: Math.max(1, Math.round(v)) })}
            min={1}
            max={10}
            step={1}
            disabled={!isAxial}
            hint={!isAxial ? "radial turbines are single-stage only (§6.2)" : undefined}
          />
        </>
      )}
    </fieldset>
  );
}
