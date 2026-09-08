import SelectField from "./SelectField.jsx";

/**
 * Nozzle configuration — Ref §8 (Nozzle).
 *
 * Honesty note: v1's solver always works out the nozzle thermodynamics
 * (choking check, exit velocity, exit pressure) from first principles —
 * that part never depends on this toggle. The convergent-divergent
 * option here is a label for a future geometry extension only: this
 * project's `nozzle.js` has the conical-section sizing formulas
 * (`conicalNozzleLength`/`conicalNozzleAreaRatio`) but they are not yet
 * wired into `solveEngine`, matching the Python reference. Switching
 * this toggle will not change any solved number below — it's left in
 * the UI so that's visible rather than hidden.
 */
export default function NozzleSection({ config, onChange }) {
  return (
    <fieldset className="config-section">
      <legend>Nozzle</legend>
      <SelectField
        label="Geometry"
        value={config.nozzle_type}
        onChange={(v) => onChange({ nozzle_type: v })}
        options={[
          { value: "convergent", label: "Convergent" },
          { value: "conv-di", label: "Convergent-divergent (geometry TBD)" },
        ]}
        hint="Choking/exit-velocity physics is solved either way — see note in source"
      />
    </fieldset>
  );
}
