import NumberField from "./NumberField.jsx";

/** Combustor configuration — Ref §5 (Combustor). */
export default function CombustorSection({ config, onChange }) {
  return (
    <fieldset className="config-section">
      <legend>Combustor</legend>
      <NumberField
        label="Turbine inlet temperature (TIT)"
        value={config.T04}
        onChange={(v) => onChange({ T04: v })}
        min={800}
        max={2200}
        step={10}
        hint="K — the fixed design target, T04"
      />
    </fieldset>
  );
}
