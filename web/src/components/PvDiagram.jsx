import { fmt } from "../utils/format.js";

const STATION_ORDER = ["a", "2", "3", "4", "5", "9"];

const WIDTH = 560;
const HEIGHT = 360;
const MARGIN = { top: 20, right: 30, bottom: 44, left: 56 };

/**
 * A simplified P-v (pressure-specific volume) process diagram connecting
 * the key stations a → 2 → 3 → 4 → 5 → 9, using each station's own static
 * pressure and specific volume (v = 1/ρ) — the same station set and the
 * same structural approach as `TsDiagram`, just plotting p vs. v instead
 * of T vs. s. Static (not stagnation) properties are used throughout,
 * since v = 1/ρ is only meaningful for the static state.
 */
export default function PvDiagram({ stations }) {
  const points = STATION_ORDER
    .filter((key) => stations[key])
    .map((key) => {
      const st = stations[key];
      return { key, v: 1 / st.rho, p: st.p / 1000 };
    });

  if (points.length === 0) return null;

  const vValues = points.map((p) => p.v);
  const pValues = points.map((p) => p.p);
  const vMin = Math.min(...vValues, 0);
  const vMax = Math.max(...vValues, 1);
  const pMin = Math.min(...pValues);
  const pMax = Math.max(...pValues);
  const vPad = (vMax - vMin) * 0.1 || 1;
  const pPad = (pMax - pMin) * 0.1 || 1;

  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const xScale = (v) => MARGIN.left + ((v - (vMin - vPad)) / ((vMax + vPad) - (vMin - vPad))) * plotW;
  const yScale = (p) => MARGIN.top + plotH - ((p - (pMin - pPad)) / ((pMax + pPad) - (pMin - pPad))) * plotH;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.v).toFixed(1)} ${yScale(p.p).toFixed(1)}`)
    .join(" ");

  return (
    <div className="ts-diagram">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Pressure-specific volume process diagram">
        {/* axes */}
        <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + plotH} className="ts-axis" />
        <line x1={MARGIN.left} y1={MARGIN.top + plotH} x2={MARGIN.left + plotW} y2={MARGIN.top + plotH} className="ts-axis" />
        <text x={MARGIN.left + plotW / 2} y={HEIGHT - 8} textAnchor="middle" className="ts-axis-label">
          Specific volume v (m³/kg)
        </text>
        <text
          x={16}
          y={MARGIN.top + plotH / 2}
          textAnchor="middle"
          className="ts-axis-label"
          transform={`rotate(-90 16 ${MARGIN.top + plotH / 2})`}
        >
          Static p (kPa)
        </text>

        {/* process line */}
        <path d={pathD} className="ts-path" fill="none" />

        {/* points + labels */}
        {points.map((p) => (
          <g key={p.key}>
            <circle cx={xScale(p.v)} cy={yScale(p.p)} r={4} className="ts-point" />
            <text x={xScale(p.v) + 8} y={yScale(p.p) - 8} className="ts-point-label">
              {p.key} ({fmt(p.p, 0)} kPa)
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
