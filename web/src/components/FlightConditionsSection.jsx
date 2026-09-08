import NumberField from "./NumberField.jsx";

/**
 * Flight condition inputs — Ref §1 (Atmosphere & Flight State).
 *
 * Altitude is constrained to the ISA troposphere (0-11000 m): the ported
 * `isaTroposphere` deliberately throws outside that band rather than
 * silently extrapolating (see atmosphere.js docstring) — the stratosphere
 * needs reference constants this project's source doesn't supply.
 */
export default function FlightConditionsSection({ config, onChange }) {
  return (
    <fieldset className="config-section">
      <legend>Flight condition</legend>
      <NumberField
        label="Altitude"
        value={config.altitude_m}
        onChange={(v) => onChange({ altitude_m: v })}
        min={0}
        max={11000}
        step={100}
        hint="m, ISA troposphere (0-11,000 m)"
      />
      <NumberField
        label="Flight Mach number"
        value={config.mach_flight}
        onChange={(v) => onChange({ mach_flight: v })}
        min={0}
        max={5.0}
        step={0.05}
        hint="M∞ (0-5)"
      />
    </fieldset>
  );
}
