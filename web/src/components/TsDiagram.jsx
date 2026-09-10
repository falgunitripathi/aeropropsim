import { fmt } from "../utils/format.js";

const STATION_ORDER = ["a", "2", "3", "4", "5", "9"];

const WIDTH = 560;
const HEIGHT = 360;
const MARGIN = { top: 20, right: 30, bottom: 44, left: 56 };

/**
 * A simplified T-s (temperature-entropy) process diagram connecting the
 * key stations a → 2 → 3 → 4 → 5 → 9, using each station's own
 * `entropyRel` (Ref §2.1 step 7) relative to the freestream station 'a'.
 *
 * Approximation, stated plainly rather than glossed over: entropy here
 * is computed independently in each station's own gas model (cold-
 * section Cp/R for a,2,3; hot-section Cp/R for 4,5,9), each relative to
 * station a's (T,p). A single continuous entropy datum across a
 * composition change (combustion) isn't something this project's source
 * material derives, so the jump in the diagram from 3->4 mixes two
 * different entropy scales at their shared reference point — the
 * qualitative shape (rising T with modest s increase through the
 * compressor, a big T and s jump across the combustor, falling T with a
 * further s increase across the lossy turbine and nozzle) is meaningful;
 * the exact s values straddling the combustor are illustrative, not a
 * rigorous mixed-gas property calculation.
 */
export default function TsDiagram({ stations }) {
  const points = STATION_ORDER
    .filter((key) => stations[key])
    .map((key) => {
      const st = stations[key];
      const ref = stations.a;
      const s = st.entropyRel(ref.T, ref.p);
      return { key, s, T: st.T };
    });

  if (points.length === 0) return null;

  const sValues = points.map((p) => p.s);
  const tValues = points.map((p) => p.T);
  const sMin = Math.min(...sValues, 0);
  const sMax = Math.max(...sValues, 1);
  const tMin = Math.min(...tValues);
  const tMax = Math.max(...tValues);
  const sPad = (sMax - sMin) * 0.1 || 1;
  const tPad = (tMax - tMin) * 0.1 || 1;

  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const xScale = (s) => MARGIN.left + ((s - (sMin - sPad)) / ((sMax + sPad) - (sMin - sPad))) * plotW;
  const yScale = (T) => MARGIN.top + plotH - ((T - (tMin - tPad)) / ((tMax + tPad) - (tMin - tPad))) * plotH;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.s).toFixed(1)} ${yScale(p.T).toFixed(1)}`)
    .join(" ");

  const dataSummary = points
    .map((p) => `station ${p.key}: ${fmt(p.T, 0)} K, Δs ${fmt(p.s, 1)} J/(kg·K)`)
    .join("; ");

  return (
    <div className="ts-diagram">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Temperature-entropy process diagram across stations a through 9. ${dataSummary}.`}
      >
        {/* axes */}
        <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + plotH} className="ts-axis" />
        <line x1={MARGIN.left} y1={MARGIN.top + plotH} x2={MARGIN.left + plotW} y2={MARGIN.top + plotH} className="ts-axis" />
        <text x={MARGIN.left + plotW / 2} y={HEIGHT - 8} textAnchor="middle" className="ts-axis-label">
          Δs relative to station a (J/kg·K)
        </text>
        <text
          x={16}
          y={MARGIN.top + plotH / 2}
          textAnchor="middle"
          className="ts-axis-label"
          transform={`rotate(-90 16 ${MARGIN.top + plotH / 2})`}
        >
          T (K)
        </text>

        {/* process line */}
        <path d={pathD} className="ts-path" fill="none" />

        {/* points + labels */}
        {points.map((p) => (
          <g key={p.key}>
            <circle cx={xScale(p.s)} cy={yScale(p.T)} r={4} className="ts-point" />
            <text x={xScale(p.s) + 8} y={yScale(p.T) - 8} className="ts-point-label">
              {p.key} ({fmt(p.T, 0)} K)
            </text>
          </g>
        ))}
      </svg>

      <table className="sr-only">
        <caption>Temperature-entropy data (same values as the diagram above)</caption>
        <thead>
          <tr>
            <th scope="col">Station</th>
            <th scope="col">T (K)</th>
            <th scope="col">Δs relative to station a (J/kg·K)</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.key}>
              <th scope="row">{p.key}</th>
              <td>{fmt(p.T, 0)}</td>
              <td>{fmt(p.s, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
