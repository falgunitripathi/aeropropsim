import { useMemo, useState } from "react";
import { solveEngine } from "../physics/engine.js";
import SelectField from "./SelectField.jsx";
import ExpandableSection from "./ExpandableSection.jsx";
import TornadoChart from "./TornadoChart.jsx";

const STEP_OPTIONS = [0.05, 0.10];

/**
 * Local (one-at-a-time) sensitivity analysis: nudge each of seven design
 * inputs up and down by a small step and see how much thrust moves,
 * ranked by impact. This is deliberately different from the grid-search
 * `SensitivityOptimizer` above — that one searches broad ranges for the
 * best operating point; this one answers "starting from exactly the
 * configuration I have now, which input matters most?"
 *
 * Compressor π_c, TIT, and the three component efficiencies are nudged by
 * a percentage of their own current value — the standard tornado-chart
 * convention. Altitude and flight Mach are nudged by a percentage of
 * their full physical range instead, since both commonly sit at 0 (sea
 * level, static) where a percentage of the value itself would be a
 * no-op.
 */
const TORNADO_PARAMS = [
  { key: "pi_c", label: "Compressor PR (π_c)", kind: "pct", digits: 2, unit: "" },
  { key: "T04", label: "Turbine inlet temp (TIT)", kind: "pct", digits: 0, unit: " K" },
  { key: "eta_c_stage", label: "Compressor efficiency (η_c)", kind: "pct", digits: 3, unit: "", clampEta: true },
  { key: "eta_tt_stage", label: "Turbine efficiency (η_tt)", kind: "pct", digits: 3, unit: "", clampEta: true },
  { key: "eta_N", label: "Nozzle efficiency (η_N)", kind: "pct", digits: 3, unit: "", clampEta: true },
  { key: "mach_flight", label: "Flight Mach number", kind: "range", rangeMin: 0, rangeMax: 3, digits: 2, unit: "" },
  { key: "altitude_m", label: "Altitude", kind: "range", rangeMin: 0, rangeMax: 11000, digits: 0, unit: " m" },
];

function perturbedValues(param, config, step) {
  const v = config[param.key];
  if (param.kind === "pct") {
    let low = v * (1 - step);
    let high = v * (1 + step);
    if (param.clampEta) {
      low = Math.max(low, 0.05);
      high = Math.min(high, 0.999);
    }
    return { low, high };
  }
  const delta = step * (param.rangeMax - param.rangeMin);
  return {
    low: Math.max(param.rangeMin, v - delta),
    high: Math.min(param.rangeMax, v + delta),
  };
}

function evaluateThrust(config, overrides) {
  try {
    return solveEngine({ ...config, ...overrides }).performance.thrust;
  } catch {
    return null;
  }
}

export default function TornadoSensitivity({ config, result }) {
  const [step, setStep] = useState(0.10);
  const baseThrust = result.performance.thrust;

  const rows = useMemo(() => {
    return TORNADO_PARAMS.map((param) => {
      const { low, high } = perturbedValues(param, config, step);
      const lowThrust = evaluateThrust(config, { [param.key]: low });
      const highThrust = evaluateThrust(config, { [param.key]: high });
      const lowPct = lowThrust !== null && baseThrust !== 0 ? ((lowThrust - baseThrust) / baseThrust) * 100 : null;
      const highPct = highThrust !== null && baseThrust !== 0 ? ((highThrust - baseThrust) / baseThrust) * 100 : null;
      const impact = Math.max(Math.abs(lowPct ?? 0), Math.abs(highPct ?? 0));
      return { ...param, low, high, lowThrust, highThrust, lowPct, highPct, impact };
    }).sort((a, b) => b.impact - a.impact);
  }, [config, step, baseThrust]);

  const topLabel = rows[0]?.label;

  return (
    <ExpandableSection
      title="Local sensitivity (tornado diagram)"
      summary={`One-at-a-time ±${fmtStep(step)}% nudges around the current design point, ranked by impact on thrust${topLabel ? ` — most sensitive: ${topLabel}` : ""}. Expand to view.`}
    >
      <p className="section-note">
        Starting from exactly the configuration on the left, each input is
        nudged up and down while everything else stays fixed, and the
        resulting % change in thrust is measured. Ranked by impact
        magnitude — the parameter worth tightening up first is at the top.
      </p>
      <div className="sweep-controls">
        <SelectField
          label="Nudge size"
          value={String(step)}
          onChange={(v) => setStep(Number(v))}
          options={STEP_OPTIONS.map((s) => ({ value: String(s), label: `±${fmtStep(s)}%` }))}
        />
      </div>
      <TornadoChart rows={rows} stepPct={step * 100} />
      <p className="section-note">
        π_c, TIT, and the three component efficiencies are nudged by a
        percentage of their own current value. Altitude and flight Mach are
        nudged by a percentage of their full physical range instead (0–11,000 m,
        0–3 M), since both commonly start at 0 where a percentage of the value
        itself would be a no-op.
      </p>
    </ExpandableSection>
  );
}

function fmtStep(step) {
  return (step * 100).toFixed(0);
}
