import { useMemo, useState } from "react";
import { solveEngine } from "../physics/engine.js";
import NumberField from "./NumberField.jsx";
import SelectField from "./SelectField.jsx";
import SweepChart from "./SweepChart.jsx";
import ExpandableSection from "./ExpandableSection.jsx";
import { downloadCsv } from "../utils/csv.js";
import { tsfcPerHour } from "../utils/format.js";
import { SWEEP_PARAMS, linspace } from "../utils/sweepParams.js";

const POINT_COUNTS = [7, 11, 15, 21];

/**
 * Phase 2 — parameter sweep: vary one input across a range, re-solving the
 * whole cycle at each point (every other setting stays as currently
 * configured on the left), and chart how thrust, TSFC, and overall
 * efficiency respond. Small multiples, one single-hue chart per output —
 * never a shared/dual axis for measures in different units.
 */
export default function ParameterSweep({ config }) {
  const [paramKey, setParamKey] = useState("pi_c");
  const activeParam = SWEEP_PARAMS.find((p) => p.key === paramKey);
  const [rangeMin, setRangeMin] = useState(activeParam.defaultMin);
  const [rangeMax, setRangeMax] = useState(activeParam.defaultMax);
  const [points, setPoints] = useState(11);

  const handleParamChange = (key) => {
    const p = SWEEP_PARAMS.find((sp) => sp.key === key);
    setParamKey(key);
    setRangeMin(p.defaultMin);
    setRangeMax(p.defaultMax);
  };

  const { xValues, thrust, tsfc, etaOverall, failedCount } = useMemo(() => {
    const lo = Math.min(rangeMin, rangeMax);
    const hi = Math.max(rangeMin, rangeMax);
    const xs = linspace(lo, hi, points);
    const t = [];
    const f = [];
    const e = [];
    let failed = 0;
    for (const x of xs) {
      try {
        const r = solveEngine({ ...config, [paramKey]: x });
        t.push(r.performance.thrust);
        f.push(tsfcPerHour(r.performance.tsfc));
        e.push(r.performance.eta_overall === null ? null : r.performance.eta_overall * 100);
      } catch {
        t.push(null);
        f.push(null);
        e.push(null);
        failed += 1;
      }
    }
    return { xValues: xs, thrust: t, tsfc: f, etaOverall: e, failedCount: failed };
  }, [config, paramKey, rangeMin, rangeMax, points]);

  const exportSweep = () => {
    const rows = xValues.map((x, i) => ({
      [`${activeParam.label} (${activeParam.unit})`]: x,
      "Thrust (N)": thrust[i],
      "TSFC (kg/(N·h))": tsfc[i],
      "Overall efficiency (%)": etaOverall[i],
    }));
    downloadCsv(`thrustforge-sweep-${paramKey}.csv`, rows);
  };

  return (
    <ExpandableSection
      title="Parameter sweep"
      summary="Automatically re-solves the engine many times over a range of one input, so you don't have to manually retype it and re-check the results each time — e.g. sweep pressure ratio 4 → 20 to see thrust, TSFC, and efficiency plotted across that whole range at once. Expand to try one."
    >
      <p className="section-note">
        What this does: pick one input below (e.g. &ldquo;Compressor
        pressure ratio π_c&rdquo;), set a from/to range, and this re-solves
        the whole engine cycle at each point in that range — every other
        setting stays exactly as currently configured on the left — then
        plots how thrust, TSFC, and overall efficiency respond across it.
        It&rsquo;s the fast way to answer &ldquo;what happens to
        performance if I dial this one number up or down?&rdquo; without
        changing it by hand and re-reading the results panel over and over.
      </p>
      <div className="sweep-controls">
        <SelectField
          label="Parameter to sweep"
          value={paramKey}
          onChange={handleParamChange}
          options={SWEEP_PARAMS.map((p) => ({ value: p.key, label: p.label }))}
        />
        <NumberField
          label="From"
          value={rangeMin}
          onChange={setRangeMin}
          min={activeParam.min}
          max={activeParam.max}
          step={activeParam.rangeStep}
          hint={activeParam.unit}
        />
        <NumberField
          label="To"
          value={rangeMax}
          onChange={setRangeMax}
          min={activeParam.min}
          max={activeParam.max}
          step={activeParam.rangeStep}
          hint={activeParam.unit}
        />
        <SelectField
          label="Points"
          value={String(points)}
          onChange={(v) => setPoints(Number(v))}
          options={POINT_COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
        />
        <button type="button" className="reset-button sweep-export-button" onClick={exportSweep}>
          Export CSV
        </button>
      </div>
      {failedCount > 0 && (
        <p className="section-note">
          {failedCount} of {points} points in this range aren&rsquo;t a
          physically valid engine and appear as gaps in the charts below.
        </p>
      )}
      <div className="sweep-charts">
        <SweepChart
          title="Thrust"
          xValues={xValues}
          yValues={thrust}
          unit="N"
          color="#2a78d6"
          decimals={0}
          xUnit={activeParam.unit}
          xDecimals={activeParam.axisDecimals}
        />
        <SweepChart
          title="TSFC"
          xValues={xValues}
          yValues={tsfc}
          unit="kg/(N·h)"
          color="#eb6834"
          decimals={3}
          xUnit={activeParam.unit}
          xDecimals={activeParam.axisDecimals}
        />
        <SweepChart
          title="Overall efficiency"
          xValues={xValues}
          yValues={etaOverall}
          unit="%"
          color="#1baf7a"
          decimals={1}
          xUnit={activeParam.unit}
          xDecimals={activeParam.axisDecimals}
        />
      </div>
    </ExpandableSection>
  );
}
