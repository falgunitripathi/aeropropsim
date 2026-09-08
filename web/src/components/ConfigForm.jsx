import NumberField from "./NumberField.jsx";
import FlightConditionsSection from "./FlightConditionsSection.jsx";
import CompressorSection from "./CompressorSection.jsx";
import CombustorSection from "./CombustorSection.jsx";
import TurbineSection from "./TurbineSection.jsx";
import NozzleSection from "./NozzleSection.jsx";
import AdvancedSection from "./AdvancedSection.jsx";

/**
 * The full engine-configuration form: flight condition, compressor,
 * combustor, turbine, nozzle, mass flow, and an advanced/collapsed
 * section for design-value defaults and gas properties.
 *
 * `config` is an EngineConfig-shaped plain object (see
 * physics/engine.js `defaultEngineConfig`); `onChange` receives a partial
 * patch to merge in, mirroring the parent's state-update pattern.
 */
export default function ConfigForm({ config, onChange, onReset }) {
  return (
    <div className="config-form">
      <div className="config-form-header">
        <h2>Engine configuration</h2>
        <button type="button" className="reset-button" onClick={onReset}>
          Reset to defaults
        </button>
      </div>
      <FlightConditionsSection config={config} onChange={onChange} />
      <CompressorSection config={config} onChange={onChange} />
      <CombustorSection config={config} onChange={onChange} />
      <TurbineSection config={config} onChange={onChange} />
      <NozzleSection config={config} onChange={onChange} />
      <fieldset className="config-section">
        <legend>Mass flow</legend>
        <NumberField
          label="Air mass flow rate"
          value={config.mdot_a}
          onChange={(v) => onChange({ mdot_a: v })}
          min={0.01}
          max={2000}
          step={1}
          hint="kg/s — scales absolute thrust; specific thrust/TSFC/efficiencies are independent of it"
        />
      </fieldset>
      <AdvancedSection config={config} onChange={onChange} />
    </div>
  );
}
