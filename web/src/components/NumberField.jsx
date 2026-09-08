/** Reusable labeled numeric input, controlled, with an optional unit/hint. */
export default function NumberField({
  label, value, onChange, min, max, step = "any", hint, disabled = false,
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? NaN : parseFloat(raw));
        }}
      />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
