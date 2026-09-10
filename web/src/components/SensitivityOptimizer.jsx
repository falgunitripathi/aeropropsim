import { useMemo, useState } from "react";
import { solveEngine } from "../physics/engine.js";
import NumberField from "./NumberField.jsx";
import SelectField from "./SelectField.jsx";
import SweepChart from "./SweepChart.jsx";
import Heatmap from "./Heatmap.jsx";
import ExpandableSection from "./ExpandableSection.jsx";
import { downloadCsv } from "../utils/csv.js";
import { fmt, tsfcPerHour } from "../utils/format.js";
import { SWEEP_PARAMS, linspace } from "../utils/sweepParams.js";

const OBJECTIVES = [
  { key: "thrust", label: "Maximize thrust", direction: "max", color: "#2a78d6", unit: "N", decimals: 0 },
  { key: "tsfc", label: "Minimize TSFC", direction: "min", color: "#eb6834", unit: "kg/(N·h)", decimals: 3 },
  { key: "eta_overall", label: "Maximize overall efficiency", direction: "max", color: "#1baf7a", unit: "%", decimals: 1 },
];

const POINTS_OPTIONS = [7, 9, 11, 15];

/** Solve one point; returns a flat {thrust, tsfcHr, etaPct} or null if infeasible. */
function evaluatePoint(config, overrides) {
  try {
    const r = solveEngine({ ...config, ...overrides });
    return {
      thrust: r.performance.thrust,
      tsfc: tsfcPerHour(r.performance.tsfc),
      eta_overall: r.performance.eta_overall === null ? null : r.performance.eta_overall * 100,
    };
  } catch {
    return null;
  }
}

function metricOf(point, key) {
  if (!point) return null;
  const v = point[key];
  return v === null || v === undefined || !Number.isFinite(v) ? null : v;
}

function betterThan(a, b, direction) {
  if (a === null) return false;
  if (b === null) return true;
  return direction === "max" ? a > b : a < b;
}

/**
 * Phase 3 — sensitivity / optimization: grid-search one or two inputs to
 * find the configuration that maximizes thrust, minimizes TSFC, or
 * maximizes overall efficiency. One parameter reuses the sweep chart with
 * the best point marked on it; two parameters render a small single-hue
 * heatmap instead of a second, dual-axis chart.
 */
export default function SensitivityOptimizer({ config }) {
  const [objectiveKey, setObjectiveKey] = useState("thrust");
  const objective = OBJECTIVES.find((o) => o.key === objectiveKey);

  const [paramAKey, setParamAKey] = useState("pi_c");
  const paramA = SWEEP_PARAMS.find((p) => p.key === paramAKey);
  const [rangeAMin, setRangeAMin] = useState(paramA.defaultMin);
  const [rangeAMax, setRangeAMax] = useState(paramA.defaultMax);

  const [paramBKey, setParamBKey] = useState("none");
  const paramBOptions = SWEEP_PARAMS.filter((p) => p.key !== paramAKey);
  const paramB = paramBKey === "none" ? null : SWEEP_PARAMS.find((p) => p.key === paramBKey);
  const [rangeBMin, setRangeBMin] = useState(paramBOptions[0].defaultMin);
  const [rangeBMax, setRangeBMax] = useState(paramBOptions[0].defaultMax);

  const [points, setPoints] = useState(11);

  const handleParamAChange = (key) => {
    const p = SWEEP_PARAMS.find((sp) => sp.key === key);
    setParamAKey(key);
    setRangeAMin(p.defaultMin);
    setRangeAMax(p.defaultMax);
    if (paramBKey === key) setParamBKey("none");
  };
  const handleParamBChange = (key) => {
    setParamBKey(key);
    if (key !== "none") {
      const p = SWEEP_PARAMS.find((sp) => sp.key === key);
      setRangeBMin(p.defaultMin);
      setRangeBMax(p.defaultMax);
    }
  };

  const search = useMemo(() => {
    const aLo = Math.min(rangeAMin, rangeAMax);
    const aHi = Math.max(rangeAMin, rangeAMax);
    const aValues = linspace(aLo, aHi, points);

    if (!paramB) {
      const results = aValues.map((a) => evaluatePoint(config, { [paramAKey]: a }));
      let bestIdx = -1;
      let bestVal = null;
      results.forEach((pt, i) => {
        const v = metricOf(pt, objectiveKey);
        if (betterThan(v, bestVal, objective.direction)) {
          bestVal = v;
          bestIdx = i;
        }
      });
      const failedCount = results.filter((r) => r === null).length;
      return {
        mode: "1d", aValues, results, bestIdx,
        best: bestIdx >= 0 ? { a: aValues[bestIdx], point: results[bestIdx] } : null,
        failedCount, total: aValues.length,
      };
    }

    const bLo = Math.min(rangeBMin, rangeBMax);
    const bHi = Math.max(rangeBMin, rangeBMax);
    const bValues = linspace(bLo, bHi, points);
    const grid = []; // grid[rowB][colA]
    let best = null;
    let failedCount = 0;
    bValues.forEach((b, ri) => {
      const row = [];
      aValues.forEach((a, ci) => {
        const pt = evaluatePoint(config, { [paramAKey]: a, [paramBKey]: b });
        if (!pt) failedCount += 1;
        const v = metricOf(pt, objectiveKey);
        row.push(v);
        if (!best || betterThan(v, best.value, objective.direction)) {
          best = { row: ri, col: ci, value: v, a, b, point: pt };
        }
      });
      grid.push(row);
    });
    return { mode: "2d", aValues, bValues, grid, best, failedCount, total: aValues.length * bValues.length };
  }, [config, objectiveKey, paramAKey, paramBKey, rangeAMin, rangeAMax, rangeBMin, rangeBMax, points, objective.direction]);

  const exportSearch = () => {
    if (search.mode === "1d") {
      const rows = search.aValues.map((a, i) => ({
        [`${paramA.label} (${paramA.unit})`]: a,
        "Thrust (N)": search.results[i]?.thrust ?? null,
        "TSFC (kg/(N·h))": search.results[i]?.tsfc ?? null,
        "Overall efficiency (%)": search.results[i]?.eta_overall ?? null,
        "Is best": i === search.bestIdx ? "yes" : "",
      }));
      downloadCsv(`thrustforge-optimize-${paramAKey}.csv`, rows);
    } else {
      const rows = [];
      search.bValues.forEach((b, ri) => {
        search.aValues.forEach((a, ci) => {
          rows.push({
            [`${paramA.label} (${paramA.unit})`]: a,
            [`${paramB.label} (${paramB.unit})`]: b,
            [`${objective.label} value`]: search.grid[ri][ci],
            "Is best": search.best && search.best.row === ri && search.best.col === ci ? "yes" : "",
          });
        });
      });
      downloadCsv(`thrustforge-optimize-${paramAKey}-${paramBKey}.csv`, rows);
    }
  };

  const bestPoint = search.mode === "1d" ? search.best?.point : search.best?.point;

  return (
    <ExpandableSection
      title="Sensitivity & optimization"
      summary="Grid-search one or two inputs to find the design point that best serves a chosen objective (max thrust, min TSFC, max efficiency). Expand to search."
    >
      <p className="section-note">
        Search across one or two inputs — every other setting stays as
        currently configured on the left — to find the design point that
        best serves the chosen objective.
      </p>
      <div className="sweep-controls">
        <SelectField
          label="Objective"
          value={objectiveKey}
          onChange={setObjectiveKey}
          options={OBJECTIVES.map((o) => ({ value: o.key, label: o.label }))}
        />
        <SelectField
          label="Parameter A"
          value={paramAKey}
          onChange={handleParamAChange}
          options={SWEEP_PARAMS.map((p) => ({ value: p.key, label: p.label }))}
        />
        <NumberField label="A from" value={rangeAMin} onChange={setRangeAMin}
          min={paramA.min} max={paramA.max} step={paramA.rangeStep} hint={paramA.unit} />
        <NumberField label="A to" value={rangeAMax} onChange={setRangeAMax}
          min={paramA.min} max={paramA.max} step={paramA.rangeStep} hint={paramA.unit} />
        <SelectField
          label="Parameter B (optional)"
          value={paramBKey}
          onChange={handleParamBChange}
          options={[{ value: "none", label: "None — 1 parameter" }, ...paramBOptions.map((p) => ({ value: p.key, label: p.label }))]}
        />
        {paramB && (
          <>
            <NumberField label="B from" value={rangeBMin} onChange={setRangeBMin}
              min={paramB.min} max={paramB.max} step={paramB.rangeStep} hint={paramB.unit} />
            <NumberField label="B to" value={rangeBMax} onChange={setRangeBMax}
              min={paramB.min} max={paramB.max} step={paramB.rangeStep} hint={paramB.unit} />
          </>
        )}
        <SelectField
          label="Points per axis"
          value={String(points)}
          onChange={(v) => setPoints(Number(v))}
          options={POINTS_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
        />
        <button type="button" className="reset-button sweep-export-button" onClick={exportSearch}>
          Export CSV
        </button>
      </div>

      {search.failedCount > 0 && (
        <p className="section-note">
          {search.failedCount} of {search.total} grid points aren&rsquo;t a
          physically valid engine and were excluded from the search.
        </p>
      )}

      {bestPoint ? (
        <div className="optimize-best-card">
          <div className="optimize-best-title">Best point found</div>
          <p className="optimize-best-where">
            {paramA.label} = {fmt(search.mode === "1d" ? search.best.a : search.best.a, paramA.axisDecimals)} {paramA.unit}
            {paramB && (
              <>
                {" · "}{paramB.label} = {fmt(search.best.b, paramB.axisDecimals)} {paramB.unit}
              </>
            )}
          </p>
          <div className="optimize-best-stats">
            <span><strong>Thrust</strong> {fmt(bestPoint.thrust, 1)} N</span>
            <span><strong>TSFC</strong> {fmt(bestPoint.tsfc, 3)} kg/(N&middot;h)</span>
            <span><strong>Overall η</strong> {bestPoint.eta_overall !== null ? `${fmt(bestPoint.eta_overall, 1)}%` : "—"}</span>
          </div>
        </div>
      ) : (
        <p className="section-note">No physically valid engine found in this search range.</p>
      )}

      {search.mode === "1d" ? (
        <div className="optimize-chart-wrap">
          <SweepChart
            title={objective.label}
            xValues={search.aValues}
            yValues={search.results.map((r) => metricOf(r, objectiveKey))}
            unit={objective.unit}
            color={objective.color}
            decimals={objective.decimals}
            xUnit={paramA.unit}
            xDecimals={paramA.axisDecimals}
            bestIndex={search.bestIdx >= 0 ? search.bestIdx : null}
          />
        </div>
      ) : (
        <Heatmap
          xValues={search.aValues}
          yValues={search.bValues}
          grid={search.grid}
          color={objective.color}
          betterIsHigher={objective.direction === "max"}
          best={search.best ? { row: search.best.row, col: search.best.col } : null}
          decimals={objective.decimals}
          unit={objective.unit}
          xLabel={paramA.label}
          yLabel={paramB.label}
          xUnit={paramA.unit}
          yUnit={paramB.unit}
          xDecimals={paramA.axisDecimals}
          yDecimals={paramB.axisDecimals}
        />
      )}
    </ExpandableSection>
  );
}
